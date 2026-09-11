import type { Deck, Slide } from "@/types/deck";
import { renderBackground, renderIcon, type IconName } from "./deck-art";
import { getTheme, type DeckTheme, type Motif } from "./themes";

type PptxInstance = InstanceType<(typeof import("pptxgenjs"))["default"]>;
type PptxSlide = ReturnType<PptxInstance["addSlide"]>;

const FONT = "Segoe UI";
const FONT_LIGHT = "Segoe UI Light";
const SERIF = "Georgia";
const PAGE_W = 13.33;
const PAGE_H = 7.5;
const MARGIN = 0.8;
const CONTENT_W = PAGE_W - MARGIN * 2;

const c = (value: string) => `#${value}`;
const pad = (value: number) => String(value).padStart(2, "0");

interface SlideContext {
	index: number;
	total: number;
	deckTitle: string;
}

function posterMotif(theme: DeckTheme, choice: number): Motif {
	return theme.motifs[choice % theme.motifs.length] ?? "arc";
}

function contentMotif(theme: DeckTheme): Motif {
	return theme.motifs[1] ?? "field";
}

function titleSize(title: string): number {
	if (title.length <= 28) return 32;
	if (title.length <= 44) return 28;
	return 24;
}

function displaySize(title: string): number {
	if (title.length <= 28) return 48;
	if (title.length <= 44) return 42;
	return 36;
}

function bodySize(count: number): number {
	if (count >= 7) return 14;
	if (count >= 5) return 15;
	return 16;
}

function quoteSize(length: number): number {
	if (length <= 100) return 32;
	if (length <= 160) return 27;
	return 23;
}

function statValueSize(value: string): number {
	return value.length > 5 ? 30 : 40;
}

function shadowFor(theme: DeckTheme) {
	return {
		type: "outer" as const,
		color: "000000",
		opacity: theme.mode === "dark" ? 0.3 : 0.12,
		blur: 14,
		offset: 4,
		angle: 90,
	};
}

function addBackground(
	slide: PptxSlide,
	theme: DeckTheme,
	motif: Motif,
	variant: number,
): void {
	const data = renderBackground(theme.id, motif, variant);
	if (data) {
		slide.addImage({ data, x: 0, y: 0, w: PAGE_W, h: PAGE_H });
	} else {
		slide.background = { color: theme.background };
	}
}

function addKicker(
	slide: PptxSlide,
	theme: DeckTheme,
	text: string,
	x: number,
	y: number,
	w: number,
): void {
	if (!text) return;
	slide.addText(text.toUpperCase(), {
		x,
		y,
		w,
		h: 0.32,
		fontFace: FONT,
		fontSize: 10,
		bold: true,
		color: theme.accent,
		charSpacing: 2.4,
		valign: "middle",
	});
}

