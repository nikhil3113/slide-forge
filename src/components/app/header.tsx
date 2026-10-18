import { MoonIcon, SettingsIcon, SparklesIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";

interface HeaderProps {
	onOpenSettings: () => void;
	onHome?: () => void;
}

export function Header({ onOpenSettings, onHome }: HeaderProps) {
	const { toggleTheme } = useTheme();

	return (
		<header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
			<div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6">
				<button
					type="button"
					onClick={onHome}
					disabled={!onHome}
					className="flex items-center gap-2.5 rounded-xl text-left transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
				>
					<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<SparklesIcon className="size-4" />
					</span>
					<span className="font-heading text-base font-semibold tracking-tight">
						SlideForge
					</span>
				</button>

				<div className="ml-auto flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={toggleTheme}
									aria-label="Toggle theme"
								/>
							}
						>
							<SunIcon className="hidden dark:block" />
							<MoonIcon className="block dark:hidden" />
						</TooltipTrigger>
						<TooltipContent>
							Toggle theme
						</TooltipContent>
					</Tooltip>
					<Button variant="outline" size="sm" onClick={onOpenSettings}>
						<SettingsIcon />
						Provider
					</Button>
				</div>
			</div>
		</header>
	);
}
