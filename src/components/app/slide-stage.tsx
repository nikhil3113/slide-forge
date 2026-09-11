import {
	ChevronLeftIcon,
	ChevronRightIcon,
	NotebookPenIcon,
} from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { tryParsePartial } from "@/lib/partial-json";
import { cssBackground, getTheme } from "@/lib/themes";
import type { SlideState } from "@/hooks/use-deck-workspace";
import type { ThemeId } from "@/types/deck";
import { SlidePreview } from "./slide-preview";

interface SlideStageProps {
	state?: SlideState;
	themeId: ThemeId;
	index: number;
	total: number;
	onPrev: () => void;
	onNext: () => void;
}

export function SlideStage({
	state,
	themeId,
	index,
	total,
	onPrev,
	onNext,
}: SlideStageProps) {
	const theme = getTheme(themeId);
	const previewData = state
		? state.status === "streaming"
			? tryParsePartial(state.partial)
			: state.slide
				? (state.slide as unknown as Record<string, unknown>)
				: undefined
		: undefined;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			<AspectRatio
				ratio={16 / 9}
				className="relative w-full max-w-[1100px] self-center overflow-hidden rounded-2xl border border-border shadow-lg"
				style={{ backgroundImage: cssBackground(theme) }}
			>
				{state ? (
					previewData ? (
						<SlidePreview
							layout={state.outline.layout}
							data={previewData}
							themeId={themeId}
						/>
					) : (
						<div className="flex h-full flex-col justify-center gap-3 p-8">
							<Skeleton className="h-5 w-2/3 bg-foreground/10" />
							<Skeleton className="h-4 w-full bg-foreground/10" />
							<Skeleton className="h-4 w-5/6 bg-foreground/10" />
							<Skeleton className="h-4 w-4/6 bg-foreground/10" />
						</div>
					)
				) : (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
						No slide selected
					</div>
				)}

				{state?.status === "streaming" ? (
					<span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white backdrop-blur">
						<Spinner className="size-3" />
						writing
					</span>
				) : null}
			</AspectRatio>

			<div className="flex items-center justify-center gap-3">
				<Button
					variant="outline"
					size="icon-sm"
					disabled={index <= 0}
					onClick={onPrev}
					aria-label="Previous slide"
				>
					<ChevronLeftIcon />
				</Button>
				<span className="min-w-20 text-center text-xs text-muted-foreground tabular-nums">
					{total === 0 ? "0 / 0" : `${index + 1} / ${total}`}
				</span>
				<Button
					variant="outline"
					size="icon-sm"
					disabled={index >= total - 1}
					onClick={onNext}
					aria-label="Next slide"
				>
					<ChevronRightIcon />
				</Button>
				{state ? (
					<Badge variant="outline" className="ml-2">
						{state.outline.layout}
					</Badge>
				) : null}
			</div>

			{state?.slide?.notes ? (
				<div className="max-w-[1100px] self-center rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
					<p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
						<NotebookPenIcon className="size-3" />
						Speaker notes
					</p>
					<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
						{state.slide.notes}
					</p>
				</div>
			) : null}
		</div>
	);
}
