import type { ProviderId } from "@/types/deck";
import type { Provider, StreamChatOptions } from "./types";
import { ProviderError, providerHttpError, requireBody } from "./types";
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

			let contentSeen = false;
			let reasoningSeen = false;

			for await (const chunk of parseSSE(body)) {
				if (chunk.data === "[DONE]") break;

				let parsed: unknown;
				try {
					parsed = JSON.parse(chunk.data);
				} catch {
					continue;
				}

				const choice = (
					parsed as {
						choices?: Array<{
							delta?: { content?: unknown; reasoning_content?: unknown };
						}>;
					}
				).choices?.[0];

				const reasoning = choice?.delta?.reasoning_content;
				if (typeof reasoning === "string" && reasoning.length > 0) {
					reasoningSeen = true;
				}

				const delta = choice?.delta?.content;
				if (typeof delta === "string" && delta.length > 0) {
					contentSeen = true;
					yield delta;
				}
			}

			if (!contentSeen && reasoningSeen) {
				throw new ProviderError(
					"The model spent its whole output budget on internal reasoning and produced no content. Retry, or switch to a faster model like glm-5.3-flash.",
				);
			}
		},
	};
}
