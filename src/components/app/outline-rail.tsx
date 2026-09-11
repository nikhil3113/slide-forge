import {
	CircleCheckIcon,
	CircleIcon,
	RotateCcwIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { HtmlSlideState } from "@/hooks/use-deck-workspace";

interface OutlineRailProps {
	states: HtmlSlideState[];
	activeIndex?: number;
	onSelect: (index: number) => void;
	onRetry: (index: number) => void;
}

function StatusIcon({ status }: { status: HtmlSlideState["status"] }) {
	if (status === "streaming") {
		return <Spinner className="size-3.5 shrink-0 text-primary" />;
	}
	if (status === "done") {
		return <CircleCheckIcon className="size-3.5 shrink-0 text-emerald-500" />;
	}
	if (status === "error") {
		return <TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" />;
	}
	return <CircleIcon className="size-3.5 shrink-0 text-muted-foreground/50" />;
}

export function OutlineRail({
	states,
	activeIndex,
	onSelect,
	onRetry,
}: OutlineRailProps) {
	return (
		<div className="flex flex-col gap-1 p-2">
			<p className="px-2 pb-1 pt-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
				Outline
			</p>
			{states.map((state) => (
				<div
					key={state.index}
					className={cn(
						"group flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 transition-colors",
						activeIndex === state.index
							? "bg-muted"
							: "hover:bg-muted/60",
					)}
					onClick={() => onSelect(state.index)}
				>
					<StatusIcon status={state.status} />
					<span className="w-4 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
						{state.index + 1}
					</span>
					<span
						className={cn(
							"min-w-0 flex-1 truncate text-xs",
							state.status === "error" && "text-destructive",
						)}
						title={state.outline.title}
					>
						{state.outline.title}
					</span>
					{state.status === "error" ? (
						<Button
							variant="ghost"
							size="icon-xs"
							title={state.error?.message ?? "Retry slide"}
							onClick={(event) => {
								event.stopPropagation();
								onRetry(state.index);
							}}
						>
							<RotateCcwIcon />
						</Button>
					) : (
						<span className="shrink-0 text-[9px] text-muted-foreground/70 uppercase">
							{state.outline.layout}
						</span>
					)}
				</div>
			))}
		</div>
	);
}
