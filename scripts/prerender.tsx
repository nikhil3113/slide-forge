/**
 * Pre-renders the marketing homepage into `dist/client/index.html` so the
 * content is present in the raw HTML for crawlers and answer engines (and so
 * the first paint does not wait on JavaScript).
 *
 * Runs after `vite build` (see the `build` / `check` scripts) and is paired with
 * the `hydrateRoot` call in `src/react-app/main.tsx`.
 *
 * Run it directly with:  bun scripts/prerender.tsx
 */
import { readFile, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import App from "../src/react-app/App";

const INDEX_HTML = "dist/client/index.html";
const PLACEHOLDER = "<!--app-html-->";

const shell = await readFile(INDEX_HTML, "utf8").catch(() => {
	console.error(
		`prerender: could not read ${INDEX_HTML}. Run \`vite build\` first.`,
	);
	process.exit(1);
});

if (!shell.includes(PLACEHOLDER)) {
	console.error(
		`prerender: placeholder ${PLACEHOLDER} not found in ${INDEX_HTML}.`,
	);
	process.exit(1);
}

const markup = renderToString(createElement(App));

// A function replacer keeps `$&`-style sequences in the markup from being
// treated as replacement patterns.
await writeFile(INDEX_HTML, shell.replace(PLACEHOLDER, () => markup), "utf8");

console.log(
	`prerender: injected ${markup.length.toLocaleString()} characters into ${INDEX_HTML}`,
);
