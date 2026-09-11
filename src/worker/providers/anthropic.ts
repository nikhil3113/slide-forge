import type { Provider, StreamChatOptions } from "./types";
import { ProviderError, providerHttpError, requireBody } from "./types";
import { parseSSE } from "@/worker/utils/sse-parse";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const anthropicProvider: Provider = {
	id: "anthropic",
	async *streamChat(options: StreamChatOptions): AsyncGenerator<string> {
		const response = await fetch(ANTHROPIC_API_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-api-key": options.apiKey,
				"anthropic-version": ANTHROPIC_VERSION,
			},
			body: JSON.stringify({
				model: options.model,
				max_tokens: options.maxTokens ?? 4096,
				temperature: options.temperature ?? 0.7,
				stream: true,
				system: options.system,
				messages: [
					{ role: "user", content: options.user },
					{ role: "assistant", content: "{" },
				],
			}),
			signal: options.signal,
		});

		if (!response.ok) {
			throw await providerHttpError("Anthropic", response);
		}

		const body = requireBody(response, "Anthropic");
		yield "{";

		for await (const chunk of parseSSE(body)) {
			if (chunk.event === "error") {
				throw new ProviderError(`Anthropic stream error: ${chunk.data.slice(0, 300)}`);
			}

			if (chunk.event !== "content_block_delta") continue;

			let parsed: unknown;
			try {
				parsed = JSON.parse(chunk.data);
			} catch {
				continue;
			}

			const text = (parsed as { delta?: { text?: unknown } }).delta?.text;
			if (typeof text === "string" && text.length > 0) {
				yield text;
			}
		}
	},
};
