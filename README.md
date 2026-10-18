# SlideForge

AI-powered slide deck generator. Describe a presentation in one sentence and SlideForge writes the outline, applies a theme, streams every slide as it is generated, and exports an editable PowerPoint (`.pptx`) file.

**Live:** https://slide-forge.nikchavan.dev

## Features

- **Prompt to deck** — a one-line brief becomes a structured outline plus fully designed slides.
- **Live streaming** — the outline, design system and each slide stream over server-sent events as they are written.
- **Chat to edit** — rewrite a slide, change the theme or tone, add and remove sections in plain language.
- **Seven curated themes** — Midnight, Paper, Ocean, Sunset, Forest, Nebula and Linen.
- **Editable `.pptx` export** — real shapes and text, not flattened screenshots.
- **Bring your own model key** — keys live in your browser and are never stored on the server. No account required.

## Stack

| Layer | Tech |
| --- | --- |
| Front end | React 19, Vite 7, Tailwind CSS v4, shadcn-style UI on Base UI, lucide icons |
| API | [Hono](https://hono.dev/) on Cloudflare Workers |
| Streaming | Server-sent events (`text/event-stream`) |
| Export | [`pptxgenjs`](https://gitbrent.github.io/PptxGenJS/), client-side and dynamically imported |
| Client storage | `sessionStorage` / `localStorage` for settings and theme, IndexedDB for workspaces |

## Quick start

[Bun](https://bun.sh/) is the package manager and build runtime.

```bash
bun install
bun run dev        # http://localhost:5173
```

Open the workspace, select **Provider**, and add a key for OpenAI, Anthropic, Google Gemini, Groq, OpenCode, or any OpenAI-compatible endpoint.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server (client-side rendering only, no prerender) |
| `bun run build` | `tsc -b` → `vite build` → prerender → output in `dist/client` |
| `bun run preview` | Build, then serve the build in the Workers runtime |
| `bun run prerender` | Render the homepage into `dist/client/index.html` (already part of `build`) |
| `bun run check` | Typecheck, build, prerender, then `wrangler deploy --dry-run` |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc -b` |
| `bun run smoke` | End-to-end API smoke test (needs a key, see below) |
| `bun run cf-typegen` | Regenerate `worker-configuration.d.ts` after changing bindings |
| `bun run deploy` | `wrangler deploy` — **does not build first** |

## Build pipeline and prerendering

`bun run build` runs three steps:

1. **`tsc -b`** — typecheck the app, worker and config projects.
2. **`vite build`** — bundle the client into `dist/client/`. The mount point is `<div id="root"><!--app-html--></div>`.
3. **`bun scripts/prerender.tsx`** — render `<App />` with `react-dom/server` and replace `<!--app-html-->` with the markup.

The marketing homepage is fully static, so pre-rendering it puts all copy, the FAQ, and the `FAQPage` / `HowTo` JSON-LD into the raw HTML for crawlers and answer engines that do not execute JavaScript.

The client hydrates that markup (`hydrateRoot`) when the container already has an element child, and falls back to `createRoot` otherwise.

Things to keep in mind:

- Keep the `<!--app-html-->` placeholder in `index.html`; the prerender step exits with an error if it is missing.
- `vite dev` serves the un-prerendered shell by design. Check rendered output with `bun run preview` or `wrangler dev` after a build.
- Server and client render output must stay identical. Avoid theme-, storage- and time-dependent markup on the homepage — the theme toggle swaps icons purely with CSS (`hidden dark:block`) rather than reading `isDark`, for exactly this reason.

## Providers and keys

Supported providers are defined in `src/lib/providers.ts`: OpenCode Go, OpenCode Zen, OpenAI, Groq, Google Gemini, Anthropic, and a custom OpenAI-compatible endpoint.

Keys are entered in the app, kept in `sessionStorage`, and sent per request to the Worker as the `x-llm-key` header. The Worker forwards the key to the chosen provider and stores nothing.

## API

All routes are under `/api` and are defined in `src/worker/routes`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/` | Identity check: `{ "name": "SlideForge" }` |
| `POST` | `/api/outline` | Stream a deck outline |
| `POST` | `/api/style-guide` | Stream the deck's design system |
| `POST` | `/api/slide-html` | Stream one slide's HTML |
| `POST` | `/api/chat` | Stream a chat reply, which may carry a deck edit action |

The `POST` routes stream `text/event-stream` and read the model key from the `x-llm-key` header, plus `x-llm-session` for session-scoped providers (OpenCode Go / Zen).

## SEO, AEO and GEO

| Asset | Purpose |
| --- | --- |
| `index.html` | Title, description, canonical, robots directives, Open Graph + Twitter cards, and `Organization` / `WebSite` / `SoftwareApplication` JSON-LD |
| `src/lib/seo.ts` | Single source of truth for the FAQ copy, how-to steps and the `FAQPage` / `HowTo` JSON-LD |
| `public/robots.txt` | Crawl rules; explicitly allows AI search and training crawlers |
| `public/sitemap.xml` | Sitemap |
| `public/llms.txt` | Markdown brief for LLMs |

Because the FAQ and how-to copy come from `src/lib/seo.ts`, the visible text and the structured data cannot drift apart.

Not done yet:

- `og:image` — social cards currently use `twitter:card=summary` with no image.
- A build assertion that fails when the prerender produced no content.
- Continuous integration (see below).

## Deployment

The Worker is `ppt-gen-ai` and serves the custom domain `slide-forge.nikchavan.dev`.

```bash
bun run build
bun run deploy
```

`bun run deploy` only runs `wrangler deploy`, so always build first.

### Continuous integration

Both options run `bun run build`, so the prerender step is always included.

- **Cloudflare Workers Builds** — connect the repository under **Workers & Pages → ppt-gen-ai → Settings → Builds**. Use build command `bun run lint && bun run typecheck && bun run build` and the default deploy command `npx wrangler deploy`. Bun is preinstalled in the build image, and non-production branches produce preview builds.
- **GitHub Actions** — `cloudflare/wrangler-action@v4` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets, after `bun install --frozen-lockfile` and `bun run build`.

## Project structure

```
src/
  react-app/    client entry, App shell, global styles
  components/
    app/        landing page, header, chat panel, slide views, toolbar
    ui/         shadcn-style primitives built on Base UI
  hooks/        deck workspace, deck chat, theme
  lib/          API client, IndexedDB, SEO data, themes, PPTX export, SSE
  worker/       Hono routes, model providers, prompts
  types/        shared zod schemas and types
scripts/
  prerender.tsx homepage prerender (build step)
  smoke.ts      API smoke test
public/         favicon, robots.txt, sitemap.xml, llms.txt
```

## Smoke test

The smoke test drives the streaming API end to end and validates the responses against the zod schemas.

```bash
# .env.smoke (gitignored)
LLM_KEY=your-key-here

bun run smoke
```

The key is read from `LLM_KEY`, `OPENCODE_API_KEY` or `LLM_API_KEY` (environment or `.env.smoke`). Optional variables: `BASE_URL`, `PROVIDER`, `MODEL`, `PROVIDER_BASE_URL`, `TOPIC`, `SLIDE_COUNT`, `SLIDE_INDEX`, `SESSION_ID`.

## Resources

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) · [static assets routing](https://developers.cloudflare.com/workers/static-assets/routing/) · [Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [Vite](https://vite.dev/guide/)
- [React](https://react.dev/)
- [Hono](https://hono.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
