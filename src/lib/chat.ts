import {
	ChatResponseSchema,
	type ChatRequest,
	type ChatResponse,
} from "@/types/chat";
import {
	StreamRequestError,
	buildHeaders,
	providerConfig,
} from "./api";
import type { ProviderSettings } from "./providers";
import { postSSE } from "./sse";

export type ChatPayload = Omit<ChatRequest, "provider" | "model" | "baseUrl">;

export interface ChatStreamOptions {
	onDelta?: (text: string) => void;
	signal?: AbortSignal;
}

export function generateChat(
	payload: ChatPayload,
	settings: ProviderSettings,
	options: ChatStreamOptions = {},
): Promise<ChatResponse> {
	return new Promise((resolve, reject) => {
		postSSE(
			"/api/chat",
			{ ...providerConfig(settings), ...payload },
			buildHeaders(settings),
			{
				onDelta: options.onDelta,
				onResult: (data) => {
					try {
						resolve(ChatResponseSchema.parse(data));
					} catch {
						reject(
							new StreamRequestError({
								message: "The assistant returned an unreadable response.",
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
