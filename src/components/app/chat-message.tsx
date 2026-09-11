import { SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatAction, WorkspaceMessage } from "@/types/chat";

function actionLabel(action: ChatAction): string | undefined {
	switch (action.type) {
		case "create-outline":
			return "building outline";
		case "generate-slides":
			return "generating slides";
		case "edit-slide":
			return `updating slide ${action.slideNumber}`;
		case "add-slide":
			return "adding a slide";
		case "remove-slide":
			return `removing slide ${action.slideNumber}`;
		case "set-theme":
			return `theme set to ${action.theme}`;
		case "update-deck":
			return "updating deck";
		default:
			return undefined;
	}
}

export function ChatMessage({ message }: { message: WorkspaceMessage }) {
	if (message.role === "user") {
		return (
			<div className="flex justify-end">
				<div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
					{message.content}
				</div>
			</div>
		);
	}

	const label = message.action ? actionLabel(message.action) : undefined;

	return (
		<div className="flex gap-2.5">
			<span
				className={cn(
					"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg",
					message.status === "error"
						? "bg-destructive/10 text-destructive"
						: "bg-primary/10 text-primary",
				)}
			>
				{message.status === "error" ? (
					<TriangleAlertIcon className="size-3.5" />
				) : (
					<SparklesIcon className="size-3.5" />
				)}
			</span>
			<div className="min-w-0 flex-1">
				<p
					className={cn(
						"text-sm leading-relaxed whitespace-pre-wrap",
						message.status === "error" && "text-destructive",
					)}
				>
					{message.content}
					{message.status === "streaming" ? (
						<span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-foreground/50 align-text-bottom" />
					) : null}
				</p>
				{label && message.status === "done" ? (
					<Badge variant="secondary" className="mt-1.5">
						{label}
					</Badge>
				) : null}
			</div>
		</div>
	);
}
