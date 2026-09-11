import { THEME_IDS, type OutlineRequest } from "@/types/deck";

const SYSTEM_PROMPT = `You are a senior presentation strategist who plans slide decks for professionals.
You always respond with a single valid JSON object and nothing else: no markdown fences, no commentary, no trailing text.

The JSON must match this exact shape:
{
  "title": "string - the deck title",
  "subtitle": "string - a short subtitle or tagline",
  "theme": ${THEME_IDS.map((theme) => `"${theme}"`).join(" | ")},
  "slides": [
    {
      "title": "string - slide headline",
      "summary": "string - one sentence describing what this slide covers",
      "layout": "title" | "bullets" | "two-column" | "quote" | "stats" | "closing"
    }
  ]
}

Layout rules:
- The first slide must use layout "title" (the deck opener).
- The last slide must use layout "closing" (takeaways or next steps).
- "bullets": a standard content slide with 3-6 key points.
- "two-column": compares two ideas, options, or pros and cons.
- "quote": a memorable quote or a bold one-liner.
- "stats": quantitative highlights (2-4 numbers).
- For decks longer than 6 slides, use at least three different layouts besides "title" and "closing".
- Slide titles are short, specific, and never repeat the deck title verbatim.
- The "summary" guides a later model that writes the full slide, so describe the actual content, not generic filler.`;

export function buildOutlinePrompt(request: OutlineRequest): {
	system: string;
	user: string;
} {
	const lines = [
		`Create a ${request.slideCount}-slide presentation outline about: ${request.topic}`,
		request.audience ? `Target audience: ${request.audience}` : "",
		request.tone ? `Desired tone: ${request.tone}` : "",
		`Use the visual theme "${request.theme}".`,
		`The "slides" array must contain exactly ${request.slideCount} entries.`,
		"Respond with the JSON object only.",
	];

	return {
		system: SYSTEM_PROMPT,
		user: lines.filter((line) => line.length > 0).join("\n"),
	};
}
