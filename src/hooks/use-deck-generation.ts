import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateOutline, generateSlide, StreamRequestError } from "@/lib/api";
import type { ProviderSettings } from "@/lib/providers";
import type {
	Outline,
	OutlineSlide,
	Slide,
	StreamError,
	ThemeId,
} from "@/types/deck";

export type SlideStatus = "pending" | "streaming" | "done" | "error";
export type GenerationPhase = "idle" | "outlining" | "slides" | "done" | "error";

export interface SlideState {
	index: number;
	outline: OutlineSlide;
	status: SlideStatus;
	partial: string;
	slide?: Slide;
	error?: StreamError;
}

export interface GenerationInput {
	topic: string;
	slideCount: number;
	theme: ThemeId;
	audience?: string;
	tone?: string;
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

export function useDeckGeneration(settings: ProviderSettings) {
	const [phase, setPhase] = useState<GenerationPhase>("idle");
	const [outline, setOutline] = useState<Outline>();
	const [slides, setSlides] = useState<SlideState[]>([]);
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
			setSlides((current) =>
				current.map((item) =>
					item.index === index ? { ...item, ...patch } : item,
				),
			);
		},
		[],
	);

	const runSlide = useCallback(
		async (
			outlineValue: Outline,
			index: number,
			controller: AbortController,
		) => {
			setActiveSlide(index);
			patchSlide(index, { status: "streaming", partial: "", error: undefined });

			try {
				const slide = await generateSlide(
					{ outline: outlineValue, index },
					settingsRef.current,
					{
						signal: controller.signal,
						onDelta: (text) => {
							setSlides((current) =>
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
			} catch (caught) {
				const streamError = toStreamError(caught);
				if (streamError.code === "aborted") {
					patchSlide(index, { status: "pending", partial: "" });
				} else {
					patchSlide(index, { status: "error", error: streamError });
				}
			} finally {
				setActiveSlide((current) => (current === index ? undefined : current));
			}
		},
		[patchSlide],
	);

	const generate = useCallback(
		async (input: GenerationInput) => {
			controllerRef.current?.abort();
			const controller = new AbortController();
			controllerRef.current = controller;

			setPhase("outlining");
			setError(undefined);
			setOutline(undefined);
			setSlides([]);
			setOutlineChars(0);

			try {
				const outlineValue = await generateOutline(
					input,
					settingsRef.current,
					{
						signal: controller.signal,
						onDelta: (text) =>
							setOutlineChars((current) => current + text.length),
					},
				);
				setOutline(outlineValue);
				setSlides(
					outlineValue.slides.map((item, index) => ({
						index,
						outline: item,
						status: "pending" as const,
						partial: "",
					})),
				);
				setPhase("slides");

				for (let index = 0; index < outlineValue.slides.length; index += 1) {
					if (controller.signal.aborted) break;
					await runSlide(outlineValue, index, controller);
					if (controller.signal.aborted) break;
				}

				if (controller.signal.aborted) {
					setPhase("idle");
				} else {
					setPhase("done");
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
		[runSlide],
	);

	const cancel = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setPhase((current) =>
			current === "outlining" || current === "slides" ? "idle" : current,
		);
		setActiveSlide(undefined);
	}, []);

	const retrySlide = useCallback(
		async (index: number) => {
			if (!outline) return;
			const controller = controllerRef.current ?? new AbortController();
			controllerRef.current = controller;
			await runSlide(outline, index, controller);
		},
		[outline, runSlide],
	);

	const reset = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setPhase("idle");
		setOutline(undefined);
		setSlides([]);
		setError(undefined);
		setOutlineChars(0);
	}, []);

	const progress = useMemo(() => {
		const total = slides.length;
		const done = slides.filter((slide) => slide.status === "done").length;
		const failed = slides.filter((slide) => slide.status === "error").length;
		const percent = total === 0 ? 0 : Math.round((done / total) * 100);
		return { total, done, failed, percent, allDone: total > 0 && done === total };
	}, [slides]);

	return {
		phase,
		outline,
		slides,
		outlineChars,
		error,
		activeSlide,
		progress,
		generate,
		cancel,
		retrySlide,
		reset,
	};
}

export type DeckGeneration = ReturnType<typeof useDeckGeneration>;
