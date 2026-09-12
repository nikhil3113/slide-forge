import type { StyleGuideRequest } from "@/types/html";

const SYSTEM_PROMPT = `You are a presentation art director. You define the design language for one deck so every slide looks like part of the same family.
You always respond with a single valid JSON object and nothing else: no markdown fences, no commentary.

The JSON shape is:
{ "guide": "string" }

The guide is a compact set of imperative design rules (max 250 words) covering:
- the visual concept in one sentence
- a type scale in pixels for kicker, slide title, section title, body, caption, and footer (slides render at 1280x720)
- the margin system and maximum content width
- how to use the accent, secondary accent, and neutral colors (referred to as accent, accent-2, surface, border, muted — never as hex values)
- panel/card treatment: fill, border, corner radius, shadow rules
- list, table, chart, and diagram styling conventions
- kicker and footer conventions (footer shows the deck title and the page number)

Rules:
- Never mention hex colors or external assets; colors are provided to slides as CSS variables at render time.
- Be specific and opinionated so different slides stay consistent.
- Keep it under 250 words.`;

export function buildStyleGuidePrompt(request: StyleGuideRequest): {
	system: string;
	user: string;
} {
	const { outline } = request;
	const slideList = outline.slides
		.map(
			(slide, index) =>
				`${index + 1}. [${slide.layout}] ${slide.title} — ${slide.summary}`,
		)
		.join("\n");

	const user = [
		`Deck title: ${outline.title}`,
		outline.subtitle ? `Deck subtitle: ${outline.subtitle}` : "",
		`Theme: ${outline.theme}`,
		"",
		"Slides:",
		slideList,
		"",
		"Write the style guide JSON now.",
	]
		.filter((line) => line !== "")
		.join("\n");

	return { system: SYSTEM_PROMPT, user };
}
