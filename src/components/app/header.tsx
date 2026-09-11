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
}

export function Header({ onOpenSettings }: HeaderProps) {
	const { isDark, toggleTheme } = useTheme();

	return (
		<header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
			<div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<SparklesIcon className="size-4" />
					</span>
					<span className="font-heading text-base font-semibold tracking-tight">
						SlideForge
					</span>
				</div>

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
							{isDark ? <SunIcon /> : <MoonIcon />}
						</TooltipTrigger>
						<TooltipContent>
							{isDark ? "Switch to light mode" : "Switch to dark mode"}
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
