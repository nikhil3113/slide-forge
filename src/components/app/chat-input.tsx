import { useState } from "react";
import { ArrowUpIcon, SlidersHorizontalIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
	streaming: boolean;
	disabled?: boolean;
	onSend: (text: string) => void;
	onStop: () => void;
	briefOpen: boolean;
	onToggleBrief: () => void;
}

export function ChatInput({
	streaming,
	disabled,
	onSend,
	onStop,
	briefOpen,
	onToggleBrief,
}: ChatInputProps) {
	const [value, setValue] = useState("");

	const submit = () => {
		const text = value.trim();
		if (!text || streaming || disabled) return;
		setValue("");
		onSend(text);
	};

	return (
		<div className="flex items-end gap-2 border-t border-border/60 p-3">
			<Button
				variant={briefOpen ? "secondary" : "ghost"}
				size="icon-sm"
				onClick={onToggleBrief}
				title="Deck brief"
			>
				<SlidersHorizontalIcon />
			</Button>
			<Textarea
				value={value}
				disabled={disabled}
				placeholder="Describe your deck, or tell me what to change…"
				className={cn("max-h-32 min-h-9 flex-1 resize-none py-2")}
				rows={1}
				onChange={(event) => setValue(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) {
						event.preventDefault();
						submit();
					}
				}}
			/>
			{streaming ? (
				<Button variant="outline" size="icon-sm" onClick={onStop} title="Stop">
					<SquareIcon />
				</Button>
			) : (
				<Button
					size="icon-sm"
					onClick={submit}
					disabled={value.trim().length === 0 || disabled}
					title="Send"
				>
					<ArrowUpIcon />
				</Button>
			)}
		</div>
	);
}
