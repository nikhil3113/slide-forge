import { SlideCard } from "./slide-card";
import type { HtmlSlideState } from "@/hooks/use-deck-workspace";

interface SlideGridProps {
	slides: HtmlSlideState[];
	tokensCss: string;
	onRetry: (index: number) => void;
}

export function SlideGrid({ slides, tokensCss, onRetry }: SlideGridProps) {
	return (
		<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
			{slides.map((slide) => (
				<SlideCard
					key={slide.index}
					state={slide}
					tokensCss={tokensCss}
					onRetry={onRetry}
				/>
			))}
		</div>
	);
}
