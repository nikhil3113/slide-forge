import {
	LayoutGridIcon,
	PlusIcon,
	PresentationIcon,
	SquareIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
	DeckWorkspace,
	WorkspaceSnapshot,
} from "@/hooks/use-deck-workspace";
import { DownloadButton } from "./download-button";

interface WorkspaceToolbarProps {
	snapshot: WorkspaceSnapshot;
	tokensCss: string;
	progress: DeckWorkspace["progress"];
	phase: DeckWorkspace["phase"];
	grid: boolean;
	onToggleGrid: () => void;
	onStop: () => void;
	onNewDeck: () => void;
}

export function WorkspaceToolbar({
	snapshot,
	tokensCss,
	progress,
	phase,
	grid,
	onToggleGrid,
	onStop,
	onNewDeck,
}: WorkspaceToolbarProps) {
	const generating = phase === "outlining" || phase === "slides";
	const title = snapshot.title || snapshot.outline?.title || "Untitled deck";

	return (
		<div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-2.5">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<span className="truncate text-sm font-medium">{title}</span>
				<Badge variant="outline" className="shrink-0">
					{snapshot.theme}
				</Badge>
			</div>

			{progress.total > 0 ? (
				<div className="flex items-center gap-2">
					<Progress value={progress.percent} className="w-28" />
					<span className="text-xs text-muted-foreground tabular-nums">
						{progress.done}/{progress.total}
					</span>
				</div>
			) : null}

			<div className="flex items-center gap-1.5">
				{generating ? (
					<Button variant="outline" size="sm" onClick={onStop}>
						<SquareIcon />
						Stop
					</Button>
				) : null}
				<Button
					variant="outline"
					size="icon-sm"
					onClick={onToggleGrid}
					title={grid ? "Focus view" : "Grid view"}
				>
					{grid ? <PresentationIcon /> : <LayoutGridIcon />}
				</Button>
				{snapshot.outline ? (
					<DownloadButton snapshot={snapshot} tokensCss={tokensCss} />
				) : null}
				<Button
					variant="ghost"
					size="sm"
					onClick={onNewDeck}
					title="Start a new deck"
				>
					<PlusIcon />
					New
				</Button>
			</div>
		</div>
	);
}
