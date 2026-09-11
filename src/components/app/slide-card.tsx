import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { HtmlSlideState } from "@/hooks/use-deck-workspace";
import { SlideCanvas } from "./slide-canvas";

interface SlideCardProps {
	state: HtmlSlideState;
	tokensCss: string;
	onRetry: (index: number) => void;
}

export function SlideCard({ state, tokensCss, onRetry }: SlideCardProps) {
	const source =
		state.status === "streaming" && state.partialHtml
			? state.partialHtml
			: (state.html ?? state.partialHtml);

	return (
		<div className="flex flex-col gap-2">
			<div className="relative aspect-video overflow-hidden rounded-xl border border-border shadow-sm">
				{source ? (
					<SlideCanvas source={source} tokensCss={tokensCss} />
				) : (
					<div className="flex h-full flex-col justify-center gap-3 p-6">
						<Skeleton className="h-4 w-2/3 bg-foreground/10" />
						<Skeleton className="h-3 w-full bg-foreground/10" />
						<Skeleton className="h-3 w-5/6 bg-foreground/10" />
						<Skeleton className="h-3 w-4/6 bg-foreground/10" />
					</div>
				)}

				{state.status === "streaming" ? (
					<span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] text-white backdrop-blur">
						<Spinner className="size-3" />
						writing
					</span>
				) : null}

				{state.status === "error" ? (
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center backdrop-blur-sm">
						<TriangleAlertIcon className="size-5 text-destructive" />
						<p className="line-clamp-3 text-[10px] leading-snug text-white/90">
							{state.error?.message ?? "This slide failed to generate."}
						</p>
						<Button
							variant="secondary"
							size="xs"
							onClick={() => onRetry(state.index)}
						>
							<RotateCcwIcon />
							Retry
						</Button>
					</div>
				) : null}
			</div>

			<div className="flex items-center gap-2 px-1">
				<span className="text-xs text-muted-foreground tabular-nums">
					{state.index + 1}
				</span>
				<span
					className={cn(
						"min-w-0 flex-1 truncate text-xs",
						state.status === "error" && "text-destructive",
					)}
				>
					{state.outline.title}
				</span>
				<Badge variant="outline" className="shrink-0">
					{state.outline.layout}
				</Badge>
			</div>
		</div>
	);
}
