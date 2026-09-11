import type { ThemeId } from "@/types/deck";
import { getTheme, type DeckTheme, type Motif } from "./themes";

export type IconName =
	| "target"
	| "bolt"
	| "chart"
	| "shield"
	| "rocket"
	| "users"
	| "clock"
	| "check"
	| "bulb"
	| "globe"
	| "layers"
	| "book"
	| "flag"
	| "star"
	| "growth";

const ART_WIDTH = 1920;
const ART_HEIGHT = 1080;
const cache = new Map<string, string>();

export function artAvailable(): boolean {
	return (
		typeof document !== "undefined" &&
		typeof document.createElement === "function"
	);
}

function createCanvas(width: number, height: number) {
	if (!artAvailable()) return undefined;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return undefined;
	return { canvas, ctx };
}

function hashString(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function makeRandom(seed: number): () => number {
	let value = seed >>> 0;
	return () => {
		value = (value + 0x6d2b79f5) >>> 0;
		let t = Math.imul(value ^ (value >>> 15), 1 | value);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function rgba(hex: string, alpha: number): string {
	const value = hex.replace("#", "");
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawBase(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
): void {
	const gradient = ctx.createLinearGradient(0, 0, width * 0.9, height);
	gradient.addColorStop(0, `#${theme.gradient[0]}`);
	gradient.addColorStop(0.55, `#${theme.gradient[1]}`);
	gradient.addColorStop(1, `#${theme.gradient[0]}`);
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);
}

function drawBlob(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	color: string,
	alpha: number,
): void {
	const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
	gradient.addColorStop(0, rgba(color, alpha));
	gradient.addColorStop(1, rgba(color, 0));
	ctx.fillStyle = gradient;
	ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

let noisePattern: CanvasPattern | null | undefined;

function getNoisePattern(
	ctx: CanvasRenderingContext2D,
): CanvasPattern | undefined {
	if (noisePattern !== undefined) return noisePattern ?? undefined;
	if (!artAvailable()) return undefined;

	const size = 128;
	const tile = document.createElement("canvas");
	tile.width = size;
	tile.height = size;
	const tileCtx = tile.getContext("2d");
	if (!tileCtx) return undefined;

	const image = tileCtx.createImageData(size, size);
	for (let index = 0; index < image.data.length; index += 4) {
		const value = Math.floor(Math.random() * 255);
		image.data[index] = value;
		image.data[index + 1] = value;
		image.data[index + 2] = value;
		image.data[index + 3] = 16;
	}
	tileCtx.putImageData(image, 0, 0);

	noisePattern = ctx.createPattern(tile, "repeat");
	return noisePattern ?? undefined;
}

function drawGrain(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
): void {
	const pattern = getNoisePattern(ctx);
	if (!pattern) return;
	ctx.save();
	ctx.globalAlpha = 0.5;
	ctx.fillStyle = pattern;
	ctx.fillRect(0, 0, width, height);
	ctx.restore();
}

function drawVignette(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
): void {
	const gradient = ctx.createRadialGradient(
		width / 2,
		height / 2,
		Math.min(width, height) * 0.35,
		width / 2,
		height / 2,
		Math.max(width, height) * 0.78,
	);
	if (theme.mode === "dark") {
		gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
		gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
	} else {
		gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
		gradient.addColorStop(1, "rgba(40, 30, 20, 0.12)");
	}
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);
}

function drawGlow(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
	random: () => number,
): void {
	drawBlob(
		ctx,
		width * (0.65 + random() * 0.25),
		height * (0.1 + random() * 0.3),
		width * 0.55,
		theme.accent,
		0.32,
	);
	drawBlob(
		ctx,
		width * (0.05 + random() * 0.25),
		height * (0.65 + random() * 0.25),
		width * 0.5,
		theme.accent2,
		0.22,
	);
	drawBlob(
		ctx,
		width * (0.3 + random() * 0.4),
		height * (0.4 + random() * 0.3),
		width * 0.32,
		theme.gradient[1],
		0.3,
	);
}

function drawMesh(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
	random: () => number,
): void {
	const colors = [theme.accent, theme.accent2, theme.gradient[1]];
	for (let index = 0; index < 4; index += 1) {
		drawBlob(
			ctx,
			width * (0.15 + random() * 0.7),
			height * (0.15 + random() * 0.7),
			width * (0.28 + random() * 0.18),
			colors[index % colors.length],
			0.26,
		);
	}
}

function drawGrid(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
	random: () => number,
): void {
	const spacing = 64;
	ctx.save();
	ctx.strokeStyle = rgba(theme.accent, 0.08);
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let x = spacing; x < width; x += spacing) {
		ctx.moveTo(x, 0);
		ctx.lineTo(x, height);
	}
	for (let y = spacing; y < height; y += spacing) {
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
	}
	ctx.stroke();
	ctx.restore();

	drawBlob(
		ctx,
		width * (0.5 + random() * 0.4),
		height * (0.2 + random() * 0.4),
		width * 0.45,
		theme.accent,
		0.22,
	);
}

function drawWaves(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
	random: () => number,
): void {
	for (let band = 0; band < 3; band += 1) {
		const baseY = height * (0.45 + band * 0.16 + random() * 0.05);
		const amplitude = height * (0.05 + random() * 0.04);
		ctx.beginPath();
		ctx.moveTo(0, baseY);
		ctx.bezierCurveTo(
			width * 0.25,
			baseY - amplitude,
			width * 0.5,
			baseY + amplitude,
			width * 0.75,
			baseY - amplitude * 0.5,
		);
		ctx.bezierCurveTo(
			width * 0.88,
			baseY - amplitude * 0.9,
			width * 0.95,
			baseY + amplitude * 0.4,
			width,
			baseY,
		);
		ctx.lineTo(width, height);
		ctx.lineTo(0, height);
		ctx.closePath();

		const gradient = ctx.createLinearGradient(0, baseY, width, height);
		const color = band % 2 === 0 ? theme.accent : theme.accent2;
		gradient.addColorStop(0, rgba(color, 0.16));
		gradient.addColorStop(1, rgba(color, 0));
		ctx.fillStyle = gradient;
		ctx.fill();
	}
}

function drawTopo(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
	random: () => number,
): void {
	const centerX = width * (0.2 + random() * 0.6);
	const centerY = height * (0.2 + random() * 0.6);
	const phase = random() * Math.PI * 2;

	ctx.save();
	ctx.strokeStyle = rgba(theme.accent, 0.1);
	ctx.lineWidth = 1.5;
	for (let ring = 1; ring <= 14; ring += 1) {
		const baseRadius = ring * 52;
		ctx.beginPath();
		for (let angle = 0; angle <= Math.PI * 2 + 0.05; angle += 0.12) {
			const wobble =
				Math.sin(angle * 3 + phase) * 14 +
				Math.sin(angle * 5 + phase * 2) * 8;
			const radius = baseRadius + wobble;
			const x = centerX + Math.cos(angle) * radius * 1.25;
			const y = centerY + Math.sin(angle) * radius * 0.85;
			if (angle === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}
	ctx.restore();

	drawBlob(ctx, centerX, centerY, width * 0.4, theme.accent2, 0.16);
}

function drawDots(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	width: number,
	height: number,
	random: () => number,
): void {
	const focusX = width * (0.55 + random() * 0.35);
	const focusY = height * (0.2 + random() * 0.4);
	const spacing = 42;

	for (let x = spacing / 2; x < width; x += spacing) {
		for (let y = spacing / 2; y < height; y += spacing) {
			const distance = Math.hypot(x - focusX, y - focusY);
			const strength = Math.max(0, 1 - distance / 900);
			if (strength <= 0) continue;
			ctx.beginPath();
			ctx.fillStyle = rgba(theme.accent, 0.05 + strength * 0.35);
			ctx.arc(x, y, 1.2 + strength * 2.6, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

function drawMotif(
	ctx: CanvasRenderingContext2D,
	theme: DeckTheme,
	motif: Motif,
	width: number,
	height: number,
	random: () => number,
): void {
	switch (motif) {
		case "glow":
			drawGlow(ctx, theme, width, height, random);
			break;
		case "mesh":
			drawMesh(ctx, theme, width, height, random);
			break;
		case "grid":
			drawGrid(ctx, theme, width, height, random);
			break;
		case "waves":
			drawWaves(ctx, theme, width, height, random);
			break;
		case "topo":
			drawTopo(ctx, theme, width, height, random);
			break;
		case "dots":
			drawDots(ctx, theme, width, height, random);
			break;
	}
}

export function renderBackground(
	themeId: ThemeId,
	motif: Motif,
	variant: number,
): string | undefined {
	const key = `bg:${themeId}:${motif}:${variant}`;
	const cached = cache.get(key);
	if (cached) return cached;

	const surface = createCanvas(ART_WIDTH, ART_HEIGHT);
	if (!surface) return undefined;

	const { canvas, ctx } = surface;
	const theme = getTheme(themeId);
	const random = makeRandom(hashString(key));

	drawBase(ctx, theme, ART_WIDTH, ART_HEIGHT);
	drawMotif(ctx, theme, motif, ART_WIDTH, ART_HEIGHT, random);
	drawVignette(ctx, theme, ART_WIDTH, ART_HEIGHT);
	drawGrain(ctx, ART_WIDTH, ART_HEIGHT);

	const data = canvas.toDataURL("image/jpeg", 0.86);
	cache.set(key, data);
	return data;
}

export function renderPanelArt(
	themeId: ThemeId,
	variant: number,
): string | undefined {
	const key = `panel:${themeId}:${variant}`;
	const cached = cache.get(key);
	if (cached) return cached;

	const surface = createCanvas(1200, 780);
	if (!surface) return undefined;

	const { canvas, ctx } = surface;
	const theme = getTheme(themeId);
	const random = makeRandom(hashString(key));

	ctx.beginPath();
	roundRectPath(ctx, 0, 0, 1200, 780, 44);
	ctx.clip();

	drawBase(ctx, theme, 1200, 780);
	drawMotif(ctx, theme, theme.motifs[0], 1200, 780, random);
	drawGrain(ctx, 1200, 780);

	const data = canvas.toDataURL("image/png");
	cache.set(key, data);
	return data;
}

function roundRectPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + width - r, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + r);
	ctx.lineTo(x + width, y + height - r);
	ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	ctx.lineTo(x + r, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

type Point = [number, number];

function circle(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
): void {
	ctx.moveTo(cx + r, cy);
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

function polyline(ctx: CanvasRenderingContext2D, points: Point[]): void {
	points.forEach(([x, y], index) => {
		if (index === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	});
}

export function renderIcon(
	name: IconName,
	color: string,
	size = 112,
): string | undefined {
	const key = `icon:${name}:${color}:${size}`;
	const cached = cache.get(key);
	if (cached) return cached;

	const surface = createCanvas(size, size);
	if (!surface) return undefined;

	const { canvas, ctx } = surface;
	const scale = size / 24;
	ctx.scale(scale, scale);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 1.9;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();

	switch (name) {
		case "target":
			circle(ctx, 12, 12, 9);
			circle(ctx, 12, 12, 5.2);
			circle(ctx, 12, 12, 1.6);
			break;
		case "bolt":
			polyline(ctx, [
				[13, 2],
				[4.5, 13.5],
				[10.5, 13.5],
				[9, 22],
				[19.5, 10.5],
				[13.5, 10.5],
				[13, 2],
			]);
			break;
		case "chart":
			polyline(ctx, [
				[4, 20],
				[20, 20],
			]);
			polyline(ctx, [
				[8, 20],
				[8, 13],
			]);
			polyline(ctx, [
				[12, 20],
				[12, 8],
			]);
			polyline(ctx, [
				[16, 20],
				[16, 15.5],
			]);
			break;
		case "shield":
			polyline(ctx, [
				[12, 2.5],
				[20, 6],
				[20, 12],
			]);
			ctx.bezierCurveTo(20, 17, 16.5, 20.5, 12, 22);
			ctx.bezierCurveTo(7.5, 20.5, 4, 17, 4, 12);
			polyline(ctx, [
				[4, 12],
				[4, 6],
				[12, 2.5],
			]);
			break;
		case "rocket":
			ctx.bezierCurveTo(9, 5, 9.5, 8.5, 9.5, 12.5);
			polyline(ctx, [
				[9.5, 12.5],
				[10.5, 16],
				[13.5, 16],
				[14.5, 12.5],
			]);
			ctx.bezierCurveTo(14.5, 8.5, 15, 5, 12, 2);
			ctx.bezierCurveTo(11, 3, 10, 4, 9, 5);
			polyline(ctx, [
				[10, 16],
				[7.5, 19],
				[11, 18],
			]);
			polyline(ctx, [
				[14, 16],
				[16.5, 19],
				[13, 18],
			]);
			circle(ctx, 12, 9, 1.6);
			break;
		case "users":
			circle(ctx, 9, 8, 3.6);
			circle(ctx, 17, 9.5, 2.8);
			ctx.moveTo(3, 20);
			ctx.bezierCurveTo(3, 15.8, 5.8, 13.8, 9, 13.8);
			ctx.bezierCurveTo(12.2, 13.8, 15, 15.8, 15, 20);
			ctx.moveTo(15.5, 14.2);
			ctx.bezierCurveTo(18.4, 14.2, 21, 16, 21, 20);
			break;
		case "clock":
			circle(ctx, 12, 12, 9.2);
			polyline(ctx, [
				[12, 6.5],
				[12, 12.5],
				[16, 14.5],
			]);
			break;
		case "check":
			circle(ctx, 12, 12, 9.2);
			polyline(ctx, [
				[8, 12.5],
				[11, 15.5],
				[16.2, 9],
			]);
			break;
		case "bulb":
			circle(ctx, 12, 9.5, 5.8);
			polyline(ctx, [
				[9.4, 14.8],
				[9.4, 18],
				[14.6, 18],
				[14.6, 14.8],
			]);
			polyline(ctx, [
				[10.3, 20.8],
				[13.7, 20.8],
			]);
			break;
		case "globe":
			circle(ctx, 12, 12, 9.2);
			ctx.moveTo(2.9, 12);
			ctx.lineTo(21.1, 12);
			ctx.moveTo(12, 2.8);
			ctx.bezierCurveTo(16, 6.5, 16, 17.5, 12, 21.2);
			ctx.moveTo(12, 2.8);
			ctx.bezierCurveTo(8, 6.5, 8, 17.5, 12, 21.2);
			break;
		case "layers":
			polyline(ctx, [
				[12, 3],
				[21, 7.8],
				[12, 12.6],
				[3, 7.8],
				[12, 3],
			]);
			polyline(ctx, [
				[3, 12.4],
				[12, 17.2],
				[21, 12.4],
			]);
			polyline(ctx, [
				[3, 16.6],
				[12, 21.4],
				[21, 16.6],
			]);
			break;
		case "book":
			ctx.moveTo(4, 4.2);
			ctx.lineTo(9.5, 4.2);
			ctx.bezierCurveTo(10.8, 4.2, 12, 5.4, 12, 6.6);
			ctx.lineTo(12, 20.2);
			ctx.bezierCurveTo(12, 19, 10.8, 17.8, 9.5, 17.8);
			ctx.lineTo(4, 17.8);
			ctx.closePath();
			ctx.moveTo(20, 4.2);
			ctx.lineTo(14.5, 4.2);
			ctx.bezierCurveTo(13.2, 4.2, 12, 5.4, 12, 6.6);
			ctx.moveTo(20, 4.2);
			ctx.lineTo(20, 17.8);
			ctx.lineTo(14.5, 17.8);
			ctx.bezierCurveTo(13.2, 17.8, 12, 19, 12, 20.2);
			break;
		case "flag":
			polyline(ctx, [
				[5.5, 21],
				[5.5, 3],
			]);
			polyline(ctx, [
				[5.5, 4.2],
				[17.5, 4.2],
				[14.5, 8],
				[17.5, 11.8],
				[5.5, 11.8],
			]);
			break;
		case "star":
			polyline(ctx, [
				[12, 2.8],
				[14.8, 8.8],
				[21.2, 9.6],
				[16.4, 14],
				[17.8, 20.4],
				[12, 17.2],
				[6.2, 20.4],
				[7.6, 14],
				[2.8, 9.6],
				[9.2, 8.8],
				[12, 2.8],
			]);
			break;
		case "growth":
			polyline(ctx, [
				[4, 4],
				[4, 20],
				[20, 20],
			]);
			polyline(ctx, [
				[7, 16],
				[11, 11.5],
				[14, 13.5],
				[19.5, 6.5],
			]);
			polyline(ctx, [
				[15.2, 6.5],
				[19.5, 6.5],
				[19.5, 10.8],
			]);
			break;
	}
	ctx.stroke();

	const data = canvas.toDataURL("image/png");
	cache.set(key, data);
	return data;
}
