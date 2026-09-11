import type { Layout, SlideRequest } from "@/types/deck";

export const SLIDE_SHAPES: Record<Layout, string> = {
	title: `{ "layout": "title", "title": "string", "subtitle": "string", "notes": "string" }`,
	bullets: `{ "layout": "bullets", "title": "string", "bullets": ["string", "..."], "notes": "string" }`,
	"two-column": `{ "layout": "two-column", "title": "string", "left": { "heading": "string", "bullets": ["string", "..."] }, "right": { "heading": "string", "bullets": ["string", "..."] }, "notes": "string" }`,
	quote: `{ "layout": "quote", "title": "string", "quote": "string", "attribution": "string", "notes": "string" }`,
	stats: `{ "layout": "stats", "title": "string", "stats": [{ "value": "string", "label": "string" }], "notes": "string" }`,
	closing: `{ "layout": "closing", "title": "string", "subtitle": "string", "cta": "string", "notes": "string" }`,
};

const SYSTEM_PROMPT = `You write the content of a single presentation slide.
You always respond with one valid JSON object and nothing else: no markdown fences, no commentary, no trailing text.

Content rules:
- Bullets are short phrases (max 12 words), parallel in structure, and information-dense.
- "notes" are speaker notes: 2-4 conversational sentences that add context, examples, or transitions. Never repeat the slide text verbatim.
- Match the requested layout exactly and follow its JSON shape.
- Never invent a different layout field value.`;

export function buildSlidePrompt(request: SlideRequest): {
	system: string;
	user: string;
} {
	const { outline, index } = request;
	const target = outline.slides[index];
	if (!target) {
		throw new Error(`Slide index ${index} is out of range`);
	}

	const total = outline.slides.length;
	const previous = outline.slides[index - 1]?.title;
	const next = outline.slides[index + 1]?.title;

	const context = [
		`Deck title: ${outline.title}`,
		outline.subtitle ? `Deck subtitle: ${outline.subtitle}` : "",
		previous ? `Previous slide: ${previous}` : "",
		next ? `Next slide: ${next}` : "",
	].filter((line) => line.length > 0);

	const lines = [
		...context,
		"",
		`Write slide ${index + 1} of ${total}.`,
		`Slide title: ${target.title}`,
		`What this slide must cover: ${target.summary}`,
		`Requested layout: "${target.layout}"`,
		"",
		`Required JSON shape for this layout: ${SLIDE_SHAPES[target.layout]}`,
		"Respond with the JSON object only.",
	];

	return {
		system: SYSTEM_PROMPT,
		user: lines.join("\n"),
	};
}
