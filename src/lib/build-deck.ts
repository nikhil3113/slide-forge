import type { Deck, Slide } from "@/types/deck";
import {
	renderBackground,
	renderIcon,
	renderPanelArt,
	type IconName,
} from "./deck-art";
import { getTheme, type DeckTheme, type Motif } from "./themes";

type PptxInstance = InstanceType<(typeof import("pptxgenjs"))["default"]>;
type PptxSlide = ReturnType<PptxInstance["addSlide"]>;

const FONT = "Segoe UI";
const SERIF = "Georgia";
const PAGE_W = 13.33;
const PAGE_H = 7.5;
const MARGIN = 0.72;
const CONTENT_W = PAGE_W - MARGIN * 2;

const c = (value: string) => `#${value}`;
const pad = (value: number) => String(value).padStart(2, "0");

interface SlideContext {
	index: number;
	total: number;
	deckTitle: string;
}

function addBackground(
	slide: PptxSlide,
	theme: DeckTheme,
	motif: Motif,
	variant: number,
): void {
	const data = renderBackground(theme.id, motif, variant);
	if (data) {
		slide.background = { data };
	} else {
		slide.background = { color: theme.background };
	}
}

function posterMotif(theme: DeckTheme, choice: number): Motif {
	return theme.motifs[choice % theme.motifs.length] ?? "glow";
}

function contentMotif(theme: DeckTheme, index: number): Motif {
	if (theme.motifs.length < 2) return theme.motifs[0] ?? "grid";
	return theme.motifs[1 + (index % (theme.motifs.length - 1))];
}

