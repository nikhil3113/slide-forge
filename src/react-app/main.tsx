import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const container = document.getElementById("root")!;
const app = (
	<StrictMode>
		<App />
	</StrictMode>
);

// The homepage is pre-rendered into index.html at build time (see
// scripts/prerender.tsx), so hydrate that markup. When the container is empty
// (e.g. `vite dev`, or a build without the prerender step) render from scratch.
// `firstElementChild` ignores the `<!--app-html-->` placeholder comment.
if (container.firstElementChild) {
	hydrateRoot(container, app);
} else {
	createRoot(container).render(app);
}
