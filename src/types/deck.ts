import { z } from "zod";

export const ProviderIdSchema = z.enum([
	"opencode-go",
	"opencode-zen",
	"openai",
	"groq",
	"gemini",
	"anthropic",
	"custom",
]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const THEME_IDS = [
	"midnight",
	"paper",
	"ocean",
	"sunset",
	"forest",
	"nebula",
	"linen",
] as const;
export const ThemeIdSchema = z.enum(THEME_IDS);
export type ThemeId = z.infer<typeof ThemeIdSchema>;

export const LAYOUTS = [
	"title",
	"bullets",
	"two-column",
	"quote",
	"stats",
	"timeline",
	"section",
	"image-split",
	"closing",
] as const;
export const LayoutSchema = z.enum(LAYOUTS);
export type Layout = z.infer<typeof LayoutSchema>;

export const OutlineSlideSchema = z.object({
	title: z.string().min(1),
	summary: z.string().min(1),
	layout: LayoutSchema,
});
export type OutlineSlide = z.infer<typeof OutlineSlideSchema>;

export const OutlineSchema = z.object({
	title: z.string().min(1),
	subtitle: z.string().default(""),
	theme: ThemeIdSchema,
	slides: z.array(OutlineSlideSchema).min(1).max(20),
});
export type Outline = z.infer<typeof OutlineSchema>;

export const ProviderConfigSchema = z.object({
	provider: ProviderIdSchema,
	model: z.string().min(1).max(200),
	baseUrl: z.url().optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const OutlineRequestSchema = ProviderConfigSchema.extend({
	topic: z.string().min(1).max(2000),
	slideCount: z.coerce.number().int().min(3).max(20).default(8),
	theme: ThemeIdSchema.default("midnight"),
	audience: z.string().max(200).optional(),
	tone: z.string().max(200).optional(),
});
export type OutlineRequest = z.infer<typeof OutlineRequestSchema>;

export type StreamErrorCode =
	| "unauthorized"
	| "invalid_json"
	| "invalid_html"
	| "provider_error"
	| "aborted"
	| "internal";

export type StreamError = {
	message: string;
	code: StreamErrorCode;
};

export type SSEEventHandler = {
	onDelta?: (text: string) => void;
	onResult?: (data: unknown) => void;
	onError?: (error: StreamError) => void;
};
