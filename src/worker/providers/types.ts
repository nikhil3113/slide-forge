import type { ProviderId } from "@/types/deck";

export interface StreamChatOptions {
	model: string;
	apiKey: string;
	system: string;
	user: string;
	temperature?: number;
	maxTokens?: number;
	signal: AbortSignal;
	headers?: Record<string, string>;
}

export interface Provider {
	readonly id: ProviderId;
	streamChat(options: StreamChatOptions): AsyncGenerator<string>;
}

export class ProviderError extends Error {
	readonly status: number;

	constructor(message: string, status = 502) {
		super(message);
		this.name = "ProviderError";
		this.status = status;
	}
}

function extractErrorMessage(body: string): string {
	try {
		const parsed = JSON.parse(body) as {
			error?: { message?: unknown };
			message?: unknown;
		};
		const message = parsed.error?.message ?? parsed.message;
		if (typeof message === "string" && message.length > 0) {
			return message.slice(0, 400);
		}
	} catch {
		// fall through to raw body
	}
	return body.replace(/\s+/g, " ").trim().slice(0, 400);
}

export async function providerHttpError(provider: string, response: Response): Promise<ProviderError> {
	let detail = "";
	try {
		detail = extractErrorMessage(await response.text());
	} catch {
		// ignore unreadable bodies
	}

	const status = response.status === 401 || response.status === 403 ? 401 : response.status;
	const suffix = detail ? `: ${detail}` : "";
	return new ProviderError(`${provider} request failed with status ${response.status}${suffix}`, status);
}

export function requireBody(response: Response, provider: string): ReadableStream<Uint8Array> {
	if (!response.body) {
		throw new ProviderError(`${provider} returned an empty response body`);
	}
	return response.body;
}
