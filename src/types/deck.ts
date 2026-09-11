import { z } from "zod";

export const ProviderIdSchema = z.enum([
	"opencode-zen",
	"openai",
	"groq",
	"gemini",
	"anthropic",
	"custom",
]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const THEME_IDS = ["midnight", "paper", "ocean", "sunset", "forest"] as const;
export const ThemeIdSchema = z.enum(THEME_IDS);
export type ThemeId = z.infer<typeof ThemeIdSchema>;

export const LAYOUTS = [
	"title",
	"bullets",
	"two-column",
	"quote",
	"stats",
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

const NotesSchema = z.string().default("");

const TitleSlideSchema = z.object({
	layout: z.literal("title"),
	title: z.string().min(1),
	subtitle: z.string().default(""),
	notes: NotesSchema,
});

const BulletsSlideSchema = z.object({
	layout: z.literal("bullets"),
	title: z.string().min(1),
	bullets: z.array(z.string().min(1)).min(1).max(7),
	notes: NotesSchema,
});

const TwoColumnSlideSchema = z.object({
	layout: z.literal("two-column"),
	title: z.string().min(1),
	left: z.object({
		heading: z.string().min(1),
		bullets: z.array(z.string().min(1)).min(1).max(5),
	}),
	right: z.object({
		heading: z.string().min(1),
		bullets: z.array(z.string().min(1)).min(1).max(5),
	}),
	notes: NotesSchema,
});

const QuoteSlideSchema = z.object({
	layout: z.literal("quote"),
	title: z.string().default(""),
	quote: z.string().min(1),
	attribution: z.string().default(""),
	notes: NotesSchema,
});

const StatsSlideSchema = z.object({
	layout: z.literal("stats"),
	title: z.string().min(1),
	stats: z
		.array(
			z.object({
				value: z.string().min(1),
				label: z.string().min(1),
			}),
		)
		.min(2)
		.max(4),
	notes: NotesSchema,
});

const ClosingSlideSchema = z.object({
	layout: z.literal("closing"),
	title: z.string().min(1),
	subtitle: z.string().default(""),
	cta: z.string().default(""),
	notes: NotesSchema,
});

export const SlideSchema = z.discriminatedUnion("layout", [
	TitleSlideSchema,
	BulletsSlideSchema,
	TwoColumnSlideSchema,
	QuoteSlideSchema,
	StatsSlideSchema,
	ClosingSlideSchema,
]);
export type Slide = z.infer<typeof SlideSchema>;

export const DeckSchema = z.object({
	title: z.string().min(1),
	subtitle: z.string().default(""),
	theme: ThemeIdSchema,
	slides: z.array(SlideSchema).min(1),
});
export type Deck = z.infer<typeof DeckSchema>;

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

export const SlideRequestSchema = ProviderConfigSchema.extend({
	outline: OutlineSchema,
	index: z.coerce.number().int().min(0),
});
export type SlideRequest = z.infer<typeof SlideRequestSchema>;

export type StreamErrorCode =
	| "unauthorized"
	| "invalid_json"
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
