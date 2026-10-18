/**
 * SEO / AEO / GEO content shared between the visible landing page and the
 * structured-data (JSON-LD) we emit for crawlers and answer engines.
 *
 * Keeping the FAQ and how-to copy here means the on-page text and the schema
 * can never drift apart.
 */

export interface FaqEntry {
	question: string;
	answer: string;
}

/** Answer-engine friendly Q&A: each answer is a standalone, quotable sentence or two. */
export const FAQ_ENTRIES: FaqEntry[] = [
	{
		question: "What is SlideForge?",
		answer:
			"SlideForge is a web app that turns a short text prompt into a complete PowerPoint slide deck. It writes a structured outline, applies a consistent theme, streams each slide as it is created, and exports a real .pptx file you can keep editing.",
	},
	{
		question: "Is SlideForge free?",
		answer:
			"SlideForge is free and requires no account. You bring your own AI provider key, so you only pay that provider for the tokens a deck uses.",
	},
	{
		question: "Which AI models does SlideForge support?",
		answer:
			"SlideForge works with OpenAI, Anthropic Claude, Google Gemini, Groq and OpenCode out of the box, plus any OpenAI-compatible endpoint you configure in the Provider dialog.",
	},
	{
		question: "Can SlideForge export real PowerPoint files?",
		answer:
			"Yes. Decks export as genuine .pptx files with editable text and shapes rather than flat screenshots, so they open cleanly in Microsoft PowerPoint, Google Slides or Keynote.",
	},
	{
		question: "Where are my API keys stored?",
		answer:
			"Keys never leave your browser. They are kept in session storage and sent only to the provider you choose when a request is made; the SlideForge server does not store them.",
	},
	{
		question: "How many slides can I generate?",
		answer:
			"Decks run from 3 to 20 slides. Set the slide count in the deck brief, or describe the presentation and let SlideForge choose a sensible length.",
	},
	{
		question: "Can I edit a deck after it is generated?",
		answer:
			"Yes. Use the chat panel to rewrite a slide, change the theme or tone, add and remove sections, or regenerate a single slide without touching the rest of the deck.",
	},
];

export interface HowToStep {
	title: string;
	body: string;
}

/** Steps shown in the on-page "How it works" section and reused for HowTo schema. */
export const HOW_TO_STEPS: HowToStep[] = [
	{
		title: "Describe it",
		body: "Type a one-line brief, then set slide count, theme and tone — or leave it to SlideForge.",
	},
	{
		title: "Watch it stream",
		body: "The outline lands first, then a design system, then each slide renders live as it is written.",
	},
	{
		title: "Refine and export",
		body: "Chat your way to the final deck, then download an editable PowerPoint file.",
	},
];

/** FAQPage schema, rendered into the document alongside the visible FAQ section. */
export function faqJsonLd() {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: FAQ_ENTRIES.map((entry) => ({
			"@type": "Question",
			name: entry.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: entry.answer,
			},
		})),
	};
}

/** HowTo schema for the three-step generation flow. */
export function howToJsonLd() {
	return {
		"@context": "https://schema.org",
		"@type": "HowTo",
		name: "How to generate a slide deck with SlideForge",
		description:
			"Create a designed PowerPoint presentation from a text prompt in three steps.",
		step: HOW_TO_STEPS.map((step, index) => ({
			"@type": "HowToStep",
			position: index + 1,
			name: step.title,
			text: step.body,
		})),
	};
}
