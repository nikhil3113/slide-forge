import { useEffect, useRef, useState } from "react";
import { PresentationIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { DownloadButton } from "@/components/app/download-button";
import { Header } from "@/components/app/header";
import { OutlinePanel } from "@/components/app/outline-panel";
import { ProgressPanel } from "@/components/app/progress-panel";
import { PromptForm } from "@/components/app/prompt-form";
import { ProviderSettingsDialog } from "@/components/app/provider-settings-dialog";
import { SlideGrid } from "@/components/app/slide-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
	useDeckGeneration,
	type GenerationInput,
} from "@/hooks/use-deck-generation";
import {
	activeKey,
	loadSettings,
	saveSettings,
	type ProviderSettings,
} from "@/lib/providers";

function App() {
	const [settings, setSettings] = useState<ProviderSettings>(() =>
		loadSettings(),
	);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [lastInput, setLastInput] = useState<GenerationInput>();
	const lastInputRef = useRef<GenerationInput | undefined>(undefined);
	const generation = useDeckGeneration(settings);

	useEffect(() => {
		saveSettings(settings);
	}, [settings]);

	const busy =
		generation.phase === "outlining" || generation.phase === "slides";

	const handleGenerate = (input: GenerationInput) => {
		if (!activeKey(settings)) {
			toast.error("Add your provider API key first");
			setSettingsOpen(true);
			return;
		}
		lastInputRef.current = input;
		setLastInput(input);
		void generation.generate(input);
	};

	const handleRetryOutline = () => {
		if (lastInputRef.current) {
			void generation.generate(lastInputRef.current);
		}
	};

	return (
		<TooltipProvider>
			<div className="flex min-h-svh flex-col bg-muted/20">
				<Header onOpenSettings={() => setSettingsOpen(true)} />

				<main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row">
					<aside className="flex w-full flex-col gap-4 lg:w-[380px] lg:shrink-0">
						<PromptForm
							settings={settings}
							busy={busy}
							onGenerate={handleGenerate}
							onOpenSettings={() => setSettingsOpen(true)}
						/>

						<ProgressPanel
							phase={generation.phase}
							progress={generation.progress}
							outlineChars={generation.outlineChars}
							onCancel={generation.cancel}
						/>

						{generation.phase === "error" && generation.error ? (
							<Card className="border-destructive/30">
								<CardContent className="pt-6">
									<p className="text-sm font-medium text-destructive">
										Generation failed
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{generation.error.message}
									</p>
									<Button
										variant="outline"
										size="sm"
										className="mt-3"
										onClick={handleRetryOutline}
									>
										<RotateCcwIcon />
										Try again
									</Button>
								</CardContent>
							</Card>
						) : null}

						{generation.outline ? (
							<OutlinePanel
								outline={generation.outline}
								slides={generation.slides}
								onRetry={(index) => void generation.retrySlide(index)}
							/>
						) : null}

						{generation.outline ? (
							<DownloadButton
								outline={generation.outline}
								slides={generation.slides}
							/>
						) : null}
					</aside>

					<section className="min-w-0 flex-1">
						{generation.phase === "outlining" ? (
							<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
								{Array.from({ length: lastInput?.slideCount ?? 6 }).map(
									(_, index) => (
										<Skeleton
											key={index}
											className="aspect-video rounded-xl"
										/>
									),
								)}
							</div>
						) : generation.slides.length > 0 ? (
							<SlideGrid
								slides={generation.slides}
								themeId={generation.outline?.theme ?? "midnight"}
								onRetry={(index) => void generation.retrySlide(index)}
							/>
						) : (
							<Empty className="min-h-[420px] border border-dashed">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<PresentationIcon />
									</EmptyMedia>
									<EmptyTitle>No deck yet</EmptyTitle>
									<EmptyDescription>
										Describe your topic on the left and generate your first
										deck. Slides stream in live as they are written.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
					</section>
				</main>

				<ProviderSettingsDialog
					open={settingsOpen}
					onOpenChange={setSettingsOpen}
					settings={settings}
					onChange={setSettings}
				/>
				<Toaster position="bottom-right" />
			</div>
		</TooltipProvider>
	);
}

export default App;
