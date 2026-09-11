import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { downloadDeck } from "@/lib/build-deck";
import type { SlideState } from "@/hooks/use-deck-generation";
import type { Deck, Outline } from "@/types/deck";

interface DownloadButtonProps {
	outline: Outline;
	slides: SlideState[];
}

export function DownloadButton({ outline, slides }: DownloadButtonProps) {
	const [building, setBuilding] = useState(false);

	const ready =
		slides.length > 0 && slides.every((slide) => slide.status === "done");

	const handleDownload = async () => {
		if (!ready || building) return;
		setBuilding(true);
		try {
			const deck: Deck = {
				title: outline.title,
				subtitle: outline.subtitle,
				theme: outline.theme,
				slides: slides.map((slide) => slide.slide!),
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
			className="w-full"
			disabled={!ready || building}
			onClick={() => void handleDownload()}
		>
			{building ? <Spinner /> : <DownloadIcon />}
			{building ? "Building .pptx..." : "Download .pptx"}
		</Button>
	);
}
