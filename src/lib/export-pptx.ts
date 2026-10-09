import {
	captureSlideEditable,
	captureSlideImage,
	type EditableTextBlock,
} from "./slide-sandbox";

export type ExportMode = "image" | "editable";

export interface ExportSlide {
	html: string;
	notes: string;
}

export interface ExportDeck {
	title: string;
	subtitle: string;
	tokensCss: string;
	backgroundColor: string;
	slides: ExportSlide[];
}

export interface ExportOptions {
	mode?: ExportMode;
	onProgress?: (done: number, total: number) => void;
}

type PptxSlide = ReturnType<
	InstanceType<typeof import("pptxgenjs")["default"]>["addSlide"]
>;

const SLIDE_WIDTH_IN = 13.33;
const SLIDE_HEIGHT_IN = 7.5;
const SLIDE_FRAME_W = 1280;
const PX_PER_INCH = 96;
const PX_TO_PT = 0.75;

const SAFE_FONT_FACES: Record<string, string> = {
	arial: "Arial",
	helvetica: "Helvetica",
	"helvetica neue": "Helvetica Neue",
	"segoe ui": "Segoe UI",
	inter: "Segoe UI",
	roboto: "Segoe UI",
	"open sans": "Segoe UI",
	lato: "Segoe UI",
	poppins: "Segoe UI",
	montserrat: "Segoe UI",
	calibri: "Calibri",
	aptos: "Aptos",
	"times new roman": "Times New Roman",
	times: "Times New Roman",
	georgia: "Georgia",
	garamond: "Garamond",
	cambria: "Cambria",
	verdana: "Verdana",
	tahoma: "Tahoma",
	"trebuchet ms": "Trebuchet MS",
	"courier new": "Courier New",
	consolas: "Consolas",
	impact: "Impact",
	"comic sans ms": "Comic Sans MS",
	"gill sans": "Gill Sans",
	"franklin gothic": "Franklin Gothic Medium",
};

function mapFontFace(fontFamily: string): string {
	const primary = (fontFamily.split(",")[0] ?? "")
		.replace(/["']/g, "")
		.trim()
		.toLowerCase();
	if (primary in SAFE_FONT_FACES) return SAFE_FONT_FACES[primary];
	if (
		primary === "system-ui" ||
		primary === "-apple-system" ||
		primary.startsWith("ui-sans") ||
		primary === "sans-serif"
	) {
		return "Segoe UI";
	}
	if (primary === "ui-serif" || primary === "serif") return "Georgia";
	if (
		primary === "ui-monospace" ||
		primary === "monospace" ||
		primary === "menlo" ||
		primary === "monaco"
	) {
		return "Consolas";
	}
	return "Segoe UI";
}

function applyTextTransform(text: string, transform: string): string {
	const value = transform.toLowerCase();
	if (value === "uppercase") return text.toUpperCase();
	if (value === "lowercase") return text.toLowerCase();
	if (value === "capitalize") {
		return text.replace(
			/(^|\s)(\p{L})/gu,
			(_match, space: string, letter: string) => space + letter.toUpperCase(),
		);
	}
	return text;
}

function hexColor(color: string): string {
	return color.startsWith("#") ? color.slice(1) : color;
}

function roundTenth(value: number): number {
	return Math.round(value * 10) / 10;
}

function addEditableText(slide: PptxSlide, block: EditableTextBlock): void {
	const first = block.runs[0];
	if (!first) return;

	const slack = Math.max(6, block.w * 0.06);
	let x = block.x;
	let w = block.w + slack;
	if (block.align === "center") x -= slack / 2;
	else if (block.align === "right") x -= slack;
	if (x < 0) {
		w += x;
		x = 0;
	}
	if (x + w > SLIDE_FRAME_W) w = SLIDE_FRAME_W - x;

	const halfLeading =
		(block.lineHeight - (block.ascent + block.descent)) / 2;
	const y = Math.max(0, block.y - halfLeading);
	const h = block.h + block.fontSize * 0.1;

	const xIn = Math.min(Math.max(x / PX_PER_INCH, 0), SLIDE_WIDTH_IN - 0.1);
	const yIn = Math.min(Math.max(y / PX_PER_INCH, 0), SLIDE_HEIGHT_IN - 0.1);
	const wIn = Math.max(0.1, Math.min(w / PX_PER_INCH, SLIDE_WIDTH_IN - xIn));
	const hIn = Math.max(0.1, Math.min(h / PX_PER_INCH, SLIDE_HEIGHT_IN - yIn));

	slide.addText(
		block.runs.map((run) => ({
			text: applyTextTransform(run.text, run.textTransform),
			options: {
				fontFace: mapFontFace(run.fontFamily),
				fontSize: Math.max(4, roundTenth(run.fontSize * PX_TO_PT)),
				bold: run.bold,
				italic: run.italic,
				underline: run.underline ? { style: "sng" as const } : undefined,
				color: hexColor(run.color),
				charSpacing: roundTenth(run.charSpacing * PX_TO_PT),
				breakLine: run.breakLine,
			},
		})),
		{
			x: xIn,
			y: yIn,
			w: wIn,
			h: hIn,
			margin: 0,
			align: block.align,
			valign: "top",
			lineSpacing: Math.max(1, roundTenth(block.lineHeight * PX_TO_PT)),
			paraSpaceBefore: 0,
			paraSpaceAfter: 0,
			rotate: block.rotate || undefined,
			isTextBox: true,
			wrap: true,
			autoFit: false,
			color: hexColor(first.color),
			fontFace: mapFontFace(first.fontFamily),
			fontSize: Math.max(4, roundTenth(first.fontSize * PX_TO_PT)),
			bold: first.bold,
			italic: first.italic,
		},
	);
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return slug.length > 0 ? slug : "slideforge-deck";
}

export async function downloadDeck(
	deck: ExportDeck,
	options: ExportOptions = {},
): Promise<string> {
	const mode = options.mode ?? "image";
	const PptxGenJS = (await import("pptxgenjs")).default;
	const pptx = new PptxGenJS();

	pptx.layout = "LAYOUT_WIDE";
	pptx.author = "SlideForge";
	pptx.title = deck.title;

	const total = deck.slides.length;

	for (let index = 0; index < total; index += 1) {
		const slide = deck.slides[index];
		const output = pptx.addSlide();

		if (mode === "editable") {
			const capture = await captureSlideEditable(slide.html, deck.tokensCss, {
				pixelRatio: 2,
				quality: 0.86,
				backgroundColor: deck.backgroundColor,
			});
			output.addImage({
				data: capture.background,
				x: 0,
				y: 0,
				w: SLIDE_WIDTH_IN,
				h: SLIDE_HEIGHT_IN,
			});
			for (const block of capture.blocks) addEditableText(output, block);
		} else {
			const dataUrl = await captureSlideImage(slide.html, deck.tokensCss, {
				pixelRatio: 2,
				quality: 0.86,
				backgroundColor: deck.backgroundColor,
			});
			output.addImage({
				data: dataUrl,
				x: 0,
				y: 0,
				w: SLIDE_WIDTH_IN,
				h: SLIDE_HEIGHT_IN,
			});
		}

		if (slide.notes) output.addNotes(slide.notes);

		options.onProgress?.(index + 1, total);
	}

	const suffix = mode === "editable" ? "-editable" : "";
	const fileName = `${slugify(deck.title)}${suffix}.pptx`;
	await pptx.writeFile({ fileName });
	return fileName;
}
