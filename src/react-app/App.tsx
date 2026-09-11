import { MoonIcon, SunIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

function App() {
	const { isDark, toggleTheme } = useTheme();

	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
			<Badge variant="secondary">Scaffold ready</Badge>
			<h1 className="font-heading text-4xl font-semibold tracking-tight">
				SlideForge
			</h1>
			<p className="max-w-md text-center text-muted-foreground">
				AI-powered slide deck generation with live streaming.
			</p>
			<div className="flex items-center gap-3">
				<Button>Primary button</Button>
				<Button variant="outline" onClick={toggleTheme}>
					{isDark ? <MoonIcon /> : <SunIcon />}
					Toggle theme
				</Button>
			</div>
		</main>
	);
}

export default App;
