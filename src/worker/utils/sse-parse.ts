export interface SSEChunk {
	event?: string;
	data: string;
}

interface Boundary {
	index: number;
	length: number;
}

function findBoundary(buffer: string): Boundary | null {
	const lf = buffer.indexOf("\n\n");
	const crlf = buffer.indexOf("\r\n\r\n");
	if (crlf !== -1 && (lf === -1 || crlf < lf)) {
		return { index: crlf, length: 4 };
	}
	if (lf !== -1) {
		return { index: lf, length: 2 };
	}
	return null;
}

function parseBlock(block: string): SSEChunk | null {
	let event: string | undefined;
	const dataLines: string[] = [];

	for (const line of block.split(/\r?\n/)) {
		if (line.length === 0 || line.startsWith(":")) continue;
		const colon = line.indexOf(":");
		const field = colon === -1 ? line : line.slice(0, colon);
		let value = colon === -1 ? "" : line.slice(colon + 1);
		if (value.startsWith(" ")) value = value.slice(1);
		if (field === "event") {
			event = value;
		} else if (field === "data") {
			dataLines.push(value);
		}
	}

	if (dataLines.length === 0) return null;
	return { event, data: dataLines.join("\n") };
}

export async function* parseSSE(
	body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<SSEChunk> {
	if (!body) return;

	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });

			let boundary = findBoundary(buffer);
			while (boundary) {
				const block = buffer.slice(0, boundary.index);
				buffer = buffer.slice(boundary.index + boundary.length);
				const chunk = parseBlock(block);
				if (chunk) yield chunk;
				boundary = findBoundary(buffer);
			}
		}

		buffer += decoder.decode();
		if (buffer.trim().length > 0) {
			const chunk = parseBlock(buffer);
			if (chunk) yield chunk;
		}
	} finally {
		reader.releaseLock();
	}
}
