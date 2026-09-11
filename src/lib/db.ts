import type { WorkspaceMessage } from "@/types/chat";
import type { Outline, Slide, ThemeId } from "@/types/deck";

export interface StoredBrief {
	slideCount: number;
	theme: ThemeId;
	tone: string;
	audience: string;
	askUpfront: boolean;
}

export interface StoredDeck {
	title: string;
	subtitle: string;
	theme: ThemeId;
	outline?: Outline;
	slides: Array<{ index: number; slide: Slide }>;
}

export interface StoredWorkspace {
	id: string;
	updatedAt: number;
	brief: StoredBrief;
	messages: WorkspaceMessage[];
	deck: StoredDeck;
}

const DB_NAME = "pptgen";
const DB_VERSION = 1;
const WORKSPACE_STORE = "workspaces";
const META_STORE = "meta";
const ACTIVE_KEY = "activeWorkspaceId";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error("IndexedDB request failed"));
	});
}

let dbPromise: Promise<IDBDatabase | undefined> | undefined;

function openDatabase(): Promise<IDBDatabase | undefined> {
	if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve) => {
		try {
			const request = indexedDB.open(DB_NAME, DB_VERSION);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
					db.createObjectStore(WORKSPACE_STORE, { keyPath: "id" });
				}
				if (!db.objectStoreNames.contains(META_STORE)) {
					db.createObjectStore(META_STORE, { keyPath: "key" });
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(undefined);
			request.onblocked = () => resolve(undefined);
		} catch {
			resolve(undefined);
		}
	});

	return dbPromise;
}

export function databaseAvailable(): boolean {
	return typeof indexedDB !== "undefined";
}

export async function loadWorkspace(): Promise<StoredWorkspace | undefined> {
	const db = await openDatabase();
	if (!db) return undefined;
	try {
		const tx = db.transaction([WORKSPACE_STORE, META_STORE], "readonly");
		const meta = await requestToPromise<{ key: string; value: string } | undefined>(
			tx.objectStore(META_STORE).get(ACTIVE_KEY),
		);
		if (!meta?.value) return undefined;
		return await requestToPromise<StoredWorkspace | undefined>(
			tx.objectStore(WORKSPACE_STORE).get(meta.value),
		);
	} catch {
		return undefined;
	}
}

export async function saveWorkspace(workspace: StoredWorkspace): Promise<void> {
	const db = await openDatabase();
	if (!db) return;
	try {
		const tx = db.transaction([WORKSPACE_STORE, META_STORE], "readwrite");
		tx.objectStore(WORKSPACE_STORE).put(workspace);
		tx.objectStore(META_STORE).put({ key: ACTIVE_KEY, value: workspace.id });
	} catch {
		// storage unavailable; state stays in memory
	}
}

export async function clearWorkspace(): Promise<void> {
	const db = await openDatabase();
	if (!db) return;
	try {
		const tx = db.transaction([WORKSPACE_STORE, META_STORE], "readwrite");
		tx.objectStore(WORKSPACE_STORE).clear();
		tx.objectStore(META_STORE).clear();
	} catch {
		// ignore
	}
}
