import {
	BarChart3Icon,
	GraduationCapIcon,
	RocketIcon,
	SparklesIcon,
} from "lucide-react";

const SUGGESTIONS = [
	{
		icon: RocketIcon,
		label: "Pitch deck",
		prompt: "Create an investor pitch deck for a B2B SaaS startup",
	},
	{
		icon: GraduationCapIcon,
		label: "Team training",
		prompt: "Create a training deck that teaches new engineers our code review process",
	},
	{
		icon: BarChart3Icon,
		label: "Project update",
		prompt: "Create a quarterly project update deck for leadership with milestones and metrics",
	},
	{
		icon: SparklesIcon,
		label: "Conference talk",
		prompt: "Create a conference talk about the future of edge computing for web developers",
	},
];

interface QuickStartProps {
	onSelect: (prompt: string) => void;
	disabled?: boolean;
}

export function QuickStart({ onSelect, disabled }: QuickStartProps) {
	return (
		<div className="grid gap-2">
			{SUGGESTIONS.map((suggestion) => (
				<button
					key={suggestion.label}
					type="button"
					disabled={disabled}
					onClick={() => onSelect(suggestion.prompt)}
					className="flex items-start gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
				>
					<suggestion.icon className="mt-0.5 size-4 shrink-0 text-primary" />
					<span className="min-w-0">
						<span className="block text-xs font-medium">
							{suggestion.label}
						</span>
						<span className="block truncate text-[11px] text-muted-foreground">
							{suggestion.prompt}
						</span>
					</span>
				</button>
			))}
		</div>
	);
}
