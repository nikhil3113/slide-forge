import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	generateOutline,
	generateSlideHtml,
	generateStyleGuide,
	StreamRequestError,
} from "@/lib/api";
import type { StoredDeck } from "@/lib/db";
import type { ProviderSettings } from "@/lib/providers";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import type {
	Outline,
	OutlineSlide,
	StreamError,
	ThemeId,
} from "@/types/deck";
import type { StyleGuide } from "@/types/html";

export type SlideStatus = "pending" | "streaming" | "done" | "error";
export type WorkspacePhase =
	| "idle"
	| "outlining"
	| "style-guide"
	| "slides"
	| "ready"
	| "error";

export interface HtmlSlideState {
	index: number;
	outline: OutlineSlide;
	status: SlideStatus;
	partialHtml: string;
	html?: string;
	notes?: string;
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
	styleGuide?: StyleGuide;
	slides: Array<{ index: number; html: string; notes: string }>;
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
	const [phaseStartedAt, setPhaseStartedAt] = useState(() => Date.now());
	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
	const [outline, setOutline] = useState<Outline>();
	const [styleGuide, setStyleGuide] = useState<StyleGuide>();
	const [slideStates, setSlideStates] = useState<HtmlSlideState[]>([]);
	const [outlineChars, setOutlineChars] = useState(0);
	const [error, setError] = useState<StreamError>();
	const [activeSlide, setActiveSlide] = useState<number>();

	const controllerRef = useRef<AbortController | null>(null);
	const settingsRef = useRef(settings);

