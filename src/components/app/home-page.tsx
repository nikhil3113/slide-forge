import { useState, type ComponentType, type FormEvent } from "react";
import {
	ArrowRightIcon,
	CheckIcon,
	CloudIcon,
	DownloadIcon,
	MessageSquareIcon,
	MoonIcon,
	PaletteIcon,
	ShieldCheckIcon,
	SparklesIcon,
	SunIcon,
	WandSparklesIcon,
	ZapIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import {
	FAQ_ENTRIES,
	HOW_TO_STEPS,
	faqJsonLd,
	howToJsonLd,
} from "@/lib/seo";
import { DECK_THEMES, toCssColor } from "@/lib/themes";

interface HomePageProps {
	/** Opens the generator workspace, optionally seeded with a prompt. */
	onStart: (prompt?: string) => void;
	onOpenSettings: () => void;
}

const EXAMPLE_PROMPTS = [
	"Investor pitch for a B2B SaaS startup",
	"Quarterly project update for leadership",
	"Onboarding deck for new engineers",
	"Conference talk on edge computing",
];

interface Feature {
	icon: ComponentType<{ className?: string }>;
	title: string;
	body: string;
}

const FEATURES: Feature[] = [
	{
		icon: WandSparklesIcon,
		title: "Prompt to deck",
		body: "Describe the talk in a sentence and get a structured outline plus fully designed slides.",
	},
	{
		icon: ZapIcon,
		title: "Live streaming",
		body: "Slides render the moment each token arrives over a single server-sent events stream.",
	},
	{
		icon: MessageSquareIcon,
		title: "Chat to edit",
		body: "Ask in plain language to rewrite a slide, restyle the deck, or add and drop sections.",
	},
	{
		icon: PaletteIcon,
		title: "Seven curated themes",
		body: "Midnight, Paper, Ocean, Sunset, Forest, Nebula and Linen — each with its own motifs.",
	},
	{
		icon: DownloadIcon,
		title: "Editable .pptx export",
		body: "Download a genuine PowerPoint file with real shapes and text, not flat screenshots.",
	},
	{
		icon: CloudIcon,
		title: "Edge-native",
		body: "The API runs on Cloudflare Workers, so generation starts close to wherever you are.",
	},
];

const STATS = [
	{ value: "3–20", label: "slides per deck" },
	{ value: "7", label: "curated themes" },
	{ value: "5", label: "AI providers supported" },
	{ value: "100%", label: "keys kept in your browser" },
];

const PROVIDERS = ["OpenAI", "Anthropic", "Google Gemini", "Groq", "OpenCode"];

function SectionHeading({
	eyebrow,
	title,
	body,
}: {
	eyebrow: string;
	title: string;
	body?: string;
}) {
	return (
		<div className="mx-auto max-w-2xl text-center">
			<span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
				{eyebrow}
			</span>
			<h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
				{title}
			</h2>
			{body ? (
				<p className="mt-3 text-sm/relaxed text-muted-foreground text-balance">
					{body}
				</p>
			) : null}
		</div>
	);
}

/** A stylised, non-interactive preview of a generated deck. */
function DeckPreview() {
	const theme = DECK_THEMES[0];
	const from = toCssColor(theme.background);
	const mid = toCssColor(theme.surface);
	const accent = toCssColor(theme.accent);
	const text = toCssColor(theme.text);
	const muted = toCssColor(theme.mutedText);

	return (
		<div className="relative">
			<div
				className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] opacity-40 blur-2xl"
				style={{
					backgroundImage: `radial-gradient(60% 60% at 30% 20%, ${accent}55, transparent 70%)`,
				}}
			/>
			<div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl ring-1 ring-foreground/5">
				<div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
					<span className="size-2.5 rounded-full bg-destructive/50" />
					<span className="size-2.5 rounded-full bg-muted-foreground/30" />
					<span className="size-2.5 rounded-full bg-muted-foreground/30" />
					<span className="ml-2 truncate text-xs text-muted-foreground">
						slideforge · deck streaming
					</span>
				</div>

				<div className="p-4 sm:p-5">
					{/* Primary slide */}
					<div
						className="relative aspect-video w-full overflow-hidden rounded-2xl"
						style={{ background: `linear-gradient(150deg, ${from}, ${mid})` }}
					>
						<div
							className="absolute inset-0 opacity-70"
							style={{
								backgroundImage: `radial-gradient(70% 60% at 85% 12%, ${accent}33, transparent 60%)`,
							}}
						/>
						<div className="relative flex h-full flex-col justify-between p-[6%]">
							<div className="flex items-center gap-2">
								<span
									className="size-2 rounded-full"
									style={{ backgroundColor: accent }}
								/>
								<span
									className="text-[0.6rem] font-medium uppercase tracking-[0.2em]"
									style={{ color: muted }}
								>
									Q3 review
								</span>
							</div>
							<div>
								<div
									className="h-2.5 w-[70%] rounded-full"
									style={{ backgroundColor: text, opacity: 0.9 }}
								/>
								<div
									className="mt-2 h-2.5 w-[45%] rounded-full"
									style={{ backgroundColor: text, opacity: 0.55 }}
								/>
							</div>
							<div className="flex items-end justify-between">
								<div
									className="h-1.5 w-[38%] rounded-full"
									style={{ backgroundColor: accent }}
								/>
								<span
									className="text-[0.6rem]"
									style={{ color: muted }}
								>
									01 / 08
								</span>
							</div>
						</div>
					</div>

					{/* Thumbnails */}
					<div className="mt-3 grid grid-cols-3 gap-3">
						{[0, 1, 2].map((index) => (
							<div
								key={index}
								className="aspect-video rounded-lg border border-border/60 p-2"
								style={{ background: `linear-gradient(150deg, ${mid}, ${from})` }}
							>
								<div
									className="h-1.5 w-[60%] rounded-full"
									style={{ backgroundColor: accent, opacity: 0.8 }}
								/>
								<div
									className="mt-1.5 h-1 w-[85%] rounded-full"
									style={{ backgroundColor: text, opacity: 0.35 }}
								/>
								<div
									className="mt-1 h-1 w-[70%] rounded-full"
									style={{ backgroundColor: text, opacity: 0.25 }}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export function HomePage({ onStart, onOpenSettings }: HomePageProps) {
	const { isDark, toggleTheme } = useTheme();
	const [prompt, setPrompt] = useState("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onStart(prompt.trim() || undefined);
	};

	return (
		<div className="min-h-svh overflow-y-auto bg-background">
			{/* Structured data for search + answer engines. Same source as the copy below. */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify([faqJsonLd(), howToJsonLd()]),
				}}
			/>

			{/* Nav */}
			<header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
					<div className="flex items-center gap-2.5">
						<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<SparklesIcon className="size-4" />
						</span>
						<span className="font-heading text-base font-semibold tracking-tight">
							SlideForge
						</span>
					</div>

					<nav className="ml-6 hidden items-center gap-1 md:flex">
						<a
							href="#features"
							className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							Features
						</a>
						<a
							href="#how"
							className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							How it works
						</a>
						<a
							href="#themes"
							className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							Themes
						</a>
						<a
							href="#faq"
							className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							FAQ
						</a>
					</nav>

					<div className="ml-auto flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={toggleTheme}
							aria-label="Toggle theme"
						>
							{isDark ? <SunIcon /> : <MoonIcon />}
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="hidden sm:inline-flex"
							onClick={onOpenSettings}
						>
							Provider
						</Button>
						<Button size="sm" onClick={() => onStart()}>
							Open workspace
						</Button>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="relative overflow-hidden">
				<div
					className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55]"
					style={{
						backgroundImage:
							"radial-gradient(55% 55% at 78% 0%, var(--color-primary) 0%, transparent 60%), radial-gradient(45% 45% at 8% 12%, var(--color-accent) 0%, transparent 55%)",
						opacity: 0.12,
					}}
				/>
				<div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-24">
					<div>
						<Badge variant="outline" className="gap-1.5 py-1">
							<CloudIcon className="size-3" />
							Built on Cloudflare Workers
						</Badge>

						<h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
							Turn a prompt into a{" "}
							<span className="text-primary">designed slide deck</span>.
						</h1>

						<p className="mt-4 max-w-xl text-base/relaxed text-muted-foreground text-balance">
							SlideForge writes the outline, picks a theme, and streams every
							slide in real time — then exports a PowerPoint you can actually
							edit.
						</p>

						<form onSubmit={handleSubmit} className="mt-7 max-w-xl">
							<div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 sm:flex-row sm:items-center">
								<SparklesIcon className="ml-2 hidden size-4 shrink-0 text-muted-foreground sm:block" />
								<input
									value={prompt}
									onChange={(event) => setPrompt(event.target.value)}
									placeholder="Investor pitch for a B2B SaaS startup…"
									aria-label="Describe the deck you want"
									className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
								/>
								<Button type="submit" className="shrink-0">
									<WandSparklesIcon />
									Generate deck
								</Button>
							</div>
						</form>

						<div className="mt-4 flex flex-wrap items-center gap-2">
							{EXAMPLE_PROMPTS.map((example) => (
								<button
									key={example}
									type="button"
									onClick={() => setPrompt(example)}
									className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								>
									{example}
								</button>
							))}
						</div>

						<div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<ShieldCheckIcon className="size-3.5 text-primary" />
								Bring your own API key
							</span>
							<span className="hidden sm:inline text-border">|</span>
							<span className="flex items-center gap-1.5">
								<CheckIcon className="size-3.5 text-primary" />
								No sign-up required
							</span>
						</div>
					</div>

					<DeckPreview />
				</div>
			</section>

			{/* Definition + stats — a clean, quotable summary for answer engines */}
			<section className="border-t border-border/60">
				<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
					<div className="mx-auto max-w-3xl text-center">
						<h2 className="font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl">
							What is SlideForge?
						</h2>
						<p className="mt-3 text-sm/relaxed text-muted-foreground text-balance">
							SlideForge is an AI slide deck generator that turns a short text
							prompt into a complete, on-brand PowerPoint presentation. It
							writes the outline, applies one of seven curated themes, streams
							each slide as it is created, and exports an editable .pptx file —
							no account required.
						</p>
					</div>

					<div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
						{STATS.map((stat) => (
							<div
								key={stat.label}
								className="rounded-2xl border border-border bg-card px-4 py-5 text-center"
							>
								<div className="font-heading text-2xl font-semibold tracking-tight text-primary">
									{stat.value}
								</div>
								<div className="mt-1 text-xs text-muted-foreground">
									{stat.label}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Features */}
			<section id="features" className="border-t border-border/60 bg-muted/20">
				<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
					<SectionHeading
						eyebrow="Features"
						title="Everything you need to get from idea to deck"
						body="From the first prompt to the final export, SlideForge keeps the whole flow in one place."
					/>

					<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{FEATURES.map((feature) => (
							<div
								key={feature.title}
								className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
							>
								<span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<feature.icon className="size-4.5" />
								</span>
								<h3 className="mt-4 font-heading text-sm font-semibold">
									{feature.title}
								</h3>
								<p className="mt-1.5 text-sm/relaxed text-muted-foreground">
									{feature.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* How it works */}
			<section id="how" className="border-t border-border/60">
				<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
					<SectionHeading
						eyebrow="How it works"
						title="Three steps, no slide wrangling"
					/>

					<div className="mt-12 grid gap-4 md:grid-cols-3">
						{HOW_TO_STEPS.map((step, index) => (
							<div
								key={step.title}
								className="relative rounded-2xl border border-border bg-card p-6"
							>
								<span className="flex size-8 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground">
									{index + 1}
								</span>
								<h3 className="mt-4 font-heading text-base font-semibold">
									{step.title}
								</h3>
								<p className="mt-1.5 text-sm/relaxed text-muted-foreground">
									{step.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Themes */}
			<section id="themes" className="border-t border-border/60 bg-muted/20">
				<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
					<SectionHeading
						eyebrow="Themes"
						title="A design system for every deck"
						body="Each theme ships a palette, typography scale and layout motifs — applied consistently across every slide."
					/>

					<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{DECK_THEMES.map((theme) => (
							<div
								key={theme.id}
								className="overflow-hidden rounded-2xl border border-border bg-card"
							>
								<div
									className="flex h-24 items-end p-3"
									style={{
										background: `linear-gradient(145deg, ${toCssColor(theme.gradient[0])}, ${toCssColor(theme.gradient[1])})`,
									}}
								>
									<span
										className="size-5 rounded-full ring-2 ring-white/20"
										style={{ backgroundColor: toCssColor(theme.accent) }}
									/>
								</div>
								<div className="p-3.5">
									<div className="flex items-center justify-between">
										<span className="font-heading text-sm font-medium">
											{theme.label}
										</span>
										<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
											{theme.mode}
										</span>
									</div>
									<p className="mt-1 text-xs leading-snug text-muted-foreground">
										{theme.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FAQ — written for answer engines, useful for people too */}
			<section id="faq" className="border-t border-border/60">
				<div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
					<SectionHeading
						eyebrow="FAQ"
						title="Frequently asked questions"
						body="Short answers about what SlideForge is, what it costs, and how it handles your data."
					/>

					<dl className="mt-12 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
						{FAQ_ENTRIES.map((entry) => (
							<div key={entry.question} className="p-5 sm:p-6">
								<dt className="font-heading text-sm font-semibold">
									{entry.question}
								</dt>
								<dd className="mt-2 text-sm/relaxed text-muted-foreground">
									{entry.answer}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			{/* CTA */}
			<section className="border-t border-border/60">
				<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
					<div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
						<div
							className="pointer-events-none absolute inset-0 -z-10"
							style={{
								backgroundImage:
									"radial-gradient(60% 90% at 50% 0%, var(--color-primary) 0%, transparent 65%)",
								opacity: 0.1,
							}}
						/>
						<h2 className="mx-auto max-w-2xl font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
							Your next deck is one sentence away
						</h2>
						<p className="mx-auto mt-3 max-w-xl text-sm/relaxed text-muted-foreground text-balance">
							Open the workspace, add a provider key, and watch the first
							outline stream in.
						</p>
						<div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
							<Button size="lg" onClick={() => onStart()}>
								<WandSparklesIcon />
								Start creating
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
							<Button variant="outline" size="lg" onClick={onOpenSettings}>
								Configure provider
							</Button>
						</div>

						<div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
							{PROVIDERS.map((provider) => (
								<span key={provider}>{provider}</span>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-border/60">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
					<div className="flex items-center gap-2">
						<span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<SparklesIcon className="size-3.5" />
						</span>
						<span className="font-heading font-medium text-foreground">
							SlideForge
						</span>
					</div>
					<p className="text-xs">
						Bring your own model. Keys stay in your browser.
					</p>
					<div className="flex items-center gap-4 text-xs">
						<a href="#features" className="hover:text-foreground">
							Features
						</a>
						<a href="#themes" className="hover:text-foreground">
							Themes
						</a>
						<a href="#faq" className="hover:text-foreground">
							FAQ
						</a>
						<button
							type="button"
							onClick={onOpenSettings}
							className="hover:text-foreground"
						>
							Provider
						</button>
					</div>
				</div>
			</footer>
		</div>
	);
}
