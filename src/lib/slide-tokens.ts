import type { DeckTheme } from "./themes";

function cssString(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\r?\n/g, " ")
		.slice(0, 200);
}

export function slideTokensCss(theme: DeckTheme, deckTitle: string): string {
	const vars: Record<string, string> = {
		"--slide-bg": `#${theme.background}`,
		"--slide-surface": `#${theme.surface}`,
		"--slide-border": `#${theme.border}`,
		"--slide-text": `#${theme.text}`,
		"--slide-muted": `#${theme.mutedText}`,
		"--slide-accent": `#${theme.accent}`,
		"--slide-accent-2": `#${theme.accent2}`,
		"--slide-accent-text": `#${theme.accentText}`,
		"--slide-font": "'Segoe UI', system-ui, -apple-system, sans-serif",
		"--deck-title": `"${cssString(deckTitle)}"`,
	};

	const declarations = Object.entries(vars)
		.map(([name, value]) => `${name}:${value} !important`)
		.join(";");

	return [
		`:root{${declarations}}`,
		"html,body{margin:0;padding:0;background:var(--slide-bg)}",
		"*,*::before,*::after{box-sizing:border-box}",
		".slide{width:1280px;height:720px;overflow:hidden;position:relative;background:var(--slide-bg);color:var(--slide-text);font-family:var(--slide-font)}",
	].join("\n");
}
