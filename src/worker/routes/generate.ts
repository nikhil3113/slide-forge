import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { OutlineRequestSchema, OutlineSchema } from "@/types/deck";
import { createProvider } from "@/worker/providers";
import { buildOutlinePrompt } from "@/worker/prompts/outline";
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

export default app;
