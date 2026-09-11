import { z } from "zod";
import { OutlineSchema, ProviderConfigSchema } from "./deck";

export const StyleGuideSchema = z.object({
	guide: z.string().min(40).max(4000),
});
export type StyleGuide = z.infer<typeof StyleGuideSchema>;

export const StyleGuideRequestSchema = ProviderConfigSchema.extend({
	outline: OutlineSchema,
});
export type StyleGuideRequest = z.infer<typeof StyleGuideRequestSchema>;

export const SlideHtmlRequestSchema = ProviderConfigSchema.extend({
	outline: OutlineSchema,
	index: z.coerce.number().int().min(0),
	styleGuide: StyleGuideSchema,
	instruction: z.string().max(400).optional(),
	previousHtml: z.string().max(80000).optional(),
});
export type SlideHtmlRequest = z.infer<typeof SlideHtmlRequestSchema>;

export const SlideHtmlResultSchema = z.object({
	html: z.string().min(100).max(80000),
	notes: z.string().max(4000),
});
export type SlideHtmlResult = z.infer<typeof SlideHtmlResultSchema>;

export const CSS_TOKEN_NAMES = [
	"--slide-bg",
	"--slide-surface",
	"--slide-border",
	"--slide-text",
	"--slide-muted",
	"--slide-accent",
	"--slide-accent-2",
	"--slide-accent-text",
	"--slide-font",
	"--deck-title",
] as const;
