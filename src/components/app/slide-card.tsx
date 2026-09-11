import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { tryParsePartial } from "@/lib/partial-json";
import { getTheme, toCssColor } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { SlideState } from "@/hooks/use-deck-generation";
import type { ThemeId } from "@/types/deck";

interface SlideCardProps {
	state: SlideState;
	themeId: ThemeId;
	onRetry: (index: number) => void;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

function BulletList({
	items,
	color,
	accent,
}: {
	items: string[];
	color: string;
	accent: string;
}) {
	return (
		<ul className="flex flex-col gap-1.5">
			{items.map((item, index) => (
				<li key={index} className="flex items-start gap-2">
					<span
						className="mt-1.5 size-1.5 shrink-0 rounded-full"
						style={{ backgroundColor: accent }}
					/>
					<span className="text-[11px] leading-snug" style={{ color }}>
						{item}
					</span>
				</li>
			))}
		</ul>
	);
}

function SlidePreview({
	layout,
	data,
	themeId,
}: {
	layout: SlideState["outline"]["layout"];
	data: Record<string, unknown>;
	themeId: ThemeId;
}) {
	const theme = getTheme(themeId);
	const text = toCssColor(theme.text);
	const muted = toCssColor(theme.mutedText);
	const accent = toCssColor(theme.accent);
	const accentText = toCssColor(theme.accentText);

	if (layout === "title") {
		return (
			<div className="flex h-full flex-col justify-center gap-2 p-6">
				<div className="h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
				<p className="text-lg font-semibold leading-tight" style={{ color: text }}>
					{asString(data.title) ?? "Untitled deck"}
				</p>
				{asString(data.subtitle) ? (
					<p className="text-[11px]" style={{ color: muted }}>
						{asString(data.subtitle)}
					</p>
				) : null}
			</div>
		);
	}

	if (layout === "quote") {
		return (
			<div className="flex h-full flex-col justify-center gap-3 p-6">
				<span className="text-3xl leading-none" style={{ color: accent }}>
					&ldquo;
				</span>
				<p className="text-[13px] font-medium italic leading-snug" style={{ color: text }}>
					{asString(data.quote) ?? "…"}
				</p>
				{asString(data.attribution) ? (
					<p className="text-[10px]" style={{ color: muted }}>
						— {asString(data.attribution)}
					</p>
				) : null}
			</div>
		);
	}

	if (layout === "stats") {
		const stats = Array.isArray(data.stats)
			? data.stats.map(asRecord).filter(Boolean)
			: [];
		return (
			<div className="flex h-full flex-col gap-3 p-5">
				<p className="text-sm font-semibold" style={{ color: text }}>
					{asString(data.title) ?? "Key numbers"}
				</p>
				<div className="flex flex-1 items-center gap-2">
					{stats.length === 0 ? (
						<span className="text-[11px]" style={{ color: muted }}>
							…
						</span>
					) : (
						stats.map((stat, index) => (
							<div
								key={index}
								className="flex flex-1 flex-col items-center gap-1 rounded-lg p-2 text-center"
								style={{ backgroundColor: toCssColor(theme.surface) }}
							>
								<span className="text-base font-bold" style={{ color: accent }}>
									{asString(stat?.value) ?? "—"}
								</span>
								<span className="text-[9px] leading-tight" style={{ color: muted }}>
									{asString(stat?.label) ?? ""}
								</span>
							</div>
						))
					)}
				</div>
			</div>
		);
	}

	if (layout === "two-column") {
		const left = asRecord(data.left);
		const right = asRecord(data.right);
		const columns = [left, right];
		return (
			<div className="flex h-full flex-col gap-3 p-5">
				<p className="text-sm font-semibold" style={{ color: text }}>
					{asString(data.title) ?? "Comparison"}
				</p>
				<div className="grid flex-1 grid-cols-2 gap-2">
					{columns.map((column, index) => (
						<div
							key={index}
							className="flex flex-col gap-2 rounded-lg p-3"
							style={{ backgroundColor: toCssColor(theme.surface) }}
						>
							<p className="text-[11px] font-semibold" style={{ color: accent }}>
								{asString(column?.heading) ?? "—"}
							</p>
							<BulletList
								items={asStringArray(column?.bullets).slice(0, 5)}
								color={text}
								accent={accent}
							/>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (layout === "closing") {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
				<p className="text-lg font-semibold leading-tight" style={{ color: text }}>
					{asString(data.title) ?? "Thank you"}
				</p>
				{asString(data.subtitle) ? (
					<p className="text-[11px]" style={{ color: muted }}>
						{asString(data.subtitle)}
					</p>
				) : null}
				{asString(data.cta) ? (
					<span
						className="rounded-full px-3 py-1 text-[10px] font-semibold"
						style={{ backgroundColor: accent, color: accentText }}
					>
						{asString(data.cta)}
					</span>
				) : null}
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col gap-3 p-5">
			<p className="text-sm font-semibold" style={{ color: text }}>
				{asString(data.title) ?? "Slide"}
			</p>
			<BulletList
				items={asStringArray(data.bullets).slice(0, 7)}
				color={text}
				accent={accent}
			/>
		</div>
	);
}

export function SlideCard({ state, themeId, onRetry }: SlideCardProps) {
	const theme = getTheme(themeId);
	const previewData =
		state.status === "streaming"
			? tryParsePartial(state.partial)
			: state.slide
				? (state.slide as unknown as Record<string, unknown>)
				: undefined;

	return (
		<div className="flex flex-col gap-2">
			<AspectRatio
				ratio={16 / 9}
				className="relative overflow-hidden rounded-xl border border-border shadow-sm"
				style={{ backgroundColor: toCssColor(theme.background) }}
			>
				{previewData ? (
					<SlidePreview
						layout={state.outline.layout}
						data={previewData}
						themeId={themeId}
					/>
				) : (
					<div className="flex h-full flex-col justify-center gap-3 p-6">
						<Skeleton className="h-4 w-2/3 bg-white/10" />
						<Skeleton className="h-3 w-full bg-white/10" />
						<Skeleton className="h-3 w-5/6 bg-white/10" />
						<Skeleton className="h-3 w-4/6 bg-white/10" />
					</div>
				)}

				{state.status === "streaming" ? (
					<span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] text-white backdrop-blur">
						<Spinner className="size-3" />
						writing
					</span>
				) : null}

				{state.status === "error" ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center backdrop-blur-sm">
						<TriangleAlertIcon className="size-5 text-destructive" />
						<p className="line-clamp-3 text-[10px] leading-snug text-white/90">
							{state.error?.message ?? "This slide failed to generate."}
						</p>
						<Button
							variant="secondary"
							size="xs"
							onClick={() => onRetry(state.index)}
						>
							<RotateCcwIcon />
							Retry
						</Button>
					</div>
				) : null}
			</AspectRatio>

			<div className="flex items-center gap-2 px-1">
				<span className="text-xs text-muted-foreground tabular-nums">
					{state.index + 1}
				</span>
				<span
					className={cn(
						"min-w-0 flex-1 truncate text-xs",
						state.status === "error" && "text-destructive",
					)}
				>
					{state.outline.title}
				</span>
				<Badge variant="outline" className="shrink-0">
					{state.outline.layout}
				</Badge>
			</div>
		</div>
	);
}
