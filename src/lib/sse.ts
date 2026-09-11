import type { StreamError } from "@/types/deck";

export interface SSEHandlers {
	onDelta?: (text: string) => void;
	onResult?: (data: unknown) => void;
	onError?: (error: StreamError) => void;
	signal?: AbortSignal;
}

function parseFrame(
	block: string,
): { event: string; data: string } | undefined {
	let event = "message";
	const dataLines: string[] = [];

	for (const line of block.split(/\r?\n/)) {
		if (line.length === 0 || line.startsWith(":")) continue;
		if (line.startsWith("event:")) {
			event = line.slice(6).trim();
		} else if (line.startsWith("data:")) {
			dataLines.push(line.slice(5).replace(/^ /, ""));
		}
	}

	if (dataLines.length === 0) return undefined;
	return { event, data: dataLines.join("\n") };
}

function findBoundary(buffer: string): { index: number; length: number } | null {
	const lf = buffer.indexOf("\n\n");
	const crlf = buffer.indexOf("\r\n\r\n");
	if (crlf !== -1 && (lf === -1 || crlf < lf)) {
		return { index: crlf, length: 4 };
	}
	if (lf !== -1) return { index: lf, length: 2 };
	return null;
}

export async function postSSE(
	url: string,
	body: unknown,
	headers: Record<string, string>,
	handlers: SSEHandlers,
): Promise<void> {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
		signal: handlers.signal,
	});

	if (!response.ok) {
		let message = `Request failed with status ${response.status}.`;
		try {
			const payload = (await response.json()) as { error?: string };
			if (payload.error) message = payload.error;
		} catch {
			// keep the default message
		}
		handlers.onError?.({ message, code: "provider_error" });
		return;
	}

	const reader = response.body?.getReader();
	if (!reader) {
		handlers.onError?.({
			message: "The server returned an empty response.",
			code: "internal",
		});
		return;
	}

	const decoder = new TextDecoder();
	let buffer = "";

	const dispatch = (block: string) => {
		const frame = parseFrame(block);
		if (!frame) return;

		let parsed: unknown;
		try {
			parsed = JSON.parse(frame.data);
		} catch {
			return;
		}

		if (frame.event === "delta") {
			const text = (parsed as { text?: unknown }).text;
			if (typeof text === "string") handlers.onDelta?.(text);
		} else if (frame.event === "result") {
			handlers.onResult?.(parsed);
		} else if (frame.event === "error") {
			handlers.onError?.(parsed as StreamError);
		}
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		let boundary = findBoundary(buffer);
		while (boundary) {
			dispatch(buffer.slice(0, boundary.index));
			buffer = buffer.slice(boundary.index + boundary.length);
			boundary = findBoundary(buffer);
		}
	}

	buffer += decoder.decode();
	if (buffer.trim().length > 0) dispatch(buffer);
}
