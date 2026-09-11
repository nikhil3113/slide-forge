import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { downloadDeck } from "@/lib/build-deck";
import type { WorkspaceSnapshot } from "@/hooks/use-deck-workspace";
import type { Deck } from "@/types/deck";

interface DownloadButtonProps {
	snapshot: WorkspaceSnapshot;
}

export function DownloadButton({ snapshot }: DownloadButtonProps) {
	const [building, setBuilding] = useState(false);

	const ready =
		!!snapshot.outline &&
		snapshot.slides.length === snapshot.outline.slides.length &&
		snapshot.slides.length > 0;

	const handleDownload = async () => {
		if (!ready || building) return;
		setBuilding(true);
		try {
			const deck: Deck = {
				title: snapshot.title || snapshot.outline?.title || "SlideForge deck",
				subtitle: snapshot.subtitle,
				theme: snapshot.theme,
				slides: snapshot.slides
					.sort((a, b) => a.index - b.index)
					.map((entry) => entry.slide),
			};
			const fileName = await downloadDeck(deck);
			toast.success("PowerPoint downloaded", { description: fileName });
		} catch (error) {
			toast.error("Could not build the PowerPoint file", {
				description:
					error instanceof Error ? error.message : "Unknown error.",
			});
		} finally {
			setBuilding(false);
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
			{building ? "Building…" : "Download"}
		</Button>
	);
}
