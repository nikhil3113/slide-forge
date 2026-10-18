export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pptgen.theme";

export function getStoredTheme(): Theme | null {
	if (typeof window === "undefined") return null;
	try {
		const value = window.localStorage.getItem(THEME_STORAGE_KEY);
		return value === "light" || value === "dark" ? value : null;
	} catch {
		// storage unavailable (SSR, privacy mode); fall back to the default
		return null;
	}
}

export function getPreferredTheme(): Theme {
	return getStoredTheme() ?? "dark";
}

export function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
	document.documentElement.style.colorScheme = theme;
	window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
