import type { ThemeId } from "@/types/deck";

export type Motif = "field" | "grid" | "arc" | "bands" | "topo" | "dots";

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
		description: "Near-black slate with a warm red accent",
		mode: "dark",
		background: "0B0D12",
		surface: "151821",
		border: "262A35",
		text: "F7F7F6",
		mutedText: "A1A1AA",
		accent: "E11D48",
		accentText: "FFFFFF",
		accent2: "818CF8",
		gradient: ["0B0D12", "161B2C", "E11D48"],
		motifs: ["arc", "field", "grid"],
	},
	{
		id: "paper",
		label: "Paper",
		description: "Warm off-white with an ink amber accent",
		mode: "light",
		background: "FBFAF8",
		surface: "FFFFFF",
		border: "E5E1DA",
		text: "1C1917",
		mutedText: "6B6560",
		accent: "B45309",
		accentText: "FFFFFF",
		accent2: "0F766E",
		gradient: ["FBFAF8", "F2EBE0", "B45309"],
		motifs: ["field", "grid", "dots"],
	},
	{
		id: "ocean",
		label: "Ocean",
		description: "Deep navy with a teal accent",
		mode: "dark",
		background: "041F30",
		surface: "0A2C41",
		border: "123F58",
		text: "E8F6F8",
		mutedText: "93B8C4",
		accent: "2DD4BF",
		accentText: "042F2E",
		accent2: "60A5FA",
		gradient: ["041F30", "0A3348", "2DD4BF"],
		motifs: ["bands", "field", "topo"],
	},
	{
		id: "sunset",
		label: "Sunset",
		description: "Deep plum with an orange accent",
		mode: "dark",
		background: "1B0A29",
		surface: "2A1138",
		border: "3F1D51",
		text: "FDF2F8",
		mutedText: "C0A3C8",
		accent: "F97316",
		accentText: "431407",
		accent2: "E879F9",
		gradient: ["1B0A29", "37204A", "F97316"],
		motifs: ["arc", "field", "bands"],
	},
	{
		id: "forest",
		label: "Forest",
		description: "Deep green with a mint accent",
		mode: "dark",
		background: "0A1D14",
		surface: "112C20",
		border: "1B4231",
		text: "ECFDF4",
		mutedText: "93BFA9",
		accent: "34D399",
		accentText: "022C22",
		accent2: "A3E635",
		gradient: ["0A1D14", "143527", "34D399"],
		motifs: ["topo", "field", "dots"],
	},
	{
		id: "nebula",
		label: "Nebula",
		description: "Indigo space with cyan accents",
		mode: "dark",
		background: "0A0A1A",
		surface: "141428",
		border: "27274A",
		text: "EEF2FF",
		mutedText: "A0A8CC",
		accent: "22D3EE",
		accentText: "083344",
		accent2: "A855F7",
		gradient: ["0A0A1A", "1B1740", "22D3EE"],
		motifs: ["arc", "field", "grid"],
	},
	{
		id: "linen",
		label: "Linen",
		description: "Warm neutral with ink teal accents",
		mode: "light",
		background: "F6F3EE",
		surface: "FFFFFF",
		border: "E2DCD1",
		text: "292524",
		mutedText: "6E6862",
		accent: "115E59",
		accentText: "FFFFFF",
		accent2: "C2410C",
		gradient: ["F6F3EE", "EDE3D4", "115E59"],
		motifs: ["grid", "field", "topo"],
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
		`radial-gradient(90% 70% at 88% 10%, ${toCssColor(to)}1f 0%, transparent 55%)`,
		`linear-gradient(165deg, ${toCssColor(from)} 0%, ${toCssColor(mid)} 100%)`,
	].join(", ");
}
