import type { ProviderId } from "@/types/deck";
import type { Provider, StreamChatOptions } from "./types";
import { providerHttpError, requireBody } from "./types";
import { parseSSE } from "@/worker/utils/sse-parse";

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, "");
}

export function createOpenAICompatProvider(
	baseUrl: string,
	id: ProviderId = "openai",
): Provider {
	const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;

	return {
		id,
		async *streamChat(options: StreamChatOptions): AsyncGenerator<string> {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${options.apiKey}`,
					...options.headers,
				},
				body: JSON.stringify({
					model: options.model,
					stream: true,
					temperature: options.temperature ?? 0.7,
					max_tokens: options.maxTokens,
					messages: [
						{ role: "system", content: options.system },
						{ role: "user", content: options.user },
					],
				}),
				signal: options.signal,
			});

			if (!response.ok) {
				throw await providerHttpError("Chat completions", response);
			}

			const body = requireBody(response, "Chat completions");

			for await (const chunk of parseSSE(body)) {
				if (chunk.data === "[DONE]") return;

				let parsed: unknown;
				try {
					parsed = JSON.parse(chunk.data);
				} catch {
					continue;
				}

				const delta = (
					parsed as { choices?: Array<{ delta?: { content?: unknown } }> }
				).choices?.[0]?.delta?.content;

				if (typeof delta === "string" && delta.length > 0) {
					yield delta;
				}
			}
		},
	};
}
