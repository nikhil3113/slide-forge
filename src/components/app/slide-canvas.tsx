import { useEffect, useRef } from "react";
import { createSlideDisplay } from "@/lib/slide-sandbox";
import { cn } from "@/lib/utils";

interface SlideCanvasProps {
	source?: string;
	tokensCss: string;
	className?: string;
	style?: React.CSSProperties;
}

export function SlideCanvas({
	source,
	tokensCss,
	className,
	style,
}: SlideCanvasProps) {
	const hostRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<ReturnType<typeof createSlideDisplay> | null>(null);
	const lastPushRef = useRef(0);
	const lastSourceRef = useRef("");

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		const handle = createSlideDisplay(host, tokensCss);
		handleRef.current = handle;
		return () => {
			handle.destroy();
			handleRef.current = null;
		};
	}, [tokensCss]);

	useEffect(() => {
		const handle = handleRef.current;
		if (!handle || !source || source === lastSourceRef.current) return;
		lastSourceRef.current = source;

		const now = performance.now();
		const elapsed = now - lastPushRef.current;
		if (elapsed > 400) {
			lastPushRef.current = now;
			handle.update(source);
			return;
		}

		const timer = window.setTimeout(() => {
			lastPushRef.current = performance.now();
			handle.update(source);
		}, 400 - elapsed);
		return () => window.clearTimeout(timer);
	}, [source]);

	return (
		<div
			ref={hostRef}
			className={cn("h-full w-full", className)}
			style={style}
		/>
	);
}
