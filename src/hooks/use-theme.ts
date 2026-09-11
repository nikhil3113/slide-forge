import { useCallback, useEffect, useState } from "react";
import { applyTheme, getPreferredTheme, type Theme } from "@/lib/theme";

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => getPreferredTheme());

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
	}, []);

	const toggleTheme = useCallback(() => {
		setThemeState((current) => (current === "dark" ? "light" : "dark"));
	}, []);

	return { theme, isDark: theme === "dark", setTheme, toggleTheme };
}
