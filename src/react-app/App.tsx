import { useEffect, useMemo, useRef, useState } from "react";
import { PresentationIcon } from "lucide-react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/app/chat-panel";
import { Header } from "@/components/app/header";
import { OutlineRail } from "@/components/app/outline-rail";
import { ProviderSettingsDialog } from "@/components/app/provider-settings-dialog";
import { SlideGrid } from "@/components/app/slide-grid";
import { SlideStage } from "@/components/app/slide-stage";
import { WorkspaceToolbar } from "@/components/app/workspace-toolbar";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
	useDeckChat,
	type ChatBriefState,
} from "@/hooks/use-deck-chat";
import { useDeckWorkspace } from "@/hooks/use-deck-workspace";
import {
	clearWorkspace,
	loadWorkspace,
	saveWorkspace,
} from "@/lib/db";
import {
	activeKey,
	loadSettings,
	saveSettings,
	type ProviderSettings,
} from "@/lib/providers";
import { slideTokensCss } from "@/lib/slide-tokens";
import { DEFAULT_THEME_ID, getTheme } from "@/lib/themes";

function App() {
	const [settings, setSettings] = useState<ProviderSettings>(() =>
		loadSettings(),
	);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [grid, setGrid] = useState(false);
	const [focusIndex, setFocusIndex] = useState(0);
	const [hydrated, setHydrated] = useState(false);
	const [brief, setBrief] = useState<ChatBriefState>({
		slideCount: 8,
		theme: DEFAULT_THEME_ID,
		tone: "professional",
		audience: "",
		askUpfront: true,
	});

	const workspace = useDeckWorkspace(settings);
	const chat = useDeckChat({ settings, workspace, brief });
	const takeSnapshot = workspace.snapshot;
	const workspaceIdRef = useRef<string>(crypto.randomUUID());
	const hydrateRef = useRef({
		workspace: workspace.hydrate,
		messages: chat.hydrateMessages,
	});

	useEffect(() => {
		saveSettings(settings);
	}, [settings]);

	useEffect(() => {
		hydrateRef.current = {
			workspace: workspace.hydrate,
			messages: chat.hydrateMessages,
		};
	}, [workspace.hydrate, chat.hydrateMessages]);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const stored = await loadWorkspace();
			if (cancelled) return;
			if (stored) {
				workspaceIdRef.current = stored.id;
				hydrateRef.current.workspace(stored.deck);
				hydrateRef.current.messages(stored.messages);
				setBrief((current) => ({ ...current, ...stored.brief }));
			}
			setHydrated(true);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		const timer = setTimeout(() => {
			const snapshot = takeSnapshot();
			const messages = chat.messages.map((message) =>
				message.status === "streaming"
					? {
							...message,
							status: "done" as const,
							content: message.content.trim() || "…",
						}
					: message,
			);
			void saveWorkspace({
				id: workspaceIdRef.current,
				updatedAt: Date.now(),
				brief,
				messages,
				deck: snapshot,
			});
		}, 700);
		return () => clearTimeout(timer);
	}, [
		hydrated,
		brief,
		chat.messages,
		workspace.outline,
		workspace.slideStates,
		workspace.title,
		workspace.subtitle,
		workspace.theme,
		takeSnapshot,
	]);

	const busy =
		workspace.phase === "outlining" ||
		workspace.phase === "style-guide" ||
		workspace.phase === "slides";
	const snapshot = takeSnapshot();
	const tokensCss = useMemo(
		() =>
			slideTokensCss(
				getTheme(workspace.theme),
				workspace.title || workspace.outline?.title || "SlideForge deck",
			),
		[workspace.theme, workspace.title, workspace.outline?.title],
	);
	const maxIndex = Math.max(workspace.slideStates.length - 1, 0);
	const effectiveIndex = Math.min(
		workspace.activeSlide ?? focusIndex,
		maxIndex,
	);
	const currentState = workspace.slideStates[effectiveIndex];

	const handleSend = (text: string) => {
		if (!activeKey(settings)) {
			toast.error("Add your provider API key first");
			setSettingsOpen(true);
			return;
		}
		void chat.sendMessage(text);
	};

	const handleNewDeck = () => {
		if (
			workspace.slideStates.length > 0 &&
			!window.confirm(
				"Start a new deck? The current workspace will be replaced.",
			)
		) {
			return;
		}
		chat.stop();
		workspace.reset();
		chat.resetMessages();
		setFocusIndex(0);
		void clearWorkspace().then(() => {
			workspaceIdRef.current = crypto.randomUUID();
		});
	};

	const statusText =
		workspace.phase === "outlining"
			? `Planning the outline… (${workspace.outlineChars} chars)`
			: workspace.phase === "style-guide"
				? "Defining the deck design system…"
				: workspace.phase === "slides"
					? `Designing slide ${Math.min(
							(workspace.activeSlide ?? workspace.progress.done) + 1,
							workspace.progress.total,
						)} of ${workspace.progress.total}…`
					: workspace.phase === "error"
						? (workspace.error?.message ?? "Something went wrong.")
						: undefined;

	return (
		<TooltipProvider>
			<div className="flex h-svh flex-col overflow-hidden bg-muted/20">
				<Header onOpenSettings={() => setSettingsOpen(true)} />

				<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
					{workspace.slideStates.length > 0 ? (
						<aside className="hidden w-[248px] shrink-0 overflow-y-auto border-r border-border/60 lg:block">
							<OutlineRail
								states={workspace.slideStates}
								activeIndex={effectiveIndex}
								onSelect={setFocusIndex}
								onRetry={(index) => void workspace.retrySlide(index)}
							/>
						</aside>
					) : null}

					<section className="flex min-h-0 min-w-0 flex-1 flex-col">
						<WorkspaceToolbar
							snapshot={snapshot}
							tokensCss={tokensCss}
							progress={workspace.progress}
							phase={workspace.phase}
							grid={grid}
							onToggleGrid={() => setGrid((current) => !current)}
							onStop={workspace.cancel}
							onNewDeck={handleNewDeck}
						/>
						<div className="min-h-0 flex-1 overflow-y-auto p-4">
							{workspace.slideStates.length === 0 ? (
								<Empty className="min-h-[420px] border border-dashed">
									<EmptyHeader>
										<EmptyMedia variant="icon">
											<PresentationIcon />
										</EmptyMedia>
										<EmptyTitle>
											{busy ? "Planning your deck" : "No deck yet"}
										</EmptyTitle>
										<EmptyDescription>
											{busy
												? "The outline is on its way — slides will appear here as they stream in."
												: "Describe the deck you need in the chat. The outline and slides appear here as they are written."}
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							) : grid ? (
								<SlideGrid
									slides={workspace.slideStates}
									tokensCss={tokensCss}
									onRetry={(index) => void workspace.retrySlide(index)}
								/>
							) : (
								<SlideStage
									state={currentState}
									tokensCss={tokensCss}
									index={effectiveIndex}
									total={workspace.slideStates.length}
									onPrev={() =>
										setFocusIndex(Math.max(effectiveIndex - 1, 0))
									}
									onNext={() =>
										setFocusIndex(Math.min(effectiveIndex + 1, maxIndex))
									}
								/>
							)}
						</div>
					</section>

					<aside className="flex h-[44%] min-h-0 shrink-0 flex-col border-t border-border/60 lg:h-auto lg:w-[380px] lg:border-l lg:border-t-0">
						<ChatPanel
							messages={chat.messages}
							streaming={chat.streaming}
							brief={brief}
							statusText={statusText}
							statusError={workspace.phase === "error"}
							onSend={handleSend}
							onStop={chat.stop}
							onBriefChange={setBrief}
						/>
					</aside>
				</div>

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
