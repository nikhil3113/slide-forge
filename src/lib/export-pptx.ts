import { captureSlideImage } from "./slide-sandbox";

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
	onProgress?: (done: number, total: number) => void,
): Promise<string> {
	const PptxGenJS = (await import("pptxgenjs")).default;
	const pptx = new PptxGenJS();

	pptx.layout = "LAYOUT_WIDE";
	pptx.author = "SlideForge";
	pptx.title = deck.title;

	const total = deck.slides.length;

	for (let index = 0; index < total; index += 1) {
		const slide = deck.slides[index];
		const dataUrl = await captureSlideImage(slide.html, deck.tokensCss, {
			pixelRatio: 2,
			quality: 0.86,
			backgroundColor: deck.backgroundColor,
		});

		const output = pptx.addSlide();
		output.addImage({ data: dataUrl, x: 0, y: 0, w: 13.33, h: 7.5 });
		if (slide.notes) output.addNotes(slide.notes);

		onProgress?.(index + 1, total);
	}

	const fileName = `${slugify(deck.title)}.pptx`;
	await pptx.writeFile({ fileName });
	return fileName;
}
