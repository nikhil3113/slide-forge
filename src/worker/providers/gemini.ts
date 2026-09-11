import type { Provider, StreamChatOptions } from "./types";
import { providerHttpError, requireBody } from "./types";
import { parseSSE } from "@/worker/utils/sse-parse";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const geminiProvider: Provider = {
	id: "gemini",
	async *streamChat(options: StreamChatOptions): AsyncGenerator<string> {
		const model = encodeURIComponent(options.model);
		const endpoint = `${GEMINI_API_BASE}/models/${model}:streamGenerateContent?alt=sse`;

		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-goog-api-key": options.apiKey,
			},
			body: JSON.stringify({
				systemInstruction: {
					parts: [{ text: options.system }],
				},
				contents: [
					{
						role: "user",
						parts: [{ text: options.user }],
					},
				],
				generationConfig: {
					temperature: options.temperature ?? 0.7,
					maxOutputTokens: options.maxTokens,
					responseMimeType: "application/json",
				},
			}),
			signal: options.signal,
		});

		if (!response.ok) {
			throw await providerHttpError("Gemini", response);
		}

		const body = requireBody(response, "Gemini");

		for await (const chunk of parseSSE(body)) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(chunk.data);
			} catch {
				continue;
			}

			const candidate = (
				parsed as {
					candidates?: Array<{
						content?: { parts?: Array<{ text?: unknown }> };
					}>;
				}
			).candidates?.[0];

			for (const part of candidate?.content?.parts ?? []) {
				if (typeof part.text === "string" && part.text.length > 0) {
					yield part.text;
				}
			}
		}
	},
};
