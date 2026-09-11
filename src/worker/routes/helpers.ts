import type { Context } from "hono";
import type { SSEStreamingApi } from "hono/streaming";
import type { StreamError } from "@/types/deck";
import { ProviderError } from "@/worker/providers/types";
import { JsonValidationError } from "@/worker/utils/json";

export function toStreamError(error: unknown): StreamError {
	if (error instanceof JsonValidationError) {
		return { message: error.message, code: "invalid_json" };
	}

	if (error instanceof ProviderError) {
		return {
			message: error.message,
			code: error.status === 401 ? "unauthorized" : "provider_error",
		};
	}

	if (error instanceof DOMException && error.name === "AbortError") {
		return { message: "Generation was aborted.", code: "aborted" };
	}

	return {
		message: "Unexpected error while generating. Please try again.",
		code: "internal",
	};
}

export async function writeStreamError(
	stream: SSEStreamingApi,
	error: unknown,
): Promise<void> {
	await stream.writeSSE({
		event: "error",
		data: JSON.stringify(toStreamError(error)),
	});
}

export async function collectDelta(
	source: AsyncGenerator<string>,
	stream: SSEStreamingApi,
): Promise<string> {
	let text = "";
	for await (const delta of source) {
		text += delta;
		await stream.writeSSE({
			event: "delta",
			data: JSON.stringify({ text: delta }),
		});
	}
	return text;
}

export function sseHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", "no-cache, no-transform");
	headers.set("X-Accel-Buffering", "no");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export async function readJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		return null;
	}
}

export function readApiKey(c: Context): string | undefined {
	const key = c.req.header("x-llm-key")?.trim();
	return key && key.length > 0 ? key : undefined;
}

export function readSessionHeaders(
	c: Context,
): Record<string, string> | undefined {
	const sessionId = c.req.header("x-llm-session")?.trim();
	return sessionId ? { "x-opencode-session": sessionId } : undefined;
}
