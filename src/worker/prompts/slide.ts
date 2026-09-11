import type { Layout, SlideRequest } from "@/types/deck";

export const SLIDE_SHAPES: Record<Layout, string> = {
	title: `{ "layout": "title", "title": "string", "subtitle": "string", "notes": "string" }`,
	bullets: `{ "layout": "bullets", "kicker": "string", "title": "string", "bullets": ["string", "..."], "notes": "string" }`,
	"two-column": `{ "layout": "two-column", "kicker": "string", "title": "string", "left": { "heading": "string", "bullets": ["string", "..."] }, "right": { "heading": "string", "bullets": ["string", "..."] }, "notes": "string" }`,
	quote: `{ "layout": "quote", "title": "string", "quote": "string", "attribution": "string", "notes": "string" }`,
	stats: `{ "layout": "stats", "kicker": "string", "title": "string", "stats": [{ "value": "string", "label": "string" }], "notes": "string" }`,
	timeline: `{ "layout": "timeline", "kicker": "string", "title": "string", "steps": [{ "title": "string", "description": "string" }], "notes": "string" }`,
	section: `{ "layout": "section", "kicker": "string", "title": "string", "subtitle": "string", "notes": "string" }`,
	"image-split": `{ "layout": "image-split", "kicker": "string", "title": "string", "bullets": ["string", "..."], "caption": "string", "notes": "string" }`,
	closing: `{ "layout": "closing", "title": "string", "subtitle": "string", "cta": "string", "notes": "string" }`,
};

const SYSTEM_PROMPT = `You write the content of a single presentation slide.
You always respond with one valid JSON object and nothing else: no markdown fences, no commentary, no trailing text.

Content rules:
- Bullets are short phrases (max 10 words), start with a concrete noun or verb, and carry real information. Never pad with adjectives.
- Banned words/phrases: cutting-edge, seamless, robust, leverage, unlock, empower, game-changing, revolutionary, world-class, best-in-class, state-of-the-art, "in today's", "the future of".
- Never invent names, companies, analysts, or sources. "attribution" must be an empty string unless the user's request supplied a real quote source.
- Quote text must be 140 characters or fewer.
- For the "title" layout, "title" must be exactly the deck title and "subtitle" must be exactly the deck subtitle (or empty when there is none).
- "kicker" is a 1-3 word category label in title case (e.g. "Market Context", "Key Numbers", "Roadmap"); it is shown as a small eyebrow above the title. Never leave it as filler like "Slide" or "Overview".
- "notes" are speaker notes and are required: 2-4 conversational sentences (about 40-90 words) that add context, examples, or transitions the presenter can say out loud. Never repeat the slide text verbatim and never leave notes empty.
- When revision notes are provided, apply them precisely and keep everything else consistent with the original request.
- "timeline" slides must have 3-5 steps, each with a short title and a one-sentence description.
- "image-split" slides pair 2-5 concise bullets with a short "caption" (2-5 words) that labels the visual panel.
- "section" slides are chapter dividers: a short punchy title and one supporting sentence.
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
	];

	if (request.instruction) {
		lines.push(
			`Revision notes from the user (apply them precisely, keep everything else consistent): ${request.instruction}`,
		);
	}

	lines.push("Respond with the JSON object only.");

	return {
		system: SYSTEM_PROMPT,
		user: lines.join("\n"),
	};
}
