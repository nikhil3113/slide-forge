import type { ThemeId } from "@/types/deck";

export type Motif = "glow" | "mesh" | "grid" | "waves" | "topo" | "dots";

export interface DeckTheme {
	id: ThemeId;
	label: string;
	description: string;
	mode: "dark" | "light";
	background: string;
	surface: string;
	border: string;
	text: string;
	mutedText: string;
	accent: string;
	accentText: string;
	accent2: string;
	gradient: [string, string, string];
	motifs: Motif[];
}

export const DECK_THEMES: DeckTheme[] = [
	{
		id: "midnight",
		label: "Midnight",
		description: "Dark slate with a warm red accent",
		mode: "dark",
		background: "0B0D12",
		surface: "171A21",
		border: "2A2E37",
		text: "F7F7F6",
		mutedText: "A1A1AA",
		accent: "F43F5E",
		accentText: "FFFFFF",
		accent2: "818CF8",
		gradient: ["0B0D12", "312E81", "F43F5E"],
		motifs: ["glow", "grid", "mesh"],
	},
	{
		id: "paper",
		label: "Paper",
		description: "Clean light theme with an amber accent",
		mode: "light",
		background: "FBFAF8",
		surface: "FFFFFF",
		border: "E7E5E4",
		text: "1C1917",
		mutedText: "78716C",
		accent: "B45309",
		accentText: "FFFFFF",
		accent2: "0F766E",
		gradient: ["FBFAF8", "FDE68A", "B45309"],
		motifs: ["dots", "waves", "grid"],
	},
	{
		id: "ocean",
		label: "Ocean",
		description: "Deep blue with a teal accent",
		mode: "dark",
		background: "07293D",
		surface: "0D3B54",
		border: "14506B",
		text: "E8F6F8",
		mutedText: "9CC3CF",
		accent: "2DD4BF",
		accentText: "042F2E",
		accent2: "60A5FA",
		gradient: ["041F30", "0E7490", "2DD4BF"],
		motifs: ["waves", "glow", "topo"],
	},
	{
		id: "sunset",
		label: "Sunset",
		description: "Plum mood with orange highlights",
		mode: "dark",
		background: "1E0B2E",
		surface: "2C1340",
		border: "46215C",
		text: "FDF2F8",
		mutedText: "C4A6CC",
		accent: "FB923C",
		accentText: "431407",
		accent2: "E879F9",
		gradient: ["1E0B2E", "7C2D6B", "FB923C"],
		motifs: ["mesh", "glow", "waves"],
	},
	{
		id: "forest",
		label: "Forest",
		description: "Deep green with a mint accent",
		mode: "dark",
		background: "0B1F16",
		surface: "123326",
		border: "1D4A35",
		text: "ECFDF4",
		mutedText: "9CC9B2",
		accent: "34D399",
		accentText: "022C22",
		accent2: "A3E635",
		gradient: ["0B1F16", "115E45", "34D399"],
		motifs: ["topo", "dots", "grid"],
	},
	{
		id: "nebula",
		label: "Nebula",
		description: "Indigo space with cyan and violet glow",
		mode: "dark",
		background: "0A0A1A",
		surface: "151530",
		border: "27274A",
		text: "EEF2FF",
		mutedText: "A5B4FC",
		accent: "22D3EE",
		accentText: "083344",
		accent2: "A855F7",
		gradient: ["0A0A1A", "4C1D95", "22D3EE"],
		motifs: ["glow", "mesh", "dots"],
	},
	{
		id: "linen",
		label: "Linen",
		description: "Warm light neutral with ink teal accents",
		mode: "light",
		background: "F6F3EE",
		surface: "FFFFFF",
		border: "E4DED4",
		text: "292524",
		mutedText: "78716C",
		accent: "115E59",
		accentText: "FFFFFF",
		accent2: "C2410C",
		gradient: ["F6F3EE", "FDE8D7", "115E59"],
		motifs: ["grid", "topo", "dots"],
	},
];

export const DEFAULT_THEME_ID: ThemeId = "midnight";

export function getTheme(id: ThemeId): DeckTheme {
	return DECK_THEMES.find((theme) => theme.id === id) ?? DECK_THEMES[0];
}

export function toCssColor(hex: string): string {
	return hex.startsWith("#") ? hex : `#${hex}`;
}

export function cssBackground(theme: DeckTheme): string {
	const [from, mid, to] = theme.gradient;
	return [
		`radial-gradient(120% 90% at 85% 15%, ${toCssColor(to)}33 0%, transparent 60%)`,
		`radial-gradient(100% 80% at 10% 90%, ${toCssColor(theme.accent2)}26 0%, transparent 55%)`,
		`linear-gradient(135deg, ${toCssColor(from)} 0%, ${toCssColor(mid)} 55%, ${toCssColor(from)} 100%)`,
	].join(", ");
}
