import type { ProviderId } from "@/types/deck";

export interface ProviderPreset {
	id: ProviderId;
	label: string;
	kind: "openai-compat" | "gemini" | "anthropic";
	baseUrl?: string;
	models: string[];
	defaultModel: string;
	keyPlaceholder: string;
	requiresBaseUrl?: boolean;
	requiresSession?: boolean;
	note?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
	{
		id: "opencode-go",
		label: "OpenCode Go",
		kind: "openai-compat",
		baseUrl: "https://opencode.ai/zen/go/v1",
		models: [
			"deepseek-v4-flash",
			"deepseek-v4-pro",
			"deepseek-v4.1-flash",
			"glm-5.3-flash",
			"glm-5.3",
			"glm-5.2",
			"kimi-k3",
			"kimi-k2.7-code",
			"kimi-k2.6",
			"longcat-2.0",
			"mimo-v2.5",
			"mimo-v2.5-pro",
			"hy3",
			"hy4-preview",
		],
		defaultModel: "deepseek-v4-flash",
		keyPlaceholder: "opencode-go API key",
		requiresSession: true,
		note: "Go is billed through your OpenCode subscription.",
	},
	{
		id: "opencode-zen",
		label: "OpenCode Zen",
		kind: "openai-compat",
		baseUrl: "https://opencode.ai/zen/v1",
		models: [
			"deepseek-v4-flash",
			"deepseek-v4-pro",
			"glm-5.3",
			"glm-5.2",
			"kimi-k3",
			"kimi-k2.6",
			"minimax-m3",
			"qwen3.7-plus",
		],
		defaultModel: "deepseek-v4-flash",
		keyPlaceholder: "sk-...",
		requiresSession: true,
		note: "Zen is pay-per-use; free models only work inside the OpenCode app.",
	},
	{
		id: "openai",
		label: "OpenAI",
		kind: "openai-compat",
		baseUrl: "https://api.openai.com/v1",
		models: ["gpt-5.4-mini", "gpt-5.4", "gpt-5.2", "gpt-4o"],
		defaultModel: "gpt-5.4-mini",
		keyPlaceholder: "sk-...",
	},
	{
		id: "groq",
		label: "Groq",
		kind: "openai-compat",
		baseUrl: "https://api.groq.com/openai/v1",
		models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3-32b"],
		defaultModel: "llama-3.3-70b-versatile",
		keyPlaceholder: "gsk_...",
	},
	{
		id: "gemini",
		label: "Google Gemini",
		kind: "gemini",
		models: ["gemini-3.5-flash", "gemini-3-flash", "gemini-3.1-pro"],
		defaultModel: "gemini-3.5-flash",
		keyPlaceholder: "AIza...",
	},
	{
		id: "anthropic",
		label: "Anthropic",
		kind: "anthropic",
		models: ["claude-sonnet-4-6", "claude-haiku-4-5", "claude-opus-4-6"],
		defaultModel: "claude-sonnet-4-6",
		keyPlaceholder: "sk-ant-...",
	},
	{
		id: "custom",
		label: "Custom (OpenAI-compatible)",
		kind: "openai-compat",
		models: [],
		defaultModel: "",
		keyPlaceholder: "API key",
		requiresBaseUrl: true,
		note: "Any endpoint that implements POST /chat/completions.",
	},
];

export interface ProviderSettings {
	providerId: ProviderId;
	baseUrl: string;
	keys: Partial<Record<ProviderId, string>>;
	models: Partial<Record<ProviderId, string>>;
}

const SETTINGS_STORAGE_KEY = "pptgen.settings";
const SESSION_STORAGE_KEY = "pptgen.session";

export function getProviderPreset(id: ProviderId): ProviderPreset {
	return PROVIDER_PRESETS.find((preset) => preset.id === id) ?? PROVIDER_PRESETS[0];
}

export function defaultSettings(): ProviderSettings {
	return {
		providerId: "opencode-go",
		baseUrl: "",
		keys: {},
		models: {},
	};
}

export function loadSettings(): ProviderSettings {
	if (typeof window === "undefined") return defaultSettings();
	try {
		const raw = window.sessionStorage.getItem(SETTINGS_STORAGE_KEY);
		if (!raw) return defaultSettings();
		const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
		return {
			...defaultSettings(),
			...parsed,
			keys: parsed.keys ?? {},
			models: parsed.models ?? {},
		};
	} catch {
		return defaultSettings();
	}
}

export function saveSettings(settings: ProviderSettings): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(
			SETTINGS_STORAGE_KEY,
			JSON.stringify(settings),
		);
	} catch {
		// storage full or unavailable; settings remain in memory
	}
}

export function activeKey(settings: ProviderSettings): string {
	return settings.keys[settings.providerId]?.trim() ?? "";
}

export function activeModel(settings: ProviderSettings): string {
	const custom = settings.models[settings.providerId]?.trim();
	if (custom) return custom;
	return getProviderPreset(settings.providerId).defaultModel;
}

export function activeBaseUrl(settings: ProviderSettings): string | undefined {
	const preset = getProviderPreset(settings.providerId);
	if (preset.requiresBaseUrl) {
		return settings.baseUrl.trim() || undefined;
	}
	return undefined;
}

export function getSessionId(): string {
	const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
	if (existing) return existing;
	const sessionId = `ses_slideforge_${crypto.randomUUID()}`;
	window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
	return sessionId;
}
