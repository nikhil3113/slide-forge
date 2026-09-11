import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatRequestSchema, ChatResponseSchema } from "@/types/chat";
import { createProvider } from "@/worker/providers";
import { buildChatPrompt } from "@/worker/prompts/chat";
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

app.post("/chat", async (c) => {
	const apiKey = readApiKey(c);
	if (!apiKey) {
		return c.json({ error: "Missing provider API key." }, 401);
	}

	const request = ChatRequestSchema.safeParse(await readJsonBody(c));
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
			const { system, user } = buildChatPrompt(request.data);
			const raw = await collectDelta(
				provider.streamChat({
					model: request.data.model,
					apiKey,
					system,
					user,
					temperature: 0.4,
					maxTokens: 1200,
					signal: controller.signal,
					headers: sessionHeaders,
				}),
				stream,
			);

			const parsed = parseWithSchema(ChatResponseSchema, raw);
			await stream.writeSSE({
				event: "result",
				data: JSON.stringify(parsed),
			});
		} catch (error) {
			await writeStreamError(stream, error);
		}
	});

	return sseHeaders(response);
});

export default app;
