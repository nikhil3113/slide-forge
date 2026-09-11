import type { ThemeId } from "@/types/deck";

export interface DeckTheme {
	id: ThemeId;
	label: string;
	description: string;
	background: string;
	surface: string;
	border: string;
	text: string;
	mutedText: string;
	accent: string;
	accentText: string;
}

export const DECK_THEMES: DeckTheme[] = [
	{
		id: "midnight",
		label: "Midnight",
		description: "Dark slate with a warm red accent",
		background: "0B0D12",
		surface: "171A21",
		border: "2A2E37",
		text: "F7F7F6",
		mutedText: "A1A1AA",
		accent: "F43F5E",
		accentText: "FFFFFF",
	},
	{
		id: "paper",
		label: "Paper",
		description: "Clean light theme with an amber accent",
		background: "FBFAF8",
		surface: "FFFFFF",
		border: "E7E5E4",
		text: "1C1917",
		mutedText: "78716C",
		accent: "B45309",
		accentText: "FFFFFF",
	},
	{
		id: "ocean",
		label: "Ocean",
		description: "Deep blue with a teal accent",
		background: "07293D",
		surface: "0D3B54",
		border: "14506B",
		text: "E8F6F8",
		mutedText: "9CC3CF",
		accent: "2DD4BF",
		accentText: "042F2E",
	},
	{
		id: "sunset",
		label: "Sunset",
		description: "Plum gradient mood with orange highlights",
		background: "1E0B2E",
		surface: "2C1340",
		border: "46215C",
		text: "FDF2F8",
		mutedText: "C4A6CC",
		accent: "FB923C",
		accentText: "431407",
	},
	{
		id: "forest",
		label: "Forest",
		description: "Deep green with a mint accent",
		background: "0B1F16",
		surface: "123326",
		border: "1D4A35",
		text: "ECFDF4",
		mutedText: "9CC9B2",
		accent: "34D399",
		accentText: "022C22",
	},
];

export const DEFAULT_THEME_ID: ThemeId = "midnight";

export function getTheme(id: ThemeId): DeckTheme {
	return DECK_THEMES.find((theme) => theme.id === id) ?? DECK_THEMES[0];
}

export function toCssColor(hex: string): string {
	return hex.startsWith("#") ? hex : `#${hex}`;
}
