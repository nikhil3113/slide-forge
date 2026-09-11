import type { ProviderId } from "@/types/deck";
import { createOpenAICompatProvider } from "./openai-compat";
import { geminiProvider } from "./gemini";
import { anthropicProvider } from "./anthropic";
import { ProviderError, type Provider } from "./types";

const OPENAI_COMPAT_BASE_URLS: Record<string, string> = {
	openai: "https://api.openai.com/v1",
	groq: "https://api.groq.com/openai/v1",
	"opencode-zen": "https://opencode.ai/zen/v1",
};

export interface ProviderSelection {
	provider: ProviderId;
	baseUrl?: string;
}

export function createProvider(selection: ProviderSelection): Provider {
	switch (selection.provider) {
		case "gemini":
			return geminiProvider;
		case "anthropic":
			return anthropicProvider;
		default: {
			const baseUrl =
				selection.baseUrl ?? OPENAI_COMPAT_BASE_URLS[selection.provider];
			if (!baseUrl) {
				throw new ProviderError(
					"A base URL is required for custom OpenAI-compatible providers.",
					400,
				);
			}
			return createOpenAICompatProvider(baseUrl, selection.provider);
		}
	}
}
