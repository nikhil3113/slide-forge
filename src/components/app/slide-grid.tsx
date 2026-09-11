import { SlideCard } from "./slide-card";
import type { SlideState } from "@/hooks/use-deck-generation";
import type { ThemeId } from "@/types/deck";

interface SlideGridProps {
	slides: SlideState[];
	themeId: ThemeId;
	onRetry: (index: number) => void;
}

export function SlideGrid({ slides, themeId, onRetry }: SlideGridProps) {
	return (
		<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
			{slides.map((slide) => (
				<SlideCard
					key={slide.index}
					state={slide}
					themeId={themeId}
					onRetry={onRetry}
				/>
			))}
		</div>
	);
}
