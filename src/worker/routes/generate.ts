import { Hono, type Context } from "hono";
import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import {
	OutlineRequestSchema,
	OutlineSchema,
	SlideRequestSchema,
	SlideSchema,
	type StreamError,
} from "@/types/deck";
import { createProvider } from "@/worker/providers";
import { ProviderError } from "@/worker/providers/types";
import { buildOutlinePrompt } from "@/worker/prompts/outline";
import { buildSlidePrompt } from "@/worker/prompts/slide";
import { JsonValidationError, parseWithSchema } from "@/worker/utils/json";

const app = new Hono<{ Bindings: Env }>();

function toStreamError(error: unknown): StreamError {
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

async function writeStreamError(stream: SSEStreamingApi, error: unknown) {
	await stream.writeSSE({
		event: "error",
		data: JSON.stringify(toStreamError(error)),
	});
}

async function collectDelta(
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

function sseHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", "no-cache, no-transform");
	headers.set("X-Accel-Buffering", "no");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

async function readJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		return null;
	}
}

function readApiKey(c: Context): string | undefined {
	const key = c.req.header("x-llm-key")?.trim();
	return key && key.length > 0 ? key : undefined;
}

function readSessionHeaders(c: Context): Record<string, string> | undefined {
	const sessionId = c.req.header("x-llm-session")?.trim();
	return sessionId ? { "x-opencode-session": sessionId } : undefined;
}

app.post("/outline", async (c) => {
	const apiKey = readApiKey(c);
	if (!apiKey) {
		return c.json({ error: "Missing provider API key." }, 401);
	}

	const request = OutlineRequestSchema.safeParse(await readJsonBody(c));
	if (!request.success) {
		return c.json(
			{
				error: "Invalid request body.",
				issues: request.error.issues.map((issue) => issue.message),
			},
			400,
		);
	}

	const sessionHeaders = readSessionHeaders(c);

	const response = streamSSE(c, async (stream) => {
		const controller = new AbortController();
		stream.onAbort(() => controller.abort());

		try {
			const provider = createProvider(request.data);
			const { system, user } = buildOutlinePrompt(request.data);
			const raw = await collectDelta(
				provider.streamChat({
					model: request.data.model,
					apiKey,
					system,
					user,
					temperature: 0.7,
					maxTokens: 4096,
					signal: controller.signal,
					headers: sessionHeaders,
				}),
				stream,
			);

			const outline = parseWithSchema(OutlineSchema, raw);
			await stream.writeSSE({
				event: "result",
				data: JSON.stringify(outline),
			});
		} catch (error) {
			await writeStreamError(stream, error);
		}
	});

	return sseHeaders(response);
});

app.post("/slide", async (c) => {
	const apiKey = readApiKey(c);
	if (!apiKey) {
		return c.json({ error: "Missing provider API key." }, 401);
	}

	const request = SlideRequestSchema.safeParse(await readJsonBody(c));
	if (!request.success) {
		return c.json(
			{
				error: "Invalid request body.",
				issues: request.error.issues.map((issue) => issue.message),
			},
			400,
		);
	}

	const response = streamSSE(c, async (stream) => {
		const controller = new AbortController();
		stream.onAbort(() => controller.abort());

		try {
			const provider = createProvider(request.data);
			const { system, user } = buildSlidePrompt(request.data);
			const raw = await collectDelta(
				provider.streamChat({
					model: request.data.model,
					apiKey,
					system,
					user,
					temperature: 0.7,
					maxTokens: 2048,
					signal: controller.signal,
					headers: readSessionHeaders(c),
				}),
				stream,
			);

			const slide = parseWithSchema(SlideSchema, raw);
			await stream.writeSSE({
				event: "result",
				data: JSON.stringify(slide),
			});
		} catch (error) {
			await writeStreamError(stream, error);
		}
	});

	return sseHeaders(response);
});

export default app;
