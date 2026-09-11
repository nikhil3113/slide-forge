import { CheckCheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { DeckGeneration } from "@/hooks/use-deck-generation";

interface ProgressPanelProps {
	phase: DeckGeneration["phase"];
	progress: DeckGeneration["progress"];
	outlineChars: number;
	onCancel: () => void;
}

export function ProgressPanel({
	phase,
	progress,
	outlineChars,
	onCancel,
}: ProgressPanelProps) {
	if (phase === "idle") return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					{phase === "done" ? (
						<CheckCheckIcon className="size-4 text-emerald-500" />
					) : (
						<Spinner className="size-4 text-primary" />
					)}
					{phase === "outlining"
						? "Planning the deck"
						: phase === "slides"
							? "Writing slides"
							: "Deck ready"}
				</CardTitle>
				<CardDescription>
					{phase === "outlining"
						? `Receiving outline… ${outlineChars} chars`
						: phase === "slides"
							? `${progress.done} of ${progress.total} slides done${
									progress.failed > 0
										? ` · ${progress.failed} failed`
										: ""
								}`
							: `${progress.total} slides generated`}
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3">
				<Progress value={phase === "outlining" ? null : progress.percent} />
				{phase === "outlining" || phase === "slides" ? (
					<Button variant="outline" size="sm" onClick={onCancel}>
						<XIcon />
						Stop
					</Button>
				) : null}
			</CardContent>
		</Card>
	);
}
