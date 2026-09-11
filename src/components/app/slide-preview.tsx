import { cssBackground, getTheme, toCssColor } from "@/lib/themes";
import type { Layout, ThemeId } from "@/types/deck";

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

interface SlidePreviewProps {
	layout: Layout;
	data: Record<string, unknown>;
	themeId: ThemeId;
}

export function SlidePreview({ layout, data, themeId }: SlidePreviewProps) {
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
			<div className="flex h-full flex-col gap-2 p-5">
				{asString(data.kicker) ? (
					<p
						className="text-[8px] font-bold tracking-[0.18em] uppercase"
						style={{ color: accent }}
					>
						{asString(data.kicker)}
					</p>
				) : null}
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
								<span
									className="mt-1 h-1 w-4/5 self-center rounded-full"
									style={{ backgroundColor: accent, opacity: 0.6 }}
								/>
							</div>
						))
					)}
				</div>
			</div>
		);
	}

	if (layout === "timeline") {
		const steps = Array.isArray(data.steps)
			? data.steps.map(asRecord).filter(Boolean)
			: [];
		return (
			<div className="flex h-full flex-col gap-3 p-5">
				<p className="text-sm font-semibold" style={{ color: text }}>
					{asString(data.title) ?? "Timeline"}
				</p>
				<div className="relative flex flex-1 items-center gap-1">
					<span
						className="absolute left-2 right-2 top-1/2 h-px"
						style={{ backgroundColor: accent, opacity: 0.5 }}
					/>
					{steps.length === 0 ? (
						<span className="text-[11px]" style={{ color: muted }}>
							…
						</span>
					) : (
						steps.map((step, index) => (
							<div
								key={index}
								className="relative z-10 flex flex-1 flex-col items-center gap-1"
							>
								<span
									className="flex size-5 items-center justify-center rounded-full text-[9px] font-bold"
									style={{ backgroundColor: accent, color: accentText }}
								>
									{index + 1}
								</span>
								<span
									className="line-clamp-2 text-center text-[9px] font-medium leading-tight"
									style={{ color: text }}
								>
									{asString(step?.title) ?? ""}
								</span>
							</div>
						))
					)}
				</div>
			</div>
		);
	}

	if (layout === "section") {
		return (
			<div className="flex h-full flex-col justify-center gap-2 p-7">
				<p
					className="text-[9px] font-bold tracking-[0.2em] uppercase"
					style={{ color: accent }}
				>
					{asString(data.kicker) ?? "Section"}
				</p>
				<p className="text-xl font-bold leading-tight" style={{ color: text }}>
					{asString(data.title) ?? "Section"}
				</p>
				<div className="h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
				{asString(data.subtitle) ? (
					<p className="text-[11px]" style={{ color: muted }}>
						{asString(data.subtitle)}
					</p>
				) : null}
			</div>
		);
	}

	if (layout === "image-split") {
		return (
			<div className="grid h-full grid-cols-[1.15fr_0.85fr] gap-3 p-5">
				<div className="flex flex-col gap-2">
					{asString(data.kicker) ? (
						<p
							className="text-[8px] font-bold tracking-[0.18em] uppercase"
							style={{ color: accent }}
						>
							{asString(data.kicker)}
						</p>
					) : null}
					<p className="text-sm font-semibold leading-tight" style={{ color: text }}>
						{asString(data.title) ?? "Focus"}
					</p>
					<BulletList
						items={asStringArray(data.bullets).slice(0, 5)}
						color={text}
						accent={accent}
					/>
				</div>
				<div
					className="relative flex items-center justify-center overflow-hidden rounded-xl"
					style={{ backgroundImage: cssBackground(theme) }}
				>
					<span
						className="size-10 rounded-full border-2"
						style={{ borderColor: accent, opacity: 0.8 }}
					/>
					{asString(data.caption) ? (
						<span
							className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[8px] font-semibold"
							style={{ backgroundColor: accent, color: accentText }}
						>
							{asString(data.caption)}
						</span>
					) : null}
				</div>
			</div>
		);
	}

	if (layout === "two-column") {
		const left = asRecord(data.left);
		const right = asRecord(data.right);
		const columns = [left, right];
		return (
			<div className="flex h-full flex-col gap-2 p-5">
				{asString(data.kicker) ? (
					<p
						className="text-[8px] font-bold tracking-[0.18em] uppercase"
						style={{ color: accent }}
					>
						{asString(data.kicker)}
					</p>
				) : null}
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
		<div className="flex h-full flex-col gap-2 p-5">
			{asString(data.kicker) ? (
				<p
					className="text-[8px] font-bold tracking-[0.18em] uppercase"
					style={{ color: accent }}
				>
					{asString(data.kicker)}
				</p>
			) : null}
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
