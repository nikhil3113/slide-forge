import {
	OutlineSchema,
	SlideSchema,
	type Outline,
	type Slide,
	type StreamError,
	type ThemeId,
} from "@/types/deck";
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

export interface StreamOptions {
	onDelta?: (text: string) => void;
	signal?: AbortSignal;
}

export interface OutlineInput {
	topic: string;
	slideCount: number;
	theme: ThemeId;
	audience?: string;
	tone?: string;
}

export interface SlideInput {
	outline: Outline;
	index: number;
}

function buildHeaders(settings: ProviderSettings): Record<string, string> {
	const preset = getProviderPreset(settings.providerId);
	const headers: Record<string, string> = {
		"x-llm-key": activeKey(settings),
	};
	if (preset.requiresSession) {
		headers["x-llm-session"] = getSessionId();
	}
	return headers;
}

function providerConfig(settings: ProviderSettings) {
	const baseUrl = activeBaseUrl(settings);
	return {
		provider: settings.providerId,
		model: activeModel(settings),
		...(baseUrl ? { baseUrl } : {}),
	};
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

export function generateSlide(
	input: SlideInput,
	settings: ProviderSettings,
	options: StreamOptions = {},
): Promise<Slide> {
	return new Promise((resolve, reject) => {
		postSSE(
			"/api/slide",
			{
				...providerConfig(settings),
				outline: input.outline,
				index: input.index,
			},
			buildHeaders(settings),
			{
				onDelta: options.onDelta,
				onResult: (data) => {
					try {
						resolve(SlideSchema.parse(data));
					} catch {
						reject(
							new StreamRequestError({
								message: "The server returned an unreadable slide.",
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
