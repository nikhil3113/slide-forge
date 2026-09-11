import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { tryParsePartial } from "@/lib/partial-json";
import { cssBackground, getTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { SlideState } from "@/hooks/use-deck-workspace";
import type { ThemeId } from "@/types/deck";
import { SlidePreview } from "./slide-preview";

interface SlideCardProps {
	state: SlideState;
	themeId: ThemeId;
	onRetry: (index: number) => void;
}

export function SlideCard({ state, themeId, onRetry }: SlideCardProps) {
	const theme = getTheme(themeId);
	const previewData =
		state.status === "streaming"
			? tryParsePartial(state.partial)
			: state.slide
				? (state.slide as unknown as Record<string, unknown>)
				: undefined;

	return (
		<div className="flex flex-col gap-2">
			<AspectRatio
				ratio={16 / 9}
				className="relative overflow-hidden rounded-xl border border-border shadow-sm"
				style={{ backgroundImage: cssBackground(theme) }}
			>
				{previewData ? (
					<SlidePreview
						layout={state.outline.layout}
						data={previewData}
						themeId={themeId}
					/>
				) : (
					<div className="flex h-full flex-col justify-center gap-3 p-6">
						<Skeleton className="h-4 w-2/3 bg-foreground/10" />
						<Skeleton className="h-3 w-full bg-foreground/10" />
						<Skeleton className="h-3 w-5/6 bg-foreground/10" />
						<Skeleton className="h-3 w-4/6 bg-foreground/10" />
					</div>
				)}

				{state.status === "streaming" ? (
					<span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] text-white backdrop-blur">
						<Spinner className="size-3" />
						writing
					</span>
				) : null}

				{state.status === "error" ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center backdrop-blur-sm">
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
			</AspectRatio>

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
