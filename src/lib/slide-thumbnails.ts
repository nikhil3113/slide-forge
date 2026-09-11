import { useEffect, useSyncExternalStore } from "react";
import { getStoredThumbnail, putStoredThumbnail } from "./db";
import { captureSlideImage } from "./slide-sandbox";

export type ThumbnailStatus = "idle" | "rendering" | "ready" | "error";

interface ThumbnailEntry {
	status: ThumbnailStatus;
	url?: string;
}

const entries = new Map<string, ThumbnailEntry>();
const inflight = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();

function notify(): void {
	listeners.forEach((listener) => listener());
}

function setEntry(key: string, entry: ThumbnailEntry): void {
	entries.set(key, entry);
	notify();
}

function hashString(value: string): string {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(36);
}

export function thumbnailKey(
	html: string,
	tokensCss: string,
	pixelRatio: number,
): string {
	return `${pixelRatio}:${html.length}:${hashString(html)}:${hashString(tokensCss)}`;
}

let captureQueue: Promise<unknown> = Promise.resolve();

export interface ThumbnailRequest {
	html: string;
	tokensCss: string;
	backgroundColor: string;
	pixelRatio?: number;
}

export function ensureThumbnail(request: ThumbnailRequest): Promise<string> {
	const pixelRatio = request.pixelRatio ?? 1;
	const key = thumbnailKey(request.html, request.tokensCss, pixelRatio);

	const existing = entries.get(key);
	if (existing?.status === "ready" && existing.url) {
		return Promise.resolve(existing.url);
	}

	const pending = inflight.get(key);
	if (pending) return pending;

	const run = captureQueue.then(async () => {
		const fromCache = entries.get(key);
		if (fromCache?.status === "ready" && fromCache.url) return fromCache.url;

		const stored = await getStoredThumbnail(key);
		if (stored) {
			setEntry(key, { status: "ready", url: stored });
			return stored;
		}

		setEntry(key, { status: "rendering" });
		const url = await captureSlideImage(request.html, request.tokensCss, {
			pixelRatio,
			quality: 0.84,
			backgroundColor: request.backgroundColor,
		});
		setEntry(key, { status: "ready", url });
		void putStoredThumbnail(key, url);
		return url;
	});

	const guarded = run.catch((error) => {
		setEntry(key, { status: "error" });
		throw error;
	});

	captureQueue = guarded.then(
		() => undefined,
		() => undefined,
	);
	inflight.set(key, guarded);
	void guarded.then(
		() => inflight.delete(key),
		() => inflight.delete(key),
	);

	return guarded;
}

export function subscribeThumbnails(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function getEntry(key: string | undefined): ThumbnailEntry | undefined {
	return key ? entries.get(key) : undefined;
}

export interface UseSlideThumbnailOptions {
	html?: string;
	enabled?: boolean;
	tokensCss: string;
	backgroundColor: string;
}

export function useSlideThumbnail({
	html,
	enabled = true,
	tokensCss,
	backgroundColor,
}: UseSlideThumbnailOptions): { status: ThumbnailStatus; url?: string } {
	const key =
		html && enabled ? thumbnailKey(html, tokensCss, 1) : undefined;

	useEffect(() => {
		if (!html || !enabled) return;
		void ensureThumbnail({ html, tokensCss, backgroundColor }).catch(
			() => undefined,
		);
	}, [html, enabled, tokensCss, backgroundColor]);

	const entry = useSyncExternalStore(
		subscribeThumbnails,
		() => getEntry(key),
		() => undefined,
	);

	if (!key) return { status: "idle" };
	if (!entry) return { status: "rendering" };
	return { status: entry.status, url: entry.url };
}
