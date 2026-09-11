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
	if (!/class\s*=\s*["'][^"']*\bslide\b/i.test(html)) {
		throw new HtmlValidationError(
			'The generated slide is missing its root element (expected class="slide").',
		);
	}
}

export function sanitizeSlideHtml(html: string): string {
	let cleaned = html;

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
