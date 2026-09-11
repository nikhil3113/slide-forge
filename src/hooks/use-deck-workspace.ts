import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateOutline, generateSlide, StreamRequestError } from "@/lib/api";
import type { StoredDeck } from "@/lib/db";
import type { ProviderSettings } from "@/lib/providers";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import type {
	Outline,
	OutlineSlide,
	Slide,
	StreamError,
	ThemeId,
} from "@/types/deck";

export type SlideStatus = "pending" | "streaming" | "done" | "error";
export type WorkspacePhase =
	| "idle"
	| "outlining"
	| "slides"
	| "ready"
	| "error";

export interface SlideState {
	index: number;
	outline: OutlineSlide;
	status: SlideStatus;
	partial: string;
	slide?: Slide;
	error?: StreamError;
}

export interface DeckStartInput {
	topic: string;
	slideCount?: number;
	theme?: ThemeId;
	audience?: string;
	tone?: string;
}

export interface WorkspaceSnapshot {
	title: string;
	subtitle: string;
	theme: ThemeId;
	outline?: Outline;
	slides: Array<{ index: number; slide: Slide }>;
}

function toStreamError(error: unknown): StreamError {
	if (error instanceof StreamRequestError) {
		return { message: error.message, code: error.code };
	}
	if (error instanceof DOMException && error.name === "AbortError") {
		return { message: "Generation stopped.", code: "aborted" };
	}
	if (error instanceof Error && error.message) {
		return { message: error.message, code: "internal" };
	}
	return { message: "Unexpected error. Please try again.", code: "internal" };
}