function addBrandMark(slide: PptxSlide, theme: DeckTheme, label: string): void {
	slide.addShape("roundRect", {
		x: MARGIN,
		y: 0.48,
		w: 0.16,
		h: 0.16,
		rectRadius: 0.04,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
	slide.addText(label.toUpperCase(), {
		x: MARGIN + 0.3,
		y: 0.38,
		w: 8,
		h: 0.34,
		fontFace: FONT,
		fontSize: 9,
		bold: true,
		color: theme.mutedText,
		charSpacing: 2.2,
		valign: "middle",
	});
}

function addFooter(
	slide: PptxSlide,
	theme: DeckTheme,
	context: SlideContext,
): void {
	slide.addShape("rect", {
		x: MARGIN,
		y: PAGE_H - 0.58,
		w: CONTENT_W,
		h: 0.012,
		fill: { color: theme.border },
		line: { color: theme.border, width: 0 },
	});
	slide.addText(context.deckTitle, {
		x: MARGIN,
		y: PAGE_H - 0.52,
		w: 9,
		h: 0.3,
		fontFace: FONT,
		fontSize: 8,
		color: theme.mutedText,
		charSpacing: 1.4,
		valign: "middle",
	});
	slide.addText(`${pad(context.index + 1)} / ${pad(context.total)}`, {
		x: PAGE_W - MARGIN - 2.2,
		y: PAGE_H - 0.52,
		w: 2.2,
		h: 0.3,
		fontFace: FONT,
		fontSize: 8,
		color: theme.mutedText,
		align: "right",
		charSpacing: 1.4,
		valign: "middle",
	});
}

function addHeader(
	slide: PptxSlide,
	theme: DeckTheme,
	kicker: string,
	title: string,
): void {
	if (kicker) {
		slide.addText(kicker.toUpperCase(), {
			x: MARGIN,
			y: 0.52,
			w: CONTENT_W,
			h: 0.3,
			fontFace: FONT,
			fontSize: 10,
			bold: true,
			color: theme.accent,
			charSpacing: 2.4,
			valign: "middle",
		});
	}
	slide.addText(title, {
		x: MARGIN,
		y: 0.86,
		w: CONTENT_W - 1.2,
		h: 0.78,
		fontFace: FONT,
		fontSize: 25,
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	slide.addShape("rect", {
		x: MARGIN,
		y: 1.74,
		w: 1.05,
		h: 0.062,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
}

function addPanel(
	slide: PptxSlide,
	theme: DeckTheme,
	x: number,
	y: number,
	w: number,
	h: number,
	radius = 0.12,
): void {
	slide.addShape("roundRect", {
		x,
		y,
		w,
		h,
		rectRadius: radius,
		fill: {
			color: theme.surface,
			transparency: theme.mode === "dark" ? 32 : 6,
		},
		line: { color: theme.border, transparency: 35, width: 1 },
		shadow: {
			type: "outer",
			color: "000000",
			opacity: theme.mode === "dark" ? 0.35 : 0.14,
			blur: 16,
			offset: 5,
			angle: 90,
		},
	});
}

function addIconBadge(
	slide: PptxSlide,
	theme: DeckTheme,
	icon: IconName,
	x: number,
	y: number,
	size = 0.78,
): void {
	slide.addShape("roundRect", {
		x,
		y,
		w: size,
		h: size,
		rectRadius: size / 3,
		fill: { color: theme.accent, transparency: 84 },
		line: { color: theme.accent, transparency: 55, width: 1 },
	});
	const iconData = renderIcon(icon, c(theme.accent), 112);
	if (iconData) {
		const inset = size * 0.23;
		slide.addImage({
			data: iconData,
			x: x + inset,
			y: y + inset,
			w: size - inset * 2,
			h: size - inset * 2,
		});
	}
}

function addBullets(
	slide: PptxSlide,
	theme: DeckTheme,
	bullets: string[],
	x: number,
	y: number,
	w: number,
	h: number,
	fontSize = 15,
): void {
	slide.addText(
		bullets.map((text) => ({
			text,
			options: { bullet: { code: "2022" }, breakLine: true },
		})),
		{
			x,
			y,
			w,
			h,
			fontFace: FONT,
			fontSize,
			color: theme.text,
			lineSpacingMultiple: 1.28,
			paraSpaceAfter: 9,
			valign: "top",
		},
	);
}

function valueBarWidth(value: string): number {
	let hash = 0;
	for (const char of value) {
		hash = (hash * 31 + char.charCodeAt(0)) % 997;
	}
	return 0.45 + (hash % 50) / 100;
}

function renderTitle(
	slide: PptxSlide,
	data: Slide & { layout: "title" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, posterMotif(theme, 0), context.index);
	addBrandMark(slide, theme, context.deckTitle);

	const watermark = renderIcon("layers", c(theme.accent2), 160);
	if (watermark) {
		slide.addImage({
			data: watermark,
			x: 9.2,
			y: 3.5,
			w: 3.4,
			h: 3.4,
			transparency: 86,
		});
	}

	slide.addShape("rect", {
		x: MARGIN + 0.05,
		y: 2.35,
		w: 1.35,
		h: 0.09,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
	slide.addText(data.title, {
		x: MARGIN + 0.05,
		y: 2.72,
		w: CONTENT_W - 1.4,
		h: 1.65,
		fontFace: FONT,
		fontSize: 43,
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	if (data.subtitle) {
		slide.addText(data.subtitle, {
			x: MARGIN + 0.05,
			y: 4.42,
			w: CONTENT_W - 2.4,
			h: 0.9,
			fontFace: FONT,
			fontSize: 18,
			color: theme.mutedText,
			valign: "top",
		});
	}
}

function renderSection(
	slide: PptxSlide,
	data: Slide & { layout: "section" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, posterMotif(theme, 1), context.index + 7);

	slide.addText(pad(context.index + 1), {
		x: PAGE_W - MARGIN - 4.4,
		y: 1.2,
		w: 4.4,
		h: 4.6,
		fontFace: FONT,
		fontSize: 200,
		bold: true,
		color: theme.accent,
		align: "right",
		valign: "middle",
		transparency: 78,
	});

	const kicker = data.kicker || `SECTION ${pad(context.index + 1)}`;
	slide.addText(kicker.toUpperCase(), {
		x: MARGIN + 0.05,
		y: 2.55,
		w: CONTENT_W - 3,
		h: 0.34,
		fontFace: FONT,
		fontSize: 11,
		bold: true,
		color: theme.accent,
		charSpacing: 2.6,
		valign: "middle",
	});
	slide.addText(data.title, {
		x: MARGIN + 0.05,
		y: 2.95,
		w: CONTENT_W - 3,
		h: 1.3,
		fontFace: FONT,
		fontSize: 38,
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	slide.addShape("rect", {
		x: MARGIN + 0.05,
		y: 4.38,
		w: 1.2,
		h: 0.075,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
	if (data.subtitle) {
		slide.addText(data.subtitle, {
			x: MARGIN + 0.05,
			y: 4.62,
			w: CONTENT_W - 3.4,
			h: 0.8,
			fontFace: FONT,
			fontSize: 16,
			color: theme.mutedText,
			valign: "top",
		});
	}
}

function renderBullets(
	slide: PptxSlide,
	data: Slide & { layout: "bullets" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme, context.index), context.index);

	slide.addText((data.kicker || "Overview").toUpperCase(), {
		x: MARGIN,
		y: 1.9,
		w: 4.2,
		h: 0.3,
		fontFace: FONT,
		fontSize: 10,
		bold: true,
		color: theme.accent,
		charSpacing: 2.4,
		valign: "middle",
	});
	slide.addText(data.title, {
		x: MARGIN,
		y: 2.24,
		w: 4.3,
		h: 2.2,
		fontFace: FONT,
		fontSize: 27,
		bold: true,
		color: theme.text,
		valign: "top",
	});
	slide.addShape("rect", {
		x: MARGIN,
		y: 4.62,
		w: 1.0,
		h: 0.065,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
	addIconBadge(slide, theme, "check", MARGIN, 5.05);

	const panelX = MARGIN + 4.55;
	const panelW = PAGE_W - MARGIN - panelX;
	addPanel(slide, theme, panelX, 1.9, panelW, 4.52);
	addBullets(
		slide,
		theme,
		data.bullets,
		panelX + 0.5,
		2.25,
		panelW - 1.0,
		3.95,
		16,
	);
	addFooter(slide, theme, context);
}

function renderTwoColumn(
	slide: PptxSlide,
	data: Slide & { layout: "two-column" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme, context.index), context.index);
	addHeader(slide, theme, data.kicker, data.title);

	const gap = 0.4;
	const width = (CONTENT_W - gap) / 2;
	const columns = [data.left, data.right];

	columns.forEach((column, index) => {
		const x = MARGIN + index * (width + gap);
		addPanel(slide, theme, x, 2.05, width, 4.35);
		slide.addShape("rect", {
			x: x + 0.42,
			y: 2.42,
			w: 0.42,
			h: 0.055,
			fill: {
				color: index === 0 ? theme.accent : theme.accent2,
			},
			line: { color: theme.accent, width: 0 },
		});
		slide.addText(column.heading, {
			x: x + 0.4,
			y: 2.56,
			w: width - 0.8,
			h: 0.55,
			fontFace: FONT,
			fontSize: 19,
			bold: true,
			color: theme.text,
			valign: "middle",
		});
		addBullets(
			slide,
			theme,
			column.bullets,
			x + 0.42,
			3.22,
			width - 0.84,
			2.95,
			14,
		);
	});

	addFooter(slide, theme, context);
}

function renderQuote(
	slide: PptxSlide,
	data: Slide & { layout: "quote" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, posterMotif(theme, 2), context.index + 3);

	slide.addText("\u201C", {
		x: MARGIN,
		y: 0.55,
		w: 2.2,
		h: 2.0,
		fontFace: SERIF,
		fontSize: 130,
		bold: true,
		color: theme.accent,
	});
	if (data.title) {
		slide.addText(data.title.toUpperCase(), {
			x: MARGIN + 2.6,
			y: 0.95,
			w: CONTENT_W - 2.6,
			h: 0.34,
			fontFace: FONT,
			fontSize: 10,
			bold: true,
			color: theme.mutedText,
			charSpacing: 2.6,
			valign: "middle",
		});
	}
	slide.addText(data.quote, {
		x: MARGIN + 1.3,
		y: 2.05,
		w: CONTENT_W - 1.3,
		h: 2.9,
		fontFace: FONT,
		fontSize: 29,
		italic: true,
		color: theme.text,
		valign: "middle",
	});
	if (data.attribution) {
		slide.addShape("rect", {
			x: MARGIN + 1.3,
			y: 5.15,
			w: 0.55,
			h: 0.05,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
		});
		slide.addText(data.attribution, {
			x: MARGIN + 2.0,
			y: 4.98,
			w: CONTENT_W - 2.0,
			h: 0.4,
			fontFace: FONT,
			fontSize: 14,
			color: theme.mutedText,
			valign: "middle",
		});
	}
	addFooter(slide, theme, context);
}

function renderStats(
	slide: PptxSlide,
	data: Slide & { layout: "stats" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme, context.index), context.index);
	addHeader(slide, theme, data.kicker || "Key numbers", data.title);

	const gap = 0.32;
	const count = data.stats.length;
	const width = (CONTENT_W - gap * (count - 1)) / count;
	const icons: IconName[] = ["growth", "bolt", "target", "clock"];

	data.stats.forEach((stat, index) => {
		const x = MARGIN + index * (width + gap);
		addPanel(slide, theme, x, 2.1, width, 4.2);
		addIconBadge(slide, theme, icons[index % icons.length], x + 0.4, 2.5, 0.7);

		slide.addText(stat.value, {
			x: x + 0.3,
			y: 3.35,
			w: width - 0.6,
			h: 1.2,
			fontFace: FONT,
			fontSize: 37,
			bold: true,
			color: theme.accent,
			align: "left",
			valign: "middle",
		});
		slide.addText(stat.label, {
			x: x + 0.32,
			y: 4.55,
			w: width - 0.64,
			h: 0.9,
			fontFace: FONT,
			fontSize: 13,
			color: theme.mutedText,
			valign: "top",
		});

		slide.addShape("roundRect", {
			x: x + 0.32,
			y: 5.75,
			w: width - 0.64,
			h: 0.1,
			rectRadius: 0.05,
			fill: { color: theme.border, transparency: 40 },
			line: { color: theme.border, width: 0 },
		});
		slide.addShape("roundRect", {
			x: x + 0.32,
			y: 5.75,
			w: (width - 0.64) * valueBarWidth(stat.value),
			h: 0.1,
			rectRadius: 0.05,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
		});
	});

	addFooter(slide, theme, context);
}

function renderTimeline(
	slide: PptxSlide,
	data: Slide & { layout: "timeline" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme, context.index), context.index);
	addHeader(slide, theme, data.kicker || "Timeline", data.title);

	const steps = data.steps;
	const startX = MARGIN + 1.0;
	const endX = PAGE_W - MARGIN - 1.0;
	const span = endX - startX;
	const lineY = 3.95;

	slide.addShape("rect", {
		x: startX,
		y: lineY - 0.015,
		w: span,
		h: 0.03,
		fill: { color: theme.accent, transparency: 45 },
		line: { color: theme.accent, width: 0 },
	});

	steps.forEach((step, index) => {
		const center = startX + (steps.length === 1 ? span / 2 : (span * index) / (steps.length - 1));
		const nodeX = center - 0.26;

		slide.addShape("ellipse", {
			x: nodeX,
			y: lineY - 0.26,
			w: 0.52,
			h: 0.52,
			fill: { color: theme.accent },
			line: { color: theme.background, width: 2.5 },
		});
		slide.addText(String(index + 1), {
			x: nodeX,
			y: lineY - 0.26,
			w: 0.52,
			h: 0.52,
			fontFace: FONT,
			fontSize: 13,
			bold: true,
			color: theme.accentText,
			align: "center",
			valign: "middle",
		});

		const above = index % 2 === 0;
		const textY = above ? 2.35 : 4.5;
		slide.addText(step.title, {
			x: center - 1.25,
			y: textY,
			w: 2.5,
			h: 0.55,
			fontFace: FONT,
			fontSize: 15,
			bold: true,
			color: theme.text,
			align: "center",
			valign: "middle",
		});
		if (step.description) {
			slide.addText(step.description, {
				x: center - 1.25,
				y: textY + 0.55,
				w: 2.5,
				h: 0.95,
				fontFace: FONT,
				fontSize: 12,
				color: theme.mutedText,
				align: "center",
				valign: "top",
			});
		}
	});

	addFooter(slide, theme, context);
}

function renderImageSplit(
	slide: PptxSlide,
	data: Slide & { layout: "image-split" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme, context.index), context.index);

	slide.addText((data.kicker || "Focus").toUpperCase(), {
		x: MARGIN,
		y: 1.25,
		w: 5.6,
		h: 0.3,
		fontFace: FONT,
		fontSize: 10,
		bold: true,
		color: theme.accent,
		charSpacing: 2.4,
		valign: "middle",
	});
	slide.addText(data.title, {
		x: MARGIN,
		y: 1.6,
		w: 5.7,
		h: 1.7,
		fontFace: FONT,
		fontSize: 29,
		bold: true,
		color: theme.text,
		valign: "top",
	});
	slide.addShape("rect", {
		x: MARGIN,
		y: 3.4,
		w: 1.0,
		h: 0.065,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
	addBullets(slide, theme, data.bullets, MARGIN, 3.75, 5.7, 2.6, 15);

	const panelX = 7.0;
	const panelY = 1.25;
	const panelW = PAGE_W - MARGIN - panelX;
	const panelH = 5.35;
	const panelArt = renderPanelArt(theme.id, context.index);
	if (panelArt) {
		slide.addImage({
			data: panelArt,
			x: panelX,
			y: panelY,
			w: panelW,
			h: panelH,
		});
	} else {
		slide.addShape("roundRect", {
			x: panelX,
			y: panelY,
			w: panelW,
			h: panelH,
			rectRadius: 0.22,
			fill: { color: theme.surface },
			line: { color: theme.border, width: 1 },
		});
	}

	const watermark = renderIcon("globe", c(theme.accent), 160);
	if (watermark) {
		slide.addImage({
			data: watermark,
			x: panelX + panelW / 2 - 0.85,
			y: panelY + panelH / 2 - 0.85,
			w: 1.7,
			h: 1.7,
			transparency: 65,
		});
	}

	if (data.caption) {
		slide.addShape("roundRect", {
			x: panelX + 0.35,
			y: panelY + panelH - 0.95,
			w: Math.min(panelW - 0.7, 0.24 + data.caption.length * 0.082),
			h: 0.5,
			rectRadius: 0.25,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
		});
		slide.addText(data.caption, {
			x: panelX + 0.5,
			y: panelY + panelH - 0.95,
			w: panelW - 1.0,
			h: 0.5,
			fontFace: FONT,
			fontSize: 11,
			bold: true,
			color: theme.accentText,
			valign: "middle",
		});
	}

	addFooter(slide, theme, context);
}

function renderClosing(
	slide: PptxSlide,
	data: Slide & { layout: "closing" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, posterMotif(theme, 0), context.index + 11);
	addBrandMark(slide, theme, context.deckTitle);

	slide.addText(data.title, {
		x: MARGIN,
		y: 2.5,
		w: CONTENT_W,
		h: 1.25,
		fontFace: FONT,
		fontSize: 40,
		bold: true,
		color: theme.text,
		align: "center",
		valign: "middle",
	});
	if (data.subtitle) {
		slide.addText(data.subtitle, {
			x: MARGIN,
			y: 3.78,
			w: CONTENT_W,
			h: 0.8,
			fontFace: FONT,
			fontSize: 17,
			color: theme.mutedText,
			align: "center",
			valign: "top",
		});
	}
	if (data.cta) {
		const width = Math.min(6.2, 1.4 + data.cta.length * 0.105);
		const x = (PAGE_W - width) / 2;
		slide.addShape("roundRect", {
			x,
			y: 4.85,
			w: width,
			h: 0.72,
			rectRadius: 0.36,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
			shadow: {
				type: "outer",
				color: theme.accent,
				opacity: 0.4,
				blur: 18,
				offset: 0,
				angle: 90,
			},
		});
		slide.addText(data.cta, {
			x,
			y: 4.85,
			w: width,
			h: 0.72,
			fontFace: FONT,
			fontSize: 15,
			bold: true,
			color: theme.accentText,
			align: "center",
			valign: "middle",
		});
	}
}

function renderSlide(
	pptx: PptxInstance,
	data: Slide,
	theme: DeckTheme,
	context: SlideContext,
): void {
	const slide = pptx.addSlide();

	switch (data.layout) {
		case "title":
			renderTitle(slide, data, theme, context);
			break;
		case "section":
			renderSection(slide, data, theme, context);
			break;
		case "bullets":
			renderBullets(slide, data, theme, context);
			break;
		case "two-column":
			renderTwoColumn(slide, data, theme, context);
			break;
		case "quote":
			renderQuote(slide, data, theme, context);
			break;
		case "stats":
			renderStats(slide, data, theme, context);
			break;
		case "timeline":
			renderTimeline(slide, data, theme, context);
			break;
		case "image-split":
			renderImageSplit(slide, data, theme, context);
			break;
		case "closing":
			renderClosing(slide, data, theme, context);
			break;
	}

	if (data.notes) {
		slide.addNotes(data.notes);
	}
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return slug.length > 0 ? slug : "slideforge-deck";
}

export async function downloadDeck(deck: Deck): Promise<string> {
	const PptxGenJS = (await import("pptxgenjs")).default;
	const pptx = new PptxGenJS();
	const theme = getTheme(deck.theme);

	pptx.layout = "LAYOUT_WIDE";
	pptx.author = "SlideForge";
	pptx.title = deck.title;

	const context: SlideContext = {
		index: 0,
		total: deck.slides.length,
		deckTitle: deck.title,
	};

	deck.slides.forEach((slide, index) => {
		renderSlide(pptx, slide, theme, { ...context, index });
	});

	const fileName = `${slugify(deck.title)}.pptx`;
	await pptx.writeFile({ fileName });
	return fileName;
}
