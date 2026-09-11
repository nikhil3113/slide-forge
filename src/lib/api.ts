import {
	OutlineSchema,
	type Outline,
	type ThemeId,
} from "@/types/deck";
import {
	SlideHtmlResultSchema,
	StyleGuideSchema,
	type SlideHtmlResult,
	type StyleGuide,
} from "@/types/html";
import type { StreamError } from "@/types/deck";
import {
	activeBaseUrl,
	activeKey,
	activeModel,
	getProviderPreset,
	getSessionId,
	type ProviderSettings,
} from "./providers";
import { postSSE } from "./sse";

export class StreamRequestError extends Error {
	readonly code: StreamError["code"];

	constructor(error: StreamError) {
		super(error.message);
		this.name = "StreamRequestError";
		this.code = error.code;
	}
}

export function buildHeaders(
	settings: ProviderSettings,
): Record<string, string> {
	const preset = getProviderPreset(settings.providerId);
	const headers: Record<string, string> = {
		"x-llm-key": activeKey(settings),
	};
	if (preset.requiresSession) {
		headers["x-llm-session"] = getSessionId();
	}
	return headers;
}

export function providerConfig(settings: ProviderSettings) {
	const baseUrl = activeBaseUrl(settings);
	return {
		provider: settings.providerId,
		model: activeModel(settings),
		...(baseUrl ? { baseUrl } : {}),
	};
}

export interface OutlineInput {
	topic: string;
	slideCount: number;
	theme: ThemeId;
	audience?: string;
	tone?: string;
}

export interface SlideHtmlInput {
	outline: Outline;
	index: number;
	styleGuide: StyleGuide;
	instruction?: string;
	previousHtml?: string;
}

export interface StreamOptions {
	onDelta?: (text: string) => void;
	signal?: AbortSignal;
}

export function generateOutline(
	input: OutlineInput,
	settings: ProviderSettings,
	options: StreamOptions = {},
): Promise<Outline> {
	return new Promise((resolve, reject) => {
		postSSE(
			"/api/outline",
			{
				...providerConfig(settings),
				topic: input.topic,
				slideCount: input.slideCount,
				theme: input.theme,
				...(input.audience ? { audience: input.audience } : {}),
				...(input.tone ? { tone: input.tone } : {}),
			},
			buildHeaders(settings),
			{
				onDelta: options.onDelta,
				onResult: (data) => {
					try {
						resolve(OutlineSchema.parse(data));
					} catch {
						reject(
							new StreamRequestError({
								message: "The server returned an unreadable outline.",
								code: "invalid_json",
							}),
						);
					}
				},
				onError: (error) => reject(new StreamRequestError(error)),
				signal: options.signal,
			},
		).catch(reject);
	});
}

export function generateStyleGuide(
	outline: Outline,
	settings: ProviderSettings,
	options: StreamOptions = {},
): Promise<StyleGuide> {
	return new Promise((resolve, reject) => {
		postSSE(
			"/api/style-guide",
			{ ...providerConfig(settings), outline },
			buildHeaders(settings),
			{
				onDelta: options.onDelta,
				onResult: (data) => {
					try {
						resolve(StyleGuideSchema.parse(data));
					} catch {
						reject(
							new StreamRequestError({
								message: "The server returned an unreadable style guide.",
								code: "invalid_json",
							}),
						);
					}
				},
				onError: (error) => reject(new StreamRequestError(error)),
				signal: options.signal,
			},
		).catch(reject);
	});
}

export function generateSlideHtml(
	input: SlideHtmlInput,
	settings: ProviderSettings,
	options: StreamOptions = {},
): Promise<SlideHtmlResult> {
	return new Promise((resolve, reject) => {
		postSSE(
			"/api/slide-html",
			{
				...providerConfig(settings),
				outline: input.outline,
				index: input.index,
				styleGuide: input.styleGuide,
				...(input.instruction ? { instruction: input.instruction } : {}),
				...(input.previousHtml ? { previousHtml: input.previousHtml } : {}),
			},
			buildHeaders(settings),
			{
				onDelta: options.onDelta,
				onResult: (data) => {
					try {
						resolve(SlideHtmlResultSchema.parse(data));
					} catch {
						reject(
							new StreamRequestError({
								message: "The server returned an unreadable slide.",
								code: "invalid_html",
							}),
						);
					}
				},
				onError: (error) => reject(new StreamRequestError(error)),
				signal: options.signal,
			},
		).catch(reject);
	});
}