function addRule(
	slide: PptxSlide,
	theme: DeckTheme,
	x: number,
	y: number,
	w: number,
): void {
	slide.addShape("rect", {
		x,
		y,
		w,
		h: 0.055,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
}

function addBrandMark(slide: PptxSlide, theme: DeckTheme, label: string): void {
	slide.addShape("roundRect", {
		x: MARGIN,
		y: 0.56,
		w: 0.15,
		h: 0.15,
		rectRadius: 0.03,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
	slide.addText(label.toUpperCase(), {
		x: MARGIN + 0.28,
		y: 0.47,
		w: 9,
		h: 0.32,
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
		y: PAGE_H - 0.62,
		w: CONTENT_W,
		h: 0.012,
		fill: { color: theme.border },
		line: { color: theme.border, width: 0 },
	});
	slide.addText(context.deckTitle, {
		x: MARGIN,
		y: PAGE_H - 0.55,
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
		y: PAGE_H - 0.55,
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

function addContentHeader(
	slide: PptxSlide,
	theme: DeckTheme,
	kicker: string,
	title: string,
): void {
	addKicker(slide, theme, kicker, MARGIN, 0.55, CONTENT_W - 2.6);
	slide.addText(title, {
		x: MARGIN,
		y: 0.9,
		w: CONTENT_W - 2.6,
		h: 0.92,
		fontFace: FONT,
		fontSize: titleSize(title),
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	addRule(slide, theme, MARGIN, 1.9, 0.85);
}

function addSideNumeral(
	slide: PptxSlide,
	theme: DeckTheme,
	index: number,
	y: number,
	size = 110,
): void {
	slide.addText(pad(index + 1), {
		x: PAGE_W - MARGIN - 2.4,
		y,
		w: 2.4,
		h: (size / 72) * 1.15,
		fontFace: FONT_LIGHT,
		fontSize: size,
		color: theme.accent,
		transparency: 86,
		align: "right",
		valign: "middle",
	});
}

function addBulletList(
	slide: PptxSlide,
	theme: DeckTheme,
	bullets: string[],
	x: number,
	y: number,
	w: number,
	h: number,
	fontSize: number,
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
			lineSpacingMultiple: 1.35,
			paraSpaceAfter: 11,
			valign: "top",
		},
	);
}

function addSolidPanel(
	slide: PptxSlide,
	theme: DeckTheme,
	x: number,
	y: number,
	w: number,
	h: number,
	radius = 0.1,
): void {
	slide.addShape("roundRect", {
		x,
		y,
		w,
		h,
		rectRadius: radius,
		fill: { color: theme.surface },
		line: { color: theme.border, width: 1 },
		shadow: shadowFor(theme),
	});
}

function addGraphicPanel(
	slide: PptxSlide,
	theme: DeckTheme,
	x: number,
	y: number,
	w: number,
	h: number,
	variant: number,
): void {
	addSolidPanel(slide, theme, x, y, w, h, 0.16);
	const mode = variant % 3;

	if (mode === 0) {
		const centerX = x + w * 0.72;
		const centerY = y + h * 0.72;
		const base = Math.min(w, h) * 0.46;
		[1, 0.72, 0.46].forEach((factor, index) => {
			const radius = base * factor;
			slide.addShape("ellipse", {
				x: centerX - radius,
				y: centerY - radius,
				w: radius * 2,
				h: radius * 2,
				fill: { color: theme.surface },
				line: {
					color: index % 2 === 0 ? theme.accent : theme.accent2,
					width: 2,
					transparency: 45,
				},
			});
		});
		slide.addShape("ellipse", {
			x: centerX - base * 0.16,
			y: centerY - base * 0.16,
			w: base * 0.32,
			h: base * 0.32,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
		});
	} else if (mode === 1) {
		const bars = [0.32, 0.58, 0.44, 0.78, 0.62];
		const barWidth = (w * 0.6) / bars.length;
		bars.forEach((factor, index) => {
			const barHeight = h * factor * 0.62;
			slide.addShape("roundRect", {
				x: x + w * 0.14 + index * barWidth,
				y: y + h * 0.82 - barHeight,
				w: barWidth * 0.62,
				h: barHeight,
				rectRadius: 0.04,
				fill: {
					color: index === 3 ? theme.accent : theme.accent2,
					transparency: index === 3 ? 0 : 55,
				},
				line: { color: theme.accent, width: 0 },
			});
		});
	} else {
		const cell = Math.min(w, h) * 0.16;
		for (let row = 0; row < 2; row += 1) {
			for (let column = 0; column < 3; column += 1) {
				slide.addShape("rect", {
					x: x + w * 0.16 + column * cell * 1.35,
					y: y + h * 0.3 + row * cell * 1.35,
					w: cell,
					h: cell,
					fill: {
						color:
							(row + column) % 3 === 0 ? theme.accent : theme.accent2,
						transparency: (row + column) % 3 === 0 ? 0 : 65,
					},
					line: { color: theme.accent, width: 0 },
				});
			}
		}
	}
}

function renderTitle(
	slide: PptxSlide,
	data: Slide & { layout: "title" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, posterMotif(theme, 0), context.index);
	addBrandMark(slide, theme, context.deckTitle);

	addRule(slide, theme, MARGIN + 0.03, 2.62, 1.15);
	slide.addText(data.title, {
		x: MARGIN + 0.03,
		y: 3.0,
		w: CONTENT_W - 1.6,
		h: 1.75,
		fontFace: FONT_LIGHT,
		fontSize: displaySize(data.title),
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	if (data.subtitle) {
		slide.addText(data.subtitle, {
			x: MARGIN + 0.03,
			y: 4.92,
			w: CONTENT_W - 3.2,
			h: 0.85,
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
	addBackground(slide, theme, posterMotif(theme, 2), context.index + 7);

	slide.addShape("rect", {
		x: MARGIN,
		y: 2.72,
		w: 0.085,
		h: 1.55,
		fill: { color: theme.accent },
		line: { color: theme.accent, width: 0 },
	});
	addKicker(
		slide,
		theme,
		data.kicker || `SECTION ${pad(context.index + 1)}`,
		MARGIN + 0.32,
		2.68,
		6,
	);
	slide.addText(data.title, {
		x: MARGIN + 0.32,
		y: 3.05,
		w: CONTENT_W - 4.2,
		h: 1.25,
		fontFace: FONT,
		fontSize: 38,
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	if (data.subtitle) {
		slide.addText(data.subtitle, {
			x: MARGIN + 0.32,
			y: 4.42,
			w: CONTENT_W - 4.6,
			h: 0.8,
			fontFace: FONT,
			fontSize: 16,
			color: theme.mutedText,
			valign: "top",
		});
	}

	slide.addText(pad(context.index + 1), {
		x: PAGE_W - MARGIN - 5,
		y: 1.3,
		w: 5,
		h: 4.9,
		fontFace: FONT_LIGHT,
		fontSize: 200,
		color: theme.accent,
		transparency: 88,
		align: "right",
		valign: "middle",
	});
}

function renderBullets(
	slide: PptxSlide,
	data: Slide & { layout: "bullets" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme), context.index);
	addContentHeader(slide, theme, data.kicker, data.title);
	addSideNumeral(slide, theme, context.index, 4.5, 120);

	addBulletList(
		slide,
		theme,
		data.bullets,
		MARGIN + 0.12,
		2.35,
		CONTENT_W - 3.1,
		4.1,
		bodySize(data.bullets.length),
	);
	addFooter(slide, theme, context);
}

function renderTwoColumn(
	slide: PptxSlide,
	data: Slide & { layout: "two-column" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme), context.index);
	addContentHeader(slide, theme, data.kicker, data.title);

	const gap = 1.0;
	const width = (CONTENT_W - gap) / 2;
	const centerX = MARGIN + width + gap / 2;

	slide.addShape("rect", {
		x: centerX,
		y: 2.3,
		w: 0.012,
		h: 4.1,
		fill: { color: theme.border },
		line: { color: theme.border, width: 0 },
	});

	const columns = [data.left, data.right];
	columns.forEach((column, index) => {
		const x = MARGIN + index * (width + gap);
		slide.addShape("rect", {
			x,
			y: 2.3,
			w: 0.38,
			h: 0.075,
			fill: { color: index === 0 ? theme.accent : theme.accent2 },
			line: { color: theme.accent, width: 0 },
		});
		slide.addText(column.heading, {
			x,
			y: 2.48,
			w: width,
			h: 0.55,
			fontFace: FONT,
			fontSize: 18,
			bold: true,
			color: theme.text,
			valign: "middle",
		});
		addBulletList(
			slide,
			theme,
			column.bullets,
			x,
			3.15,
			width - 0.2,
			3.1,
			bodySize(column.bullets.length),
		);
	});

	addFooter(slide, theme, context);
}

function renderStats(
	slide: PptxSlide,
	data: Slide & { layout: "stats" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, contentMotif(theme), context.index);
	addContentHeader(slide, theme, data.kicker, data.title);

	const gap = 0.3;
	const count = data.stats.length;
	const width = (CONTENT_W - gap * (count - 1)) / count;
	const icons: IconName[] = ["growth", "bolt", "target", "clock"];

	data.stats.forEach((stat, index) => {
		const x = MARGIN + index * (width + gap);
		addSolidPanel(slide, theme, x, 2.25, width, 3.95, 0.12);

		slide.addText(pad(index + 1), {
			x: x + 0.32,
			y: 2.5,
			w: 1,
			h: 0.3,
			fontFace: FONT,
			fontSize: 10,
			bold: true,
			color: theme.mutedText,
			charSpacing: 1.6,
		});

		const iconData = renderIcon(icons[index % icons.length], c(theme.accent), 112);
		if (iconData) {
			slide.addImage({
				data: iconData,
				x: x + width - 0.75,
				y: 2.45,
				w: 0.42,
				h: 0.42,
				transparency: 25,
			});
		}

		slide.addText(stat.value, {
			x: x + 0.3,
			y: 3.35,
			w: width - 0.6,
			h: 1.15,
			fontFace: FONT_LIGHT,
			fontSize: statValueSize(stat.value),
			bold: true,
			color: theme.accent,
			valign: "middle",
		});
		slide.addShape("rect", {
			x: x + 0.32,
			y: 4.62,
			w: 0.5,
			h: 0.045,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
		});
		slide.addText(stat.label, {
			x: x + 0.32,
			y: 4.8,
			w: width - 0.64,
			h: 1.1,
			fontFace: FONT,
			fontSize: 13,
			color: theme.mutedText,
			valign: "top",
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
	addBackground(slide, theme, contentMotif(theme), context.index);
	addContentHeader(slide, theme, data.kicker || "Timeline", data.title);

	const steps = data.steps;
	const startX = MARGIN + 1.45;
	const endX = PAGE_W - MARGIN - 1.45;
	const span = endX - startX;
	const lineY = 3.95;
	const cardWidth = 2.7;

	slide.addShape("rect", {
		x: startX,
		y: lineY - 0.012,
		w: span,
		h: 0.024,
		fill: { color: theme.border },
		line: { color: theme.border, width: 0 },
	});

	steps.forEach((step, index) => {
		const center =
			startX +
			(steps.length === 1 ? span / 2 : (span * index) / (steps.length - 1));
		const nodeSize = 0.5;

		slide.addShape("ellipse", {
			x: center - nodeSize / 2,
			y: lineY - nodeSize / 2,
			w: nodeSize,
			h: nodeSize,
			fill: { color: theme.accent },
			line: { color: theme.background, width: 2 },
		});
		slide.addText(String(index + 1), {
			x: center - nodeSize / 2,
			y: lineY - nodeSize / 2,
			w: nodeSize,
			h: nodeSize,
			fontFace: FONT,
			fontSize: 12,
			bold: true,
			color: theme.accentText,
			align: "center",
			valign: "middle",
		});

		const above = index % 2 === 0;
		const textY = above ? 2.35 : 4.5;
		const clampedX = Math.min(
			Math.max(center - cardWidth / 2, MARGIN),
			PAGE_W - MARGIN - cardWidth,
		);

		slide.addText(step.title, {
			x: clampedX,
			y: textY,
			w: cardWidth,
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
				x: clampedX,
				y: textY + 0.56,
				w: cardWidth,
				h: 1.0,
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
	addBackground(slide, theme, contentMotif(theme), context.index);

	addKicker(slide, theme, data.kicker || "Focus", MARGIN, 1.3, 5.6);
	slide.addText(data.title, {
		x: MARGIN,
		y: 1.62,
		w: 5.7,
		h: 1.6,
		fontFace: FONT,
		fontSize: titleSize(data.title) + 2,
		bold: true,
		color: theme.text,
		valign: "top",
	});
	addRule(slide, theme, MARGIN, 3.32, 0.85);
	addBulletList(
		slide,
		theme,
		data.bullets,
		MARGIN + 0.02,
		3.6,
		5.65,
		2.7,
		bodySize(data.bullets.length),
	);

	const panelX = 7.1;
	const panelY = 1.3;
	const panelW = PAGE_W - MARGIN - panelX;
	const panelH = 5.3;
	addGraphicPanel(slide, theme, panelX, panelY, panelW, panelH, context.index);

	if (data.caption) {
		const chipWidth = Math.min(panelW - 0.7, 0.3 + data.caption.length * 0.078);
		slide.addShape("roundRect", {
			x: panelX + 0.35,
			y: panelY + panelH - 0.95,
			w: chipWidth,
			h: 0.48,
			rectRadius: 0.24,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
		});
		slide.addText(data.caption, {
			x: panelX + 0.5,
			y: panelY + panelH - 0.95,
			w: chipWidth - 0.3,
			h: 0.48,
			fontFace: FONT,
			fontSize: 11,
			bold: true,
			color: theme.accentText,
			valign: "middle",
		});
	}

	addFooter(slide, theme, context);
}

function renderQuote(
	slide: PptxSlide,
	data: Slide & { layout: "quote" },
	theme: DeckTheme,
	context: SlideContext,
): void {
	addBackground(slide, theme, posterMotif(theme, 0), context.index + 5);

	if (data.title) {
		addKicker(slide, theme, data.title, MARGIN, 0.62, CONTENT_W - 2);
	}

	slide.addText("\u201C", {
		x: MARGIN,
		y: 1.15,
		w: 2,
		h: 1.6,
		fontFace: SERIF,
		fontSize: 96,
		bold: true,
		color: theme.accent,
	});

	slide.addText(data.quote, {
		x: MARGIN + 0.35,
		y: 2.45,
		w: CONTENT_W - 1.1,
		h: 2.7,
		fontFace: FONT,
		fontSize: quoteSize(data.quote.length),
		italic: true,
		color: theme.text,
		valign: "middle",
	});

	if (data.attribution) {
		slide.addShape("rect", {
			x: MARGIN + 0.35,
			y: 5.42,
			w: 0.5,
			h: 0.045,
			fill: { color: theme.accent },
			line: { color: theme.accent, width: 0 },
		});
		slide.addText(data.attribution, {
			x: MARGIN + 1.0,
			y: 5.25,
			w: CONTENT_W - 1.0,
			h: 0.4,
			fontFace: FONT,
			fontSize: 13,
			color: theme.mutedText,
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
	addBackground(slide, theme, posterMotif(theme, 2), context.index + 9);
	addBrandMark(slide, theme, context.deckTitle);

	slide.addText(data.title, {
		x: MARGIN,
		y: 2.5,
		w: CONTENT_W,
		h: 1.2,
		fontFace: FONT_LIGHT,
		fontSize: displaySize(data.title),
		bold: true,
		color: theme.text,
		align: "center",
		valign: "middle",
	});
	if (data.subtitle) {
		slide.addText(data.subtitle, {
			x: MARGIN,
			y: 3.72,
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
		const width = Math.min(6.4, 1.5 + data.cta.length * 0.105);
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
				opacity: 0.35,
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
