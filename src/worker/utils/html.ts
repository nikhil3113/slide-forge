const MAX_HTML_LENGTH = 80000;

export class HtmlValidationError extends Error {
	readonly code = "invalid_html";

	constructor(message: string) {
		super(message);
		this.name = "HtmlValidationError";
	}
}

export function stripCodeFences(raw: string): string {
	const trimmed = raw.trim();
	const match = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
	if (match?.[1]) return match[1].trim();
	return trimmed;
}

export function extractSlideNotes(html: string): {
	html: string;
	notes: string;
} {
	const match = html.match(
		/<script[^>]*id=["']slide-notes["'][^>]*>([\s\S]*?)<\/script>/i,
	);
	if (!match) return { html, notes: "" };

	let notes = "";
	try {
		const parsed = JSON.parse(match[1]) as { notes?: unknown };
		if (typeof parsed.notes === "string") notes = parsed.notes;
	} catch {
		// malformed notes block: keep html, drop notes
	}

	return { html: html.replace(match[0], ""), notes: notes.trim() };
}

export function validateSlideHtml(html: string): void {
	if (html.length > MAX_HTML_LENGTH) {
		throw new HtmlValidationError(
			"The generated slide is too large to render (over 80KB).",
		);
	}

	const trimmed = html.trim();

	if (trimmed.length < 120) {
		throw new HtmlValidationError(
			"The model returned no slide content (it may have spent its whole output budget on internal reasoning). Retry, or switch to a faster model like glm-5.3-flash.",
		);
	}

	const declaresDocument = /<html[\s>]/i.test(trimmed);
	if (declaresDocument && !/<\/html\s*>/i.test(trimmed)) {
		throw new HtmlValidationError(
			"The generated slide was cut off before the document finished. Retry this slide, or switch to a faster model.",
		);
	}

	// Fragments are allowed, but the output must end on a complete tag.
	if (!declaresDocument && !trimmed.endsWith(">")) {
		throw new HtmlValidationError(
			"The generated slide was cut off mid-way. Retry this slide, or switch to a faster model.",
		);
	}

	const hasRoot =
		/class\s*=\s*["'][^"']*\bslide\b/i.test(trimmed) ||
		/id\s*=\s*["']slide["']/i.test(trimmed) ||
		/data-slide-root/i.test(trimmed);
	if (!hasRoot) {
		throw new HtmlValidationError(
			'The generated slide is missing its root element (expected `<section class="slide">`).',
		);
	}
}

export function sanitizeSlideHtml(html: string): string {
	let cleaned = html;

	// normalize curly quotes some models emit in HTML attributes
	cleaned = cleaned
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2018\u2019]/g, "'");

	cleaned = cleaned.replace(/<(iframe|object|embed|base|link|meta)\b[^>]*>/gi, "");
	cleaned = cleaned.replace(/<\/(iframe|object|embed)>/gi, "");
	cleaned = cleaned.replace(
		/\b(src|href)\s*=\s*["']https?:[^"']*["']/gi,
		"",
	);
	cleaned = cleaned.replace(/url\(\s*["']?https?:[^)]*\)/gi, "none");
	cleaned = cleaned.replace(/@import[^;]*;/gi, "");

	return cleaned;
}
