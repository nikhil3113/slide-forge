import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DECK_THEMES, toCssColor } from "@/lib/themes";
import type { ThemeId } from "@/types/deck";
import type { ChatBriefState } from "@/hooks/use-deck-chat";

const TONES = [
	{ value: "any", label: "Any tone" },
	{ value: "professional", label: "Professional" },
	{ value: "conversational", label: "Conversational" },
	{ value: "inspirational", label: "Inspirational" },
	{ value: "academic", label: "Academic" },
	{ value: "persuasive", label: "Persuasive" },
];

interface DeckBriefProps {
	brief: ChatBriefState;
	onChange: (brief: ChatBriefState) => void;
	disabled?: boolean;
}

export function DeckBrief({ brief, onChange, disabled }: DeckBriefProps) {
	return (
		<div className="grid gap-4 rounded-xl border border-border bg-card/60 p-3.5">
			<div className="grid gap-2">
				<div className="flex items-center justify-between">
					<Label className="text-xs">Slides</Label>
					<span className="text-xs text-muted-foreground tabular-nums">
						{brief.slideCount}
					</span>
				</div>
				<Slider
					value={brief.slideCount}
					min={3}
					max={20}
					step={1}
					disabled={disabled}
					onValueChange={(value) =>
						onChange({
							...brief,
							slideCount: Array.isArray(value) ? value[0] : value,
						})
					}
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="grid gap-1.5">
					<Label className="text-xs">Theme</Label>
					<Select
						value={brief.theme}
						disabled={disabled}
						onValueChange={(value) =>
							onChange({ ...brief, theme: value as ThemeId })
						}
					>
						<SelectTrigger className="w-full" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DECK_THEMES.map((theme) => (
								<SelectItem key={theme.id} value={theme.id}>
									<span className="flex items-center gap-2">
										<span
											className="size-2.5 rounded-full"
											style={{
												backgroundColor: toCssColor(theme.accent),
											}}
										/>
										{theme.label}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="grid gap-1.5">
					<Label className="text-xs">Tone</Label>
					<Select
						value={brief.tone || "any"}
						disabled={disabled}
						onValueChange={(value) =>
							onChange({ ...brief, tone: value === "any" ? "" : (value ?? "") })
						}
					>
						<SelectTrigger className="w-full" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{TONES.map((tone) => (
								<SelectItem key={tone.value} value={tone.value}>
									{tone.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid gap-1.5">
				<Label htmlFor="chat-brief-audience" className="text-xs">
					Audience (optional)
				</Label>
				<Input
					id="chat-brief-audience"
					placeholder="e.g. engineering leadership"
					value={brief.audience}
					disabled={disabled}
					onChange={(event) =>
						onChange({ ...brief, audience: event.target.value })
					}
				/>
			</div>
		</div>
	);
}
