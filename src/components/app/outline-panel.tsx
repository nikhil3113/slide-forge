import {
	CircleCheckIcon,
	CircleIcon,
	RotateCcwIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { SlideState } from "@/hooks/use-deck-generation";
import type { Outline } from "@/types/deck";

interface OutlinePanelProps {
	outline: Outline;
	slides: SlideState[];
	onRetry: (index: number) => void;
}

function StatusIcon({ status }: { status: SlideState["status"] }) {
	if (status === "streaming") {
		return <Spinner className="size-3.5 text-primary" />;
	}
	if (status === "done") {
		return <CircleCheckIcon className="size-3.5 text-emerald-500" />;
	}
	if (status === "error") {
		return <TriangleAlertIcon className="size-3.5 text-destructive" />;
	}
	return <CircleIcon className="size-3.5 text-muted-foreground/50" />;
}

export function OutlinePanel({ outline, slides, onRetry }: OutlinePanelProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm">{outline.title}</CardTitle>
				<CardDescription>
					{outline.slides.length} slides · {outline.theme} theme
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-1">
				{slides.map((slide) => (
					<div
						key={slide.index}
						className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50"
					>
						<StatusIcon status={slide.status} />
						<span className="w-4 text-right text-xs text-muted-foreground tabular-nums">
							{slide.index + 1}
						</span>
						<span className="min-w-0 flex-1 truncate text-sm">
							{slide.outline.title}
						</span>
						{slide.status === "error" ? (
							<Button
								variant="ghost"
								size="icon-xs"
								title={slide.error?.message ?? "Retry slide"}
								onClick={() => onRetry(slide.index)}
							>
								<RotateCcwIcon />
							</Button>
						) : (
							<Badge variant="outline" className="shrink-0">
								{slide.outline.layout}
							</Badge>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}