export function useDeckWorkspace(settings: ProviderSettings) {
	const [phase, setPhase] = useState<WorkspacePhase>("idle");
	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
	const [outline, setOutline] = useState<Outline>();
	const [slideStates, setSlideStates] = useState<SlideState[]>([]);
	const [outlineChars, setOutlineChars] = useState(0);
	const [error, setError] = useState<StreamError>();
	const [activeSlide, setActiveSlide] = useState<number>();

	const controllerRef = useRef<AbortController | null>(null);
	const settingsRef = useRef(settings);

	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);

	useEffect(() => {
		return () => controllerRef.current?.abort();
	}, []);

	const patchSlide = useCallback(
		(index: number, patch: Partial<SlideState>) => {
			setSlideStates((current) =>
				current.map((item) =>
					item.index === index ? { ...item, ...patch } : item,
				),
			);
		},
		[],
	);

	const syncOutlineFromSlide = useCallback((index: number, slide: Slide) => {
		setOutline((current) => {
			if (!current || !current.slides[index]) return current;
			return {
				...current,
				slides: current.slides.map((item, itemIndex) =>
					itemIndex === index
						? { ...item, title: slide.title, layout: slide.layout }
						: item,
				),
			};
		});
	}, []);

	const runSlideWith = useCallback(
		async (
			outlineValue: Outline,
			index: number,
			controller: AbortController,
			instruction?: string,
		): Promise<Slide | undefined> => {
			setActiveSlide(index);
			patchSlide(index, {
				status: "streaming",
				partial: "",
				error: undefined,
			});

			try {
				const slide = await generateSlide(
					{
						outline: outlineValue,
						index,
						...(instruction ? { instruction } : {}),
					},
					settingsRef.current,
					{
						signal: controller.signal,
						onDelta: (text) => {
							setSlideStates((current) =>
								current.map((item) =>
									item.index === index
										? { ...item, partial: item.partial + text }
										: item,
								),
							);
						},
					},
				);
				patchSlide(index, { status: "done", slide, partial: "" });
				syncOutlineFromSlide(index, slide);
				return slide;
			} catch (caught) {
				const streamError = toStreamError(caught);
				if (streamError.code === "aborted") {
					patchSlide(index, { status: "pending", partial: "" });
				} else {
					patchSlide(index, { status: "error", error: streamError });
				}
				return undefined;
			} finally {
				setActiveSlide((current) => (current === index ? undefined : current));
			}
		},
		[patchSlide, syncOutlineFromSlide],
	);

	const runQueue = useCallback(
		async (
			outlineValue: Outline,
			indexes: number[],
			controller: AbortController,
		) => {
			for (const index of indexes) {
				if (controller.signal.aborted) break;
				await runSlideWith(outlineValue, index, controller);
				if (controller.signal.aborted) break;
			}
		},
		[runSlideWith],
	);

	const reset = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setPhase("idle");
		setTitle("");
		setSubtitle("");
		setTheme(DEFAULT_THEME_ID);
		setOutline(undefined);
		setSlideStates([]);
		setOutlineChars(0);
		setError(undefined);
		setActiveSlide(undefined);
	}, []);

	const startDeck = useCallback(
		async (input: DeckStartInput) => {
			controllerRef.current?.abort();
			const controller = new AbortController();
			controllerRef.current = controller;

			setPhase("outlining");
			setError(undefined);
			setOutline(undefined);
			setSlideStates([]);
			setOutlineChars(0);

			const requestedTheme = input.theme ?? theme;

			try {
				const outlineValue = await generateOutline(
					{
						topic: input.topic,
						slideCount: input.slideCount ?? 8,
						theme: requestedTheme,
						...(input.audience ? { audience: input.audience } : {}),
						...(input.tone ? { tone: input.tone } : {}),
					},
					settingsRef.current,
					{
						signal: controller.signal,
						onDelta: (text) =>
							setOutlineChars((current) => current + text.length),
					},
				);

				setTitle(outlineValue.title);
				setSubtitle(outlineValue.subtitle);
				setTheme(outlineValue.theme);
				setOutline(outlineValue);
				setSlideStates(
					outlineValue.slides.map((item, index) => ({
						index,
						outline: item,
						status: "pending" as const,
						partial: "",
					})),
				);
				setPhase("slides");

				await runQueue(
					outlineValue,
					outlineValue.slides.map((_, index) => index),
					controller,
				);

				if (!controller.signal.aborted) {
					setPhase("ready");
				}
			} catch (caught) {
				if (controller.signal.aborted) {
					setPhase("idle");
					return;
				}
				setError(toStreamError(caught));
				setPhase("error");
			}
		},
		[runQueue, theme],
	);

	const generateSlides = useCallback(async () => {
		if (!outline) return;
		const pending = slideStates
			.filter((slide) => slide.status !== "done")
			.map((slide) => slide.index);
		if (pending.length === 0) {
			setPhase("ready");
			return;
		}

		const controller = new AbortController();
		controllerRef.current = controller;
		setPhase("slides");
		await runQueue(outline, pending, controller);
		if (!controller.signal.aborted) setPhase("ready");
	}, [outline, runQueue, slideStates]);

	const retrySlide = useCallback(
		async (index: number) => {
			if (!outline) return;
			const controller = controllerRef.current ?? new AbortController();
			controllerRef.current = controller;
			await runSlideWith(outline, index, controller);
		},
		[outline, runSlideWith],
	);

	const editSlide = useCallback(
		async (index: number, instruction: string) => {
			if (!outline) return;
			const controller = new AbortController();
			controllerRef.current = controller;
			await runSlideWith(outline, index, controller, instruction);
		},
		[outline, runSlideWith],
	);

	const addSlide = useCallback(
		async (insertAt: number, item: OutlineSlide) => {
			if (!outline) return;
			const position = Math.min(Math.max(insertAt, 0), outline.slides.length);
			const nextOutline: Outline = {
				...outline,
				slides: [
					...outline.slides.slice(0, position),
					item,
					...outline.slides.slice(position),
				],
			};

			setOutline(nextOutline);
			setSlideStates((current) => {
				const shifted = current.map((slide) =>
					slide.index >= position
						? { ...slide, index: slide.index + 1 }
						: slide,
				);
				const inserted: SlideState = {
					index: position,
					outline: item,
					status: "pending",
					partial: "",
				};
				return [
					...shifted.slice(0, position),
					inserted,
					...shifted.slice(position),
				];
			});

			const controller = new AbortController();
			controllerRef.current = controller;
			await runSlideWith(nextOutline, position, controller);
		},
		[outline, runSlideWith],
	);

	const removeSlide = useCallback(
		(index: number) => {
			if (!outline || !outline.slides[index]) return;
			setOutline({
				...outline,
				slides: outline.slides.filter((_, itemIndex) => itemIndex !== index),
			});
			setSlideStates((current) =>
				current
					.filter((slide) => slide.index !== index)
					.map((slide) =>
						slide.index > index ? { ...slide, index: slide.index - 1 } : slide,
					),
			);
		},
		[outline],
	);

	const cancel = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setPhase((current) =>
			current === "outlining" || current === "slides"
				? slideStates.some((slide) => slide.status === "done")
					? "ready"
					: "idle"
				: current,
		);
		setActiveSlide(undefined);
	}, [slideStates]);

	const updateDeck = useCallback(
		(update: { title?: string; subtitle?: string }) => {
			if (update.title) {
				setTitle(update.title);
				setOutline((current) =>
					current ? { ...current, title: update.title as string } : current,
				);
			}
			if (update.subtitle !== undefined) {
				setSubtitle(update.subtitle);
				setOutline((current) =>
					current
						? { ...current, subtitle: update.subtitle as string }
						: current,
				);
			}
		},
		[],
	);

	const changeTheme = useCallback((next: ThemeId) => {
		setTheme(next);
		setOutline((current) =>
			current ? { ...current, theme: next } : current,
		);
	}, []);

	const hydrate = useCallback((deck?: StoredDeck) => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setActiveSlide(undefined);
		setError(undefined);

		if (!deck || !deck.outline) {
			setPhase("idle");
			setTitle(deck?.title ?? "");
			setSubtitle(deck?.subtitle ?? "");
			setTheme(deck?.theme ?? DEFAULT_THEME_ID);
			setOutline(undefined);
			setSlideStates([]);
			return;
		}

		const slideMap = new Map(
			deck.slides.map((entry) => [entry.index, entry.slide]),
		);
		setTitle(deck.title);
		setSubtitle(deck.subtitle);
		setTheme(deck.theme);
		setOutline(deck.outline);
		setSlideStates(
			deck.outline.slides.map((item, index) => {
				const slide = slideMap.get(index);
				return slide
					? {
							index,
							outline: item,
							status: "done" as const,
							partial: "",
							slide,
						}
					: {
							index,
							outline: item,
							status: "pending" as const,
							partial: "",
						};
			}),
		);
		setPhase("ready");
	}, []);

	const snapshot = useCallback((): WorkspaceSnapshot => {
		return {
			title,
			subtitle,
			theme,
			outline,
			slides: slideStates
				.filter((slide) => slide.status === "done" && slide.slide)
				.map((slide) => ({ index: slide.index, slide: slide.slide as Slide })),
		};
	}, [outline, slideStates, subtitle, theme, title]);

	const progress = useMemo(() => {
		const total = slideStates.length;
		const done = slideStates.filter((slide) => slide.status === "done").length;
		const failed = slideStates.filter((slide) => slide.status === "error").length;
		const percent = total === 0 ? 0 : Math.round((done / total) * 100);
		return {
			total,
			done,
			failed,
			percent,
			allDone: total > 0 && done === total,
		};
	}, [slideStates]);

	return {
		phase,
		title,
		subtitle,
		theme,
		outline,
		slideStates,
		outlineChars,
		error,
		activeSlide,
		progress,
		startDeck,
		generateSlides,
		retrySlide,
		editSlide,
		addSlide,
		removeSlide,
		changeTheme,
		updateDeck,
		cancel,
		reset,
		hydrate,
		snapshot,
	};
}

export type DeckWorkspace = ReturnType<typeof useDeckWorkspace>;
