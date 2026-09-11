import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import {
	SlideHtmlRequestSchema,
	StyleGuideRequestSchema,
	StyleGuideSchema,
} from "@/types/html";
import { createProvider } from "@/worker/providers";
import { buildSlideHtmlPrompt } from "@/worker/prompts/slide-html";
import { buildStyleGuidePrompt } from "@/worker/prompts/style-guide";
import {
	extractSlideNotes,
	sanitizeSlideHtml,
	stripCodeFences,
	validateSlideHtml,
} from "@/worker/utils/html";
import { parseWithSchema } from "@/worker/utils/json";
import {
	collectDelta,
	readApiKey,
	readJsonBody,
	readSessionHeaders,
	sseHeaders,
	writeStreamError,
} from "./helpers";

const app = new Hono<{ Bindings: Env }>();

app.post("/style-guide", async (c) => {
	const apiKey = readApiKey(c);
	if (!apiKey) {
		return c.json({ error: "Missing provider API key." }, 401);
	}

	const request = StyleGuideRequestSchema.safeParse(await readJsonBody(c));
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
			const { system, user } = buildStyleGuidePrompt(request.data);
			const raw = await collectDelta(
				provider.streamChat({
					model: request.data.model,
					apiKey,
					system,
					user,
					temperature: 0.6,
					maxTokens: 1500,
					signal: controller.signal,
					headers: sessionHeaders,
				}),
				stream,
			);

			const styleGuide = parseWithSchema(StyleGuideSchema, raw);
			await stream.writeSSE({
				event: "result",
				data: JSON.stringify(styleGuide),
			});
		} catch (error) {
			await writeStreamError(stream, error);
		}
	});

	return sseHeaders(response);
});

app.post("/slide-html", async (c) => {
	const apiKey = readApiKey(c);
	if (!apiKey) {
		return c.json({ error: "Missing provider API key." }, 401);
	}

	const request = SlideHtmlRequestSchema.safeParse(await readJsonBody(c));
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
			const { system, user } = buildSlideHtmlPrompt(request.data);
			const raw = await collectDelta(
				provider.streamChat({
					model: request.data.model,
					apiKey,
					system,
					user,
					temperature: 0.65,
					maxTokens: 6000,
					signal: controller.signal,
					headers: sessionHeaders,
				}),
				stream,
			);

			const extracted = extractSlideNotes(stripCodeFences(raw));
			const cleaned = sanitizeSlideHtml(extracted.html);
			validateSlideHtml(cleaned);

			await stream.writeSSE({
				event: "result",
				data: JSON.stringify({ html: cleaned, notes: extracted.notes }),
			});
		} catch (error) {
			await writeStreamError(stream, error);
		}
	});

	return sseHeaders(response);
});

export default app;
