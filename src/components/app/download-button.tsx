import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { downloadDeck } from "@/lib/export-pptx";
import { getTheme } from "@/lib/themes";
import type { WorkspaceSnapshot } from "@/hooks/use-deck-workspace";

interface DownloadButtonProps {
	snapshot: WorkspaceSnapshot;
	tokensCss: string;
}

export function DownloadButton({ snapshot, tokensCss }: DownloadButtonProps) {
	const [building, setBuilding] = useState(false);
	const [progress, setProgress] = useState<{ done: number; total: number }>();

	const ready =
		!!snapshot.outline &&
		snapshot.slides.length === snapshot.outline.slides.length &&
		snapshot.slides.length > 0;

	const handleDownload = async () => {
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
				(done, total) => setProgress({ done, total }),
			);
			toast.success("PowerPoint downloaded", { description: fileName });
		} catch (error) {
			toast.error("Could not build the PowerPoint file", {
				description:
					error instanceof Error ? error.message : "Unknown error.",
			});
		} finally {
			setBuilding(false);
			setProgress(undefined);
		}
	};

	return (
		<Button
			size="sm"
			disabled={!ready || building}
			onClick={() => void handleDownload()}
			title={ready ? "Download .pptx" : "Generate all slides first"}
		>
			{building ? <Spinner /> : <DownloadIcon />}
			{building
				? progress
					? `Rendering ${progress.done}/${progress.total}`
					: "Rendering…"
				: "Download"}
		</Button>
	);
}
