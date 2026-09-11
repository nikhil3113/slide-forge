import { useState } from "react";
import { WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DECK_THEMES, DEFAULT_THEME_ID, toCssColor } from "@/lib/themes";
import {
	activeModel,
	getProviderPreset,
	type ProviderSettings,
} from "@/lib/providers";
import type { ThemeId } from "@/types/deck";
import type { GenerationInput } from "@/hooks/use-deck-generation";

const TONES = [
	{ value: "any", label: "Any tone" },
	{ value: "professional", label: "Professional" },
	{ value: "conversational", label: "Conversational" },
	{ value: "inspirational", label: "Inspirational" },
	{ value: "academic", label: "Academic" },
	{ value: "persuasive", label: "Persuasive" },
];

interface PromptFormProps {
	settings: ProviderSettings;
	busy: boolean;
	onGenerate: (input: GenerationInput) => void;
	onOpenSettings: () => void;
}

export function PromptForm({
	settings,
	busy,
	onGenerate,
	onOpenSettings,
}: PromptFormProps) {
	const [topic, setTopic] = useState("");
	const [slideCount, setSlideCount] = useState(8);
	const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
	const [audience, setAudience] = useState("");
	const [tone, setTone] = useState("any");

	const preset = getProviderPreset(settings.providerId);
	const canGenerate = topic.trim().length >= 3 && !busy;

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canGenerate) return;
		onGenerate({
			topic: topic.trim(),
			slideCount,
			theme: themeId,
			audience: audience.trim() || undefined,
			tone: tone === "any" ? undefined : tone,
		});
	};

	return (
		<Card>
			<form onSubmit={handleSubmit}>
				<CardHeader>
					<CardTitle>Create a deck</CardTitle>
					<CardDescription>
						Describe the topic and SlideForge plans the outline, then writes
						each slide.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-5">
					<div className="grid gap-2">
						<Label htmlFor="topic">Topic</Label>
						<Textarea
							id="topic"
							placeholder="e.g. Why edge computing is changing web development"
							className="min-h-24 resize-none"
							value={topic}
							onChange={(event) => setTopic(event.target.value)}
							disabled={busy}
						/>
					</div>

					<div className="grid gap-3">
						<div className="flex items-center justify-between">
							<Label>Slides</Label>
							<span className="text-sm text-muted-foreground tabular-nums">
								{slideCount}
							</span>
						</div>
						<Slider
							value={slideCount}
							min={3}
							max={20}
							step={1}
							disabled={busy}
							onValueChange={(value) =>
								setSlideCount(Array.isArray(value) ? value[0] : value)
							}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="audience">Audience (optional)</Label>
						<Input
							id="audience"
							placeholder="e.g. engineering leadership"
							value={audience}
							onChange={(event) => setAudience(event.target.value)}
							disabled={busy}
						/>
					</div>

					<div className="grid gap-2">
						<Label>Tone</Label>
						<Select
							value={tone}
							onValueChange={(value) => setTone(value ?? "any")}
							disabled={busy}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TONES.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-2">
						<Label>Theme</Label>
						<div className="grid grid-cols-5 gap-2">
							{DECK_THEMES.map((theme) => {
								const selected = theme.id === themeId;
								return (
									<button
										key={theme.id}
										type="button"
										disabled={busy}
										onClick={() => setThemeId(theme.id)}
										className={cn(
											"flex flex-col items-center gap-1.5 rounded-xl border border-border p-2 transition-all",
											selected &&
												"border-ring ring-2 ring-ring/40",
										)}
										style={{ backgroundColor: toCssColor(theme.background) }}
										title={theme.description}
									>
										<span
											className="size-4 rounded-full"
											style={{ backgroundColor: toCssColor(theme.accent) }}
										/>
										<span
											className="text-[10px] leading-none"
											style={{ color: toCssColor(theme.text) }}
										>
											{theme.label}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex-col items-stretch gap-2">
					<Button type="submit" disabled={!canGenerate} className="w-full">
						<WandSparklesIcon />
						{busy ? "Generating..." : "Generate deck"}
					</Button>
					<button
						type="button"
						onClick={onOpenSettings}
						className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
					>
						{preset.label} · {activeModel(settings) || "no model"}
					</button>
				</CardFooter>
			</form>
		</Card>
	);
}