	const transitionPhase = useCallback((next: WorkspacePhase) => {
		setPhaseStartedAt(Date.now());
		setPhase(next);
	}, []);

	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);

	useEffect(() => {
		return () => controllerRef.current?.abort();
	}, []);

	const patchSlide = useCallback(
		(index: number, patch: Partial<HtmlSlideState>) => {
			setSlideStates((current) =>
				current.map((item) =>
					item.index === index ? { ...item, ...patch } : item,
				),
			);
		},
		[],
	);

	const runSlideWith = useCallback(
		async (
			outlineValue: Outline,
			guide: StyleGuide,
			index: number,
			controller: AbortController,
			instruction?: string,
			previousHtml?: string,
		): Promise<boolean> => {
			setActiveSlide(index);
			patchSlide(index, {
				status: "streaming",
				partialHtml: "",
				error: undefined,
			});

			try {
				const result = await generateSlideHtml(
					{
						outline: outlineValue,
						index,
						styleGuide: guide,
						...(instruction ? { instruction } : {}),
						...(previousHtml ? { previousHtml } : {}),
					},
					settingsRef.current,
					{
						signal: controller.signal,
						onDelta: (text) => {
							setSlideStates((current) =>
								current.map((item) =>
									item.index === index
										? { ...item, partialHtml: item.partialHtml + text }
										: item,
								),
							);
						},
					},
				);
				patchSlide(index, {
					status: "done",
					html: result.html,
					notes: result.notes,
					partialHtml: "",
				});
				return true;
			} catch (caught) {
				const streamError = toStreamError(caught);
				if (streamError.code === "aborted") {
					patchSlide(index, { status: "pending", partialHtml: "" });
				} else {
					patchSlide(index, { status: "error", error: streamError });
				}
				return false;
			} finally {
				setActiveSlide((current) => (current === index ? undefined : current));
			}
		},
		[patchSlide],
	);

	const runQueue = useCallback(
		async (
			outlineValue: Outline,
			guide: StyleGuide,
			indexes: number[],
			controller: AbortController,
		) => {
			for (const index of indexes) {
				if (controller.signal.aborted) break;
				await runSlideWith(outlineValue, guide, index, controller);
				if (controller.signal.aborted) break;
			}
		},
		[runSlideWith],
	);

	const reset = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		transitionPhase("idle");
		setTitle("");
		setSubtitle("");
		setTheme(DEFAULT_THEME_ID);
		setOutline(undefined);
		setStyleGuide(undefined);
		setSlideStates([]);
		setOutlineChars(0);
		setError(undefined);
		setActiveSlide(undefined);
	}, [transitionPhase]);

	const startDeck = useCallback(
		async (input: DeckStartInput) => {
			controllerRef.current?.abort();
			const controller = new AbortController();
			controllerRef.current = controller;

			transitionPhase("outlining");
			setError(undefined);
			setOutline(undefined);
			setStyleGuide(undefined);
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
				transitionPhase("style-guide");

				const guide = await generateStyleGuide(outlineValue, settingsRef.current, {
					signal: controller.signal,
				});
				setStyleGuide(guide);

				setSlideStates(
					outlineValue.slides.map((item, index) => ({
						index,
						outline: item,
						status: "pending" as const,
						partialHtml: "",
					})),
				);
				transitionPhase("slides");

				await runQueue(
					outlineValue,
					guide,
					outlineValue.slides.map((_, index) => index),
					controller,
				);

				if (!controller.signal.aborted) {
					transitionPhase("ready");
				}
			} catch (caught) {
				if (controller.signal.aborted) {
					transitionPhase("idle");
					return;
				}
				setError(toStreamError(caught));
				transitionPhase("error");
			}
		},
		[runQueue, theme, transitionPhase],
	);

	const ensureStyleGuide = useCallback(
		async (outlineValue: Outline): Promise<StyleGuide> => {
			if (styleGuide) return styleGuide;
			const guide = await generateStyleGuide(outlineValue, settingsRef.current, {});
			setStyleGuide(guide);
			return guide;
		},
		[styleGuide],
	);

	const generateSlides = useCallback(async () => {
		if (!outline) return;
		const pending = slideStates
			.filter((slide) => slide.status !== "done")
			.map((slide) => slide.index);
		if (pending.length === 0) {
			transitionPhase("ready");
			return;
		}

		const controller = new AbortController();
		controllerRef.current = controller;

		try {
			const guide = await ensureStyleGuide(outline);
			transitionPhase("slides");
			await runQueue(outline, guide, pending, controller);
			if (!controller.signal.aborted) transitionPhase("ready");
		} catch (caught) {
			if (!controller.signal.aborted) {
				setError(toStreamError(caught));
				transitionPhase("error");
			}
		}
	}, [ensureStyleGuide, outline, runQueue, slideStates, transitionPhase]);

	const retrySlide = useCallback(
		async (index: number) => {
			if (!outline || !styleGuide) return;
			const controller = controllerRef.current ?? new AbortController();
			controllerRef.current = controller;
			await runSlideWith(outline, styleGuide, index, controller);
		},
		[outline, runSlideWith, styleGuide],
	);

	const editSlide = useCallback(
		async (index: number, instruction: string) => {
			if (!outline || !styleGuide) return;
			const current = slideStates.find((slide) => slide.index === index);
			const controller = new AbortController();
			controllerRef.current = controller;
			await runSlideWith(
				outline,
				styleGuide,
				index,
				controller,
				instruction,
				current?.html,
			);
		},
		[outline, runSlideWith, slideStates, styleGuide],
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
				const inserted: HtmlSlideState = {
					index: position,
					outline: item,
					status: "pending",
					partialHtml: "",
				};
				return [
					...shifted.slice(0, position),
					inserted,
					...shifted.slice(position),
				];
			});

			try {
				const guide = await ensureStyleGuide(nextOutline);
				const controller = new AbortController();
				controllerRef.current = controller;
				await runSlideWith(nextOutline, guide, position, controller);
			} catch (caught) {
				setError(toStreamError(caught));
				transitionPhase("error");
			}
		},
		[ensureStyleGuide, outline, runSlideWith, transitionPhase],
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
		if (
			phase === "outlining" ||
			phase === "style-guide" ||
			phase === "slides"
		) {
			transitionPhase(slideStates.some((slide) => slide.html) ? "ready" : "idle");
		}
		setActiveSlide(undefined);
	}, [phase, slideStates, transitionPhase]);

	const updateDeck = useCallback((update: { title?: string; subtitle?: string }) => {
		if (update.title) {
			setTitle(update.title);
			setOutline((current) =>
				current ? { ...current, title: update.title as string } : current,
			);
		}
		if (update.subtitle !== undefined) {
			setSubtitle(update.subtitle);
			setOutline((current) =>
				current ? { ...current, subtitle: update.subtitle as string } : current,
			);
		}
	}, []);

	const changeTheme = useCallback((next: ThemeId) => {
		setTheme(next);
		setOutline((current) => (current ? { ...current, theme: next } : current));
	}, []);

	const hydrate = useCallback((deck?: StoredDeck) => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setActiveSlide(undefined);
		setError(undefined);

		if (!deck || !deck.outline) {
			transitionPhase("idle");
			setTitle(deck?.title ?? "");
			setSubtitle(deck?.subtitle ?? "");
			setTheme(deck?.theme ?? DEFAULT_THEME_ID);
			setOutline(undefined);
			setStyleGuide(undefined);
			setSlideStates([]);
			return;
		}

		const htmlMap = new Map(
			deck.slides.map((entry) => [entry.index, entry]),
		);
		setTitle(deck.title);
		setSubtitle(deck.subtitle);
		setTheme(deck.theme);
		setOutline(deck.outline);
		setStyleGuide(deck.styleGuide);
		setSlideStates(
			deck.outline.slides.map((item, index) => {
				const stored = htmlMap.get(index);
				return stored
					? {
							index,
							outline: item,
							status: "done" as const,
							partialHtml: "",
							html: stored.html,
							notes: stored.notes,
						}
					: {
							index,
							outline: item,
							status: "pending" as const,
							partialHtml: "",
						};
			}),
		);
		transitionPhase("ready");
	}, [transitionPhase]);

	const snapshot = useCallback((): WorkspaceSnapshot => {
		return {
			title,
			subtitle,
			theme,
			outline,
			styleGuide,
			slides: slideStates
				.filter((slide) => slide.html)
				.map((slide) => ({
					index: slide.index,
					html: slide.html as string,
					notes: slide.notes ?? "",
				})),
		};
	}, [outline, slideStates, styleGuide, subtitle, theme, title]);

	const progress = useMemo(() => {
		const total = slideStates.length;
		const done = slideStates.filter((slide) => slide.html).length;
		const failed = slideStates.filter(
			(slide) => slide.status === "error",
		).length;
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
		phaseStartedAt,
		title,
		subtitle,
		theme,
		outline,
		styleGuide,
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
