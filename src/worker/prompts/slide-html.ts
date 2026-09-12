import type { SlideHtmlRequest } from "@/types/html";
import { CSS_TOKEN_NAMES } from "@/types/html";

const TOKEN_LIST = CSS_TOKEN_NAMES.join(", ");

const SYSTEM_PROMPT = `You are a presentation designer who writes one slide as a complete standalone HTML document.
You always respond with a single HTML document and nothing else: no markdown fences, no commentary before or after.

Hard requirements:
- The document contains exactly one root element with class "slide": <section class="slide"> ... </section>.
- The .slide element is exactly 1280px by 720px, position relative, overflow hidden. Everything is inside it.
- All colors and fonts come from injected CSS variables. Never hardcode hex/rgb colors. Available variables: ${TOKEN_LIST}. Use color-mix(in oklab, var(--slide-accent) 15%, transparent) for tints.
- The footer (bottom of the slide) shows the deck title via var(--deck-title) and the page number text provided in the brief.
- No external resources of any kind: no http(s) URLs, no @import, no remote fonts or images. Inline SVG and data: URIs are allowed.
- Use font-family: var(--slide-font). Minimum sizes at 1280x720: body 24px, caption 20px, kicker 16px, slide title 48px.
- Keep every content margin at least 64px from the slide edges. Never let text overflow the 1280x720 box.
- Inline <script> is allowed only to draw charts or diagrams with canvas/SVG. Scripts must finish within 2 seconds, must not use network APIs, alerts, or timers longer than 1.5s. If you draw with JS, either finish synchronously or set window.__slideReady to a Promise that resolves when drawing is complete.
- End the document with the speaker notes in exactly this form: <script type="application/json" id="slide-notes">{"notes":"..."}</script> where the value is 2-4 conversational sentences (40-90 words) of speaker notes. Escape the JSON string properly.
- Keep the whole document under 40KB. Write clean, readable CSS. No CSS animations that move content permanently; a static final state is required.

Design rules:
- Follow the deck style guide exactly for type scale, spacing, panels, charts, and color usage.
- The slide must look designed, not like a web page: strong hierarchy, deliberate whitespace, one clear focal point.
- No lorem ipsum, no TODO placeholders. All content comes from the brief.
- Banned words: cutting-edge, seamless, robust, leverage, unlock, empower, game-changing, revolutionary, world-class, best-in-class, "in today's", "the future of".`;

export function buildSlideHtmlPrompt(request: SlideHtmlRequest): {
	system: string;
	user: string;
} {
	const { outline, index, styleGuide, instruction, previousHtml } = request;
	const target = outline.slides[index];
	if (!target) {
		throw new Error(`Slide index ${index} is out of range`);
	}

	const total = outline.slides.length;
	const previous = outline.slides[index - 1]?.title;
	const next = outline.slides[index + 1]?.title;

	const lines = [
		`Deck title: ${outline.title}`,
		outline.subtitle ? `Deck subtitle: ${outline.subtitle}` : "",
		`Slide ${index + 1} of ${total}. Use "${index + 1} / ${total}" as the page number in the footer.`,
		previous ? `Previous slide: ${previous}` : "",
		next ? `Next slide: ${next}` : "",
		"",
		"Style guide (must follow):",
		styleGuide.guide,
		"",
		`This slide — title: ${target.title}`,
		`Layout direction: ${target.layout}`,
		`Content brief: ${target.summary}`,
	];

	if (instruction) {
		lines.push(
			"",
			`Revision request (apply precisely, keep the rest consistent): ${instruction}`,
		);
	}

	if (previousHtml) {
		lines.push(
			"",
			"Previous version of this slide's HTML (rewrite it, do not repeat mistakes):",
			previousHtml.slice(0, 40000),
		);
	}

	lines.push("", "Write the complete HTML document now.");

	return {
		system: SYSTEM_PROMPT,
		user: lines.filter((line) => line !== "").join("\n"),
	};
}
