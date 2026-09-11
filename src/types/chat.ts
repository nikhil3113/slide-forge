import { z } from "zod";
import {
	LayoutSchema,
	ProviderConfigSchema,
	ThemeIdSchema,
} from "./deck";

export const ChatActionSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("none") }),
	z.object({
		type: z.literal("create-outline"),
		topic: z.string().min(1).max(400),
		slideCount: z.coerce.number().int().min(3).max(20).optional(),
		theme: ThemeIdSchema.optional(),
		audience: z.string().max(200).optional(),
		tone: z.string().max(200).optional(),
	}),
	z.object({ type: z.literal("generate-slides") }),
	z.object({
		type: z.literal("edit-slide"),
		slideNumber: z.coerce.number().int().min(1).max(50),
		instruction: z.string().min(1).max(400),
	}),
	z.object({
		type: z.literal("add-slide"),
		afterSlideNumber: z.coerce.number().int().min(0).max(50),
		title: z.string().min(1).max(120),
		summary: z.string().min(1).max(400),
		layout: LayoutSchema.optional(),
	}),
	z.object({
		type: z.literal("remove-slide"),
		slideNumber: z.coerce.number().int().min(1).max(50),
	}),
	z.object({ type: z.literal("set-theme"), theme: ThemeIdSchema }),
	z.object({
		type: z.literal("update-deck"),
		title: z.string().min(1).max(160).optional(),
		subtitle: z.string().max(200).optional(),
	}),
]);
export type ChatAction = z.infer<typeof ChatActionSchema>;

export const ChatResponseSchema = z.object({
	reply: z.string().min(1).max(1200),
	action: ChatActionSchema.default({ type: "none" }),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ChatHistoryMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().max(4000),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

export const DeckSummarySchema = z.object({
	title: z.string(),
	theme: ThemeIdSchema,
	slides: z
		.array(
			z.object({
				number: z.number(),
				title: z.string(),
				layout: LayoutSchema,
				status: z.string(),
			}),
		)
		.max(20),
});
export type DeckSummary = z.infer<typeof DeckSummarySchema>;

export const ChatBriefSchema = z.object({
	slideCount: z.coerce.number().int().min(3).max(20).optional(),
	theme: ThemeIdSchema.optional(),
	tone: z.string().max(100).optional(),
	audience: z.string().max(200).optional(),
	askUpfront: z.boolean().default(true),
});

export const ChatRequestSchema = ProviderConfigSchema.extend({
	messages: z.array(ChatHistoryMessageSchema).min(1).max(20),
	deck: DeckSummarySchema.optional(),
	brief: ChatBriefSchema.optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface WorkspaceMessage {
	id: string;
	role: "user" | "assistant" | "activity";
	content: string;
	status?: "streaming" | "done" | "error";
	action?: ChatAction;
	error?: string;
}
