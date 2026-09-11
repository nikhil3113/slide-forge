import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StreamRequestError } from "@/lib/api";
import { generateChat } from "@/lib/chat";
import { tryParsePartial } from "@/lib/partial-json";
import type { ProviderSettings } from "@/lib/providers";
import type {
	ChatAction,
	ChatHistoryMessage,
	WorkspaceMessage,
} from "@/types/chat";
import type { ThemeId } from "@/types/deck";
import type { DeckWorkspace } from "./use-deck-workspace";

export interface ChatBriefState {
	slideCount: number;
	theme: ThemeId;
	tone: string;
	audience: string;
	askUpfront: boolean;
}

interface UseDeckChatParams {
	settings: ProviderSettings;
	workspace: DeckWorkspace;
	brief: ChatBriefState;
}

const MAX_HISTORY = 12;

function createMessage(
	message: Omit<WorkspaceMessage, "id">,
): WorkspaceMessage {
	return { id: crypto.randomUUID(), ...message };
}

function buildHistory(messages: WorkspaceMessage[]): ChatHistoryMessage[] {
	return messages
		.filter(
			(message) =>
				message.role === "user" ||
				(message.role === "assistant" &&
					message.status !== "error" &&
					message.content.trim().length > 0),
		)
		.slice(-MAX_HISTORY)
		.map((message) => ({
			role: message.role as "user" | "assistant",
			content: message.content.slice(0, 2000),
		}));
}

function buildDeckSummary(workspace: DeckWorkspace) {
	if (!workspace.outline) return undefined;
	return {
		title: workspace.title || workspace.outline.title,
		theme: workspace.theme,
		slides: workspace.slideStates.map((slide) => ({
			number: slide.index + 1,
			title: slide.outline.title,
			layout: slide.outline.layout,
			status: slide.status,
		})),
	};
}

function cleanFallbackText(raw: string): string {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const text = (fenced?.[1] ?? raw).trim();
	return text.length > 0 ? text.slice(0, 1200) : "I could not process that.";
}

export function useDeckChat(params: UseDeckChatParams) {
	const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
	const [streaming, setStreaming] = useState(false);

	const paramsRef = useRef(params);
	const messagesRef = useRef(messages);
	const streamingRef = useRef(streaming);
	const controllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		paramsRef.current = params;
	}, [params]);

	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	useEffect(() => {
		streamingRef.current = streaming;
	}, [streaming]);

	useEffect(() => {
		return () => controllerRef.current?.abort();
	}, []);

	const hydrateMessages = useCallback((stored: WorkspaceMessage[]) => {
		setMessages(
			stored.map((message) =>
				message.status === "streaming"
					? {
							...message,
							status: "done" as const,
							content: message.content.trim() || "…",
						}
					: message,
			),
		);
	}, []);

	const resetMessages = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setMessages([]);
		setStreaming(false);
	}, []);

	const stop = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setStreaming(false);
	}, []);

	const executeAction = useCallback(
		async (
			action: ChatAction,
			workspace: DeckWorkspace,
			brief: ChatBriefState,
		) => {
			switch (action.type) {
				case "none":
					return;
				case "create-outline":
					void workspace.startDeck({
						topic: action.topic,
						slideCount: action.slideCount ?? brief.slideCount,
						theme: action.theme ?? brief.theme,
						audience: action.audience ?? (brief.audience || undefined),
						tone: action.tone ?? (brief.tone || undefined),
					});
					return;
				case "generate-slides":
					void workspace.generateSlides();
					return;
				case "edit-slide": {
					const index = action.slideNumber - 1;
					if (!workspace.outline?.slides[index]) {
						toast.error(`Slide ${action.slideNumber} does not exist.`);
						return;
					}
					await workspace.editSlide(index, action.instruction);
					return;
				}
				case "add-slide": {
					if (!workspace.outline) {
						toast.error("Create a deck before adding slides.");
						return;
					}
					await workspace.addSlide(action.afterSlideNumber, {
						title: action.title,
						summary: action.summary,
						layout: action.layout ?? "bullets",
					});
					return;
				}
				case "remove-slide": {
					const index = action.slideNumber - 1;
					if (!workspace.outline?.slides[index]) {
						toast.error(`Slide ${action.slideNumber} does not exist.`);
						return;
					}
					workspace.removeSlide(index);
					return;
				}
				case "set-theme":
					workspace.changeTheme(action.theme);
					return;
				case "update-deck":
					workspace.updateDeck({
						title: action.title,
						subtitle: action.subtitle,
					});
					return;
			}
		},
		[],
	);

	const sendMessage = useCallback(
		async (text: string) => {
			const value = text.trim();
			if (!value || streamingRef.current) return;

			const { settings, workspace, brief } = paramsRef.current;
			const userMessage = createMessage({
				role: "user",
				content: value,
				status: "done",
			});
			const assistant = createMessage({
				role: "assistant",
				content: "",
				status: "streaming",
			});
			const history = buildHistory([...messagesRef.current, userMessage]);

			setMessages((current) => [...current, userMessage, assistant]);
			setStreaming(true);
			streamingRef.current = true;

			const controller = new AbortController();
			controllerRef.current = controller;

			const deck = buildDeckSummary(workspace);
			const chatBrief = {
				slideCount: brief.slideCount,
				theme: brief.theme,
				...(brief.tone ? { tone: brief.tone } : {}),
				...(brief.audience ? { audience: brief.audience } : {}),
				askUpfront: brief.askUpfront,
			};

			let raw = "";

			try {
				const response = await generateChat(
					{
						messages: history,
						...(deck ? { deck } : {}),
						brief: chatBrief,
					},
					settings,
					{
						signal: controller.signal,
						onDelta: (delta) => {
							raw += delta;
							const partial = tryParsePartial(raw);
							const preview =
								typeof partial?.reply === "string" ? partial.reply : "";
							setMessages((current) =>
								current.map((message) =>
									message.id === assistant.id
										? { ...message, content: preview }
										: message,
								),
							);
						},
					},
				);

				setMessages((current) =>
					current.map((message) =>
						message.id === assistant.id
							? {
									...message,
									content: response.reply,
									action: response.action,
									status: "done",
								}
							: message,
					),
				);

				await executeAction(response.action, workspace, brief);
			} catch (caught) {
				if (controller.signal.aborted) {
					setMessages((current) =>
						current.map((message) =>
							message.id === assistant.id && message.status === "streaming"
								? {
										...message,
										status: "done",
										content: message.content || "Stopped.",
									}
								: message,
						),
					);
				} else if (
					caught instanceof StreamRequestError &&
					caught.code === "invalid_json"
				) {
					setMessages((current) =>
						current.map((message) =>
							message.id === assistant.id
								? {
										...message,
										status: "done",
										content: cleanFallbackText(raw),
									}
								: message,
						),
					);
				} else {
					const errorMessage =
						caught instanceof Error ? caught.message : "Chat failed.";
					setMessages((current) =>
						current.map((message) =>
							message.id === assistant.id
								? {
										...message,
										status: "error",
										error: errorMessage,
										content: errorMessage,
									}
								: message,
						),
					);
					toast.error(errorMessage);
				}
			} finally {
				controllerRef.current = null;
				setStreaming(false);
				streamingRef.current = false;
			}
		},
		[executeAction],
	);

	return {
		messages,
		streaming,
		sendMessage,
		stop,
		hydrateMessages,
		resetMessages,
	};
}

export type DeckChat = ReturnType<typeof useDeckChat>;
