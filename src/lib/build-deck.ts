import type { Deck, Slide } from "@/types/deck";
import { getTheme, type DeckTheme } from "./themes";

type PptxInstance = InstanceType<(typeof import("pptxgenjs"))["default"]>;
type PptxSlide = ReturnType<PptxInstance["addSlide"]>;

const FONT = "Segoe UI";
const PAGE_W = 13.33;
const MARGIN = 0.7;

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return slug.length > 0 ? slug : "slideforge-deck";
}

function background(theme: DeckTheme) {
	return { color: theme.background };
}

function addTitle(
	slide: PptxSlide,
	title: string,
	theme: DeckTheme,
): void {
	slide.addText(title, {
		x: MARGIN,
		y: 0.45,
		w: PAGE_W - MARGIN * 2,
		h: 0.85,
		fontFace: FONT,
		fontSize: 26,
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	slide.addShape("rect", {
		x: MARGIN,
		y: 1.3,
		w: 0.9,
		h: 0.07,
		fill: { color: theme.accent },
	});
}

function renderTitle(slide: PptxSlide, data: Slide & { layout: "title" }, theme: DeckTheme): void {
	slide.addShape("rect", {
		x: MARGIN + 0.2,
		y: 2.15,
		w: 1.1,
		h: 0.09,
		fill: { color: theme.accent },
	});
	slide.addText(data.title, {
		x: MARGIN + 0.2,
		y: 2.5,
		w: PAGE_W - MARGIN * 2 - 0.4,
		h: 1.4,
		fontFace: FONT,
		fontSize: 42,
		bold: true,
		color: theme.text,
		valign: "middle",
	});
	if (data.subtitle) {
		slide.addText(data.subtitle, {
			x: MARGIN + 0.2,
			y: 3.95,
			w: PAGE_W - MARGIN * 2 - 0.4,
			h: 0.9,
			fontFace: FONT,
			fontSize: 18,
			color: theme.mutedText,
			valign: "top",
		});
	}
}

function renderBullets(slide: PptxSlide, data: Slide & { layout: "bullets" }, theme: DeckTheme): void {
	addTitle(slide, data.title, theme);
	slide.addText(
		data.bullets.map((text) => ({
			text,
			options: { bullet: { code: "2022" }, breakLine: true },
		})),
		{
			x: MARGIN + 0.2,
			y: 1.75,
			w: PAGE_W - MARGIN * 2 - 0.4,
			h: 5.1,
			fontFace: FONT,
			fontSize: 18,
			color: theme.text,
			lineSpacingMultiple: 1.3,
			paraSpaceAfter: 10,
			valign: "top",
		},
	);
}

function renderTwoColumn(
	slide: PptxSlide,
	data: Slide & { layout: "two-column" },
	theme: DeckTheme,
): void {
	addTitle(slide, data.title, theme);

	const gap = 0.35;
	const width = (PAGE_W - MARGIN * 2 - gap) / 2;
	const columns = [data.left, data.right];

	columns.forEach((column, index) => {
		const x = MARGIN + index * (width + gap);
		slide.addShape("roundRect", {
			x,
			y: 1.7,
			w: width,
			h: 5.2,
			fill: { color: theme.surface },
			line: { color: theme.border, width: 1 },
			rectRadius: 0.08,
		});
		slide.addText(column.heading, {
			x: x + 0.35,
			y: 1.95,
			w: width - 0.7,
			h: 0.6,
			fontFace: FONT,
			fontSize: 20,
			bold: true,
			color: theme.accent,
		});
		slide.addText(
			column.bullets.map((text) => ({
				text,
				options: { bullet: { code: "2022" }, breakLine: true },
			})),
			{
				x: x + 0.35,
				y: 2.7,
				w: width - 0.7,
				h: 4,
				fontFace: FONT,
				fontSize: 16,
				color: theme.text,
				lineSpacingMultiple: 1.25,
				paraSpaceAfter: 8,
				valign: "top",
			},
		);
	});
}

function renderQuote(slide: PptxSlide, data: Slide & { layout: "quote" }, theme: DeckTheme): void {
	slide.addText("\u201C", {
		x: MARGIN,
		y: 0.6,
		w: 2,
		h: 1.8,
		fontFace: "Georgia",
		fontSize: 120,
		bold: true,
		color: theme.accent,
	});
	slide.addText(data.quote, {
		x: MARGIN + 1.2,
		y: 1.9,
		w: PAGE_W - MARGIN * 2 - 1.2,
		h: 3.1,
		fontFace: FONT,
		fontSize: 30,
		italic: true,
		color: theme.text,
		valign: "middle",
	});
	if (data.attribution) {
		slide.addText(`\u2014 ${data.attribution}`, {
			x: MARGIN + 1.2,
			y: 5.3,
			w: PAGE_W - MARGIN * 2 - 1.2,
			h: 0.6,
			fontFace: FONT,
			fontSize: 16,
			color: theme.mutedText,
		});
	}
}

function renderStats(slide: PptxSlide, data: Slide & { layout: "stats" }, theme: DeckTheme): void {
	addTitle(slide, data.title, theme);

	const gap = 0.3;
	const count = data.stats.length;
	const width = (PAGE_W - MARGIN * 2 - gap * (count - 1)) / count;

	data.stats.forEach((stat, index) => {
		const x = MARGIN + index * (width + gap);
		slide.addShape("roundRect", {
			x,
			y: 2.0,
			w: width,
			h: 3.4,
			fill: { color: theme.surface },
			line: { color: theme.border, width: 1 },
			rectRadius: 0.08,
		});
		slide.addText(stat.value, {
			x,
			y: 2.5,
			w: width,
			h: 1.3,
			fontFace: FONT,
			fontSize: 40,
			bold: true,
			color: theme.accent,
			align: "center",
			valign: "middle",
		});
		slide.addText(stat.label, {
			x: x + 0.2,
			y: 3.95,
			w: width - 0.4,
			h: 1.1,
			fontFace: FONT,
			fontSize: 15,
			color: theme.mutedText,
			align: "center",
			valign: "top",
		});
	});
}

function renderClosing(
	slide: PptxSlide,
	data: Slide & { layout: "closing" },
	theme: DeckTheme,
): void {
	slide.addText(data.title, {
		x: MARGIN,
		y: 2.4,
		w: PAGE_W - MARGIN * 2,
		h: 1.1,
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
			y: 3.6,
			w: PAGE_W - MARGIN * 2,
			h: 0.8,
			fontFace: FONT,
			fontSize: 18,
			color: theme.mutedText,
			align: "center",
		});
	}
	if (data.cta) {
		const width = 4.6;
		const x = (PAGE_W - width) / 2;
		slide.addShape("roundRect", {
			x,
			y: 4.8,
			w: width,
			h: 0.7,
			fill: { color: theme.accent },
			rectRadius: 0.35,
		});
		slide.addText(data.cta, {
			x,
			y: 4.8,
			w: width,
			h: 0.7,
			fontFace: FONT,
			fontSize: 16,
			bold: true,
			color: theme.accentText,
			align: "center",
			valign: "middle",
		});
	}
}

function renderSlide(pptx: PptxInstance, data: Slide, theme: DeckTheme): void {
	const slide = pptx.addSlide();
	slide.background = background(theme);

	switch (data.layout) {
		case "title":
			renderTitle(slide, data, theme);
			break;
		case "bullets":
			renderBullets(slide, data, theme);
			break;
		case "two-column":
			renderTwoColumn(slide, data, theme);
			break;
		case "quote":
			renderQuote(slide, data, theme);
			break;
		case "stats":
			renderStats(slide, data, theme);
			break;
		case "closing":
			renderClosing(slide, data, theme);
			break;
	}

	if (data.notes) {
		slide.addNotes(data.notes);
	}
}

export async function downloadDeck(deck: Deck): Promise<string> {
	const PptxGenJS = (await import("pptxgenjs")).default;
	const pptx = new PptxGenJS();
	const theme = getTheme(deck.theme);

	pptx.layout = "LAYOUT_WIDE";
	pptx.author = "SlideForge";
	pptx.title = deck.title;

	for (const slide of deck.slides) {
		renderSlide(pptx, slide, theme);
	}

	const fileName = `${slugify(deck.title)}.pptx`;
	await pptx.writeFile({ fileName });
	return fileName;
}
