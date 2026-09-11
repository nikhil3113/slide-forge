import { useEffect, useRef, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ChatBriefState } from "@/hooks/use-deck-chat";
import type { WorkspaceMessage } from "@/types/chat";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { DeckBrief } from "./deck-brief";
import { QuickStart } from "./quick-start";

interface ChatPanelProps {
	messages: WorkspaceMessage[];
	streaming: boolean;
	brief: ChatBriefState;
	statusText?: string;
	statusError?: boolean;
	onSend: (text: string) => void;
	onStop: () => void;
	onBriefChange: (brief: ChatBriefState) => void;
	disabled?: boolean;
}

export function ChatPanel({
	messages,
	streaming,
	brief,
	statusText,
	statusError,
	onSend,
	onStop,
	onBriefChange,
	disabled,
}: ChatPanelProps) {
	const [briefOpen, setBriefOpen] = useState(false);
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages, statusText]);

	const visibleMessages = messages.filter((message) => message.content.length > 0);

	return (
		<div className="flex h-full min-h-0 flex-col bg-card/40">
			<div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
				<span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<SparklesIcon className="size-3.5" />
				</span>
				<span className="text-sm font-medium">Assistant</span>
				<label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
					Ask first
					<Switch
						checked={brief.askUpfront}
						onCheckedChange={(checked) =>
							onBriefChange({ ...brief, askUpfront: checked })
						}
					/>
				</label>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-4 p-3.5">
					{visibleMessages.length === 0 ? (
						<>
							<div className="flex gap-2.5">
								<span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<SparklesIcon className="size-3.5" />
								</span>
								<p className="text-sm leading-relaxed text-muted-foreground">
									Tell me what deck you need. I can plan the outline, write
									every slide, and change anything afterwards.
								</p>
							</div>
							<QuickStart onSelect={onSend} disabled={streaming} />
						</>
					) : (
						visibleMessages.map((message) => (
							<ChatMessage key={message.id} message={message} />
						))
					)}

					{statusText ? (
						<div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
							{statusError ? null : (
								<Spinner className="size-3.5 shrink-0 text-primary" />
							)}
							<span
								className={cn(
									"text-xs",
									statusError ? "text-destructive" : "text-muted-foreground",
								)}
							>
								{statusText}
							</span>
						</div>
					) : null}

					<div ref={endRef} />
				</div>
			</ScrollArea>

			{briefOpen ? (
				<div className="px-3 pb-2">
					<DeckBrief brief={brief} onChange={onBriefChange} disabled={streaming} />
				</div>
			) : null}

			<ChatInput
				streaming={streaming}
				disabled={disabled}
				onSend={onSend}
				onStop={onStop}
				briefOpen={briefOpen}
				onToggleBrief={() => setBriefOpen((open) => !open)}
			/>
		</div>
	);
}
