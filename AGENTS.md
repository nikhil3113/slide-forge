# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## This project (SlideForge)

Package manager and build runtime is **Bun**. Prefer the package scripts over raw `wrangler` commands:

| Command | Purpose |
|---------|---------|
| `bun run dev` | Local development (Vite dev server, client-side rendering only) |
| `bun run build` | `tsc -b` → `vite build` → prerender the homepage into `dist/client/index.html` |
| `bun run preview` | Build, then serve the build in the Workers runtime |
| `bun run check` | Typecheck, build, prerender, then `wrangler deploy --dry-run` |
| `bun run lint` / `bun run typecheck` | Lint / typecheck |
| `bun run cf-typegen` | Regenerate `worker-configuration.d.ts` after changing bindings |
| `bun run deploy` | Deploy — **does not build first**; run `bun run build` before it |

Notes:

- The marketing homepage is pre-rendered at build time by `scripts/prerender.tsx`. Keep the `<!--app-html-->` placeholder in `index.html`; the step exits with an error if it is missing.
- The client hydrates that markup with `hydrateRoot`. Server and client render output must match, so do not add theme-, storage- or time-dependent markup to the homepage (the theme toggle swaps icons with CSS for this reason).
- `vite dev` does not prerender by design. Verify rendered output with `bun run preview` or `wrangler dev` after a build.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## Best Practices (conditional)

If the application uses Durable Objects or Workflows, refer to the relevant best practices:

- Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Workflows: https://developers.cloudflare.com/workflows/build/rules-of-workflows/
