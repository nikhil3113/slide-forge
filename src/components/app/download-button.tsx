import { useState } from "react";
import {
	ChevronDownIcon,
	DownloadIcon,
	ImageIcon,
	TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { downloadDeck, type ExportMode } from "@/lib/export-pptx";
import { getTheme } from "@/lib/themes";
import type { WorkspaceSnapshot } from "@/hooks/use-deck-workspace";

interface DownloadButtonProps {
	snapshot: WorkspaceSnapshot;
	tokensCss: string;
}

const SUCCESS_LABELS: Record<ExportMode, string> = {
	image: "PowerPoint downloaded",
	editable: "Editable PowerPoint downloaded",
};

export function DownloadButton({ snapshot, tokensCss }: DownloadButtonProps) {
	const [building, setBuilding] = useState(false);
	const [progress, setProgress] = useState<{ done: number; total: number }>();

	const ready =
		!!snapshot.outline &&
		snapshot.slides.length === snapshot.outline.slides.length &&
		snapshot.slides.length > 0;

	const handleDownload = async (mode: ExportMode) => {
		if (!ready || building) return;
		setBuilding(true);
		try {
			const theme = getTheme(snapshot.theme);
			const fileName = await downloadDeck(
				{
					title: snapshot.title || snapshot.outline?.title || "SlideForge deck",
					subtitle: snapshot.subtitle,
					tokensCss,
					backgroundColor: `#${theme.background}`,
					slides: [...snapshot.slides]
						.sort((a, b) => a.index - b.index)
						.map((entry) => ({ html: entry.html, notes: entry.notes })),
				},
				{
					mode,
					onProgress: (done, total) => setProgress({ done, total }),
				},
			);
			toast.success(SUCCESS_LABELS[mode], { description: fileName });
		} catch (error) {
			toast.error("Could not build the PowerPoint file", {
				description: error instanceof Error ? error.message : "Unknown error.",
			});
		} finally {
			setBuilding(false);
			setProgress(undefined);
		}
	};

	const busyLabel = progress
		? `Rendering ${progress.done}/${progress.total}`
		: "Rendering…";

	return (
		<div className="flex items-center gap-1">
			<Button
				size="sm"
				disabled={!ready || building}
				onClick={() => void handleDownload("image")}
				title={ready ? "Download pixel-perfect .pptx" : "Generate all slides first"}
			>
				{building ? <Spinner /> : <DownloadIcon />}
				{building ? busyLabel : "Download"}
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					disabled={!ready || building}
					render={
						<Button size="icon-sm" variant="outline" aria-label="Export options" />
					}
				>
					<ChevronDownIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-72">
					<DropdownMenuGroup>
						<DropdownMenuLabel>Export format</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => void handleDownload("image")}>
							<ImageIcon />
							<span className="flex flex-col gap-0.5">
								<span>Pixel-perfect slides</span>
								<span className="text-xs font-normal text-muted-foreground">
									Each slide is one image. Best fidelity, not editable.
								</span>
							</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => void handleDownload("editable")}>
							<TypeIcon />
							<span className="flex flex-col gap-0.5">
								<span>Editable text</span>
								<span className="text-xs font-normal text-muted-foreground">
									Text becomes real PowerPoint text boxes over the visuals.
								</span>
							</span>
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
