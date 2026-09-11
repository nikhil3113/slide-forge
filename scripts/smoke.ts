import { readFile } from "node:fs/promises";
import { OutlineSchema, SlideSchema } from "../src/types/deck";

const baseUrl = process.env.BASE_URL ?? "http://localhost:5173";
const provider = process.env.PROVIDER ?? "opencode-zen";
const model = process.env.MODEL ?? "deepseek-v4-flash";
const providerBaseUrl = process.env.PROVIDER_BASE_URL;
const topic = process.env.TOPIC ?? "Why edge computing is changing web development";
const slideCount = Number(process.env.SLIDE_COUNT ?? 5);
const testSlideIndex = Number(process.env.SLIDE_INDEX ?? 1);
const sessionId = process.env.SESSION_ID ?? `ses_slideforge_${crypto.randomUUID()}`;

const KEY_NAMES = ["LLM_KEY", "OPENCODE_API_KEY", "LLM_API_KEY"];

async function resolveApiKey(): Promise<string | undefined> {
	for (const name of KEY_NAMES) {
		const value = process.env[name]?.trim();
		if (value) return value;
	}

	for (const file of [".env.smoke", ".env.local", ".env"]) {
		try {
			const text = await readFile(file, "utf8");
			for (const line of text.split(/\r?\n/)) {
				const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
				if (!match) continue;
				const [, name, rawValue] = match;
				if (!KEY_NAMES.includes(name)) continue;
				const value = rawValue.replace(/^["']|["']$/g, "").trim();
				if (value) return value;
			}
		} catch {
			// file does not exist, keep looking
		}
	}

	return undefined;
}

const apiKey = await resolveApiKey();

if (!apiKey) {
	console.error(
		"Missing API key. Set LLM_KEY (or OPENCODE_API_KEY), or create a gitignored .env.smoke file at the project root.",
	);
	process.exit(1);
}

interface StreamOutcome {
	deltas: number;
	characters: number;
	result?: unknown;
	error?: unknown;
}

async function streamPost(path: string, body: unknown): Promise<StreamOutcome> {
	const response = await fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-llm-key": apiKey as string,
			"x-llm-session": sessionId,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`${path} -> HTTP ${response.status}: ${text.slice(0, 300)}`);
	}

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("text/event-stream")) {
		throw new Error(`${path} -> unexpected content-type: ${contentType}`);
	}
	if (response.headers.get("cache-control") !== "no-cache, no-transform") {
		throw new Error(`${path} -> missing no-transform cache header`);
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error(`${path} -> empty response body`);

	const decoder = new TextDecoder();
	const outcome: StreamOutcome = { deltas: 0, characters: 0 };
	let buffer = "";

	const handleBlock = (block: string) => {
		let event = "message";
		const dataLines: string[] = [];
		for (const line of block.split("\n")) {
			if (line.startsWith("event:")) event = line.slice(6).trim();
			else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
		}
		if (dataLines.length === 0) return;

		const data = dataLines.join("\n");
		try {
			const parsed = JSON.parse(data) as unknown;
			if (event === "delta") {
				outcome.deltas += 1;
				outcome.characters += String((parsed as { text?: string }).text ?? "").length;
			} else if (event === "result") {
				outcome.result = parsed;
			} else if (event === "error") {
				outcome.error = parsed;
			}
		} catch {
			// ignore malformed frames, the result validation will catch real problems
		}
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		let boundary = buffer.indexOf("\n\n");
		while (boundary !== -1) {
			handleBlock(buffer.slice(0, boundary));
			buffer = buffer.slice(boundary + 2);
			boundary = buffer.indexOf("\n\n");
		}
	}
	if (buffer.trim().length > 0) handleBlock(buffer);

	return outcome;
}

const providerConfig = {
	provider,
	model,
	...(providerBaseUrl ? { baseUrl: providerBaseUrl } : {}),
};

console.log(`→ ${provider} / ${model} via ${baseUrl}`);
console.log(`→ generating ${slideCount}-slide outline: "${topic}"`);

const outlineRun = await streamPost("/api/outline", {
	...providerConfig,
	topic,
	slideCount,
	theme: "midnight",
	audience: "software engineers",
	tone: "confident and practical",
});

if (outlineRun.error) {
	throw new Error(`outline stream error: ${JSON.stringify(outlineRun.error)}`);
}

const outline = OutlineSchema.parse(outlineRun.result);
console.log(
	`✓ outline received: "${outline.title}" (${outlineRun.deltas} deltas, ${outlineRun.characters} chars)`,
);
outline.slides.forEach((slide, index) => {
	console.log(`  ${index + 1}. [${slide.layout}] ${slide.title}`);
});

const target = outline.slides[testSlideIndex];
if (!target) throw new Error(`No slide at index ${testSlideIndex}`);

console.log(`→ generating slide ${testSlideIndex + 1} [${target.layout}]`);

const slideRun = await streamPost("/api/slide", {
	...providerConfig,
	outline,
	index: testSlideIndex,
});

if (slideRun.error) {
	throw new Error(`slide stream error: ${JSON.stringify(slideRun.error)}`);
}

const slide = SlideSchema.parse(slideRun.result);
console.log(
	`✓ slide received: [${slide.layout}] "${slide.title}" (${slideRun.deltas} deltas, ${slideRun.characters} chars)`,
);
console.log(JSON.stringify(slide, null, 2));
console.log("\nSMOKE TEST PASSED");
