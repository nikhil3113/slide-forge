import htmlToImageSource from "html-to-image/dist/html-to-image.js?raw";

const SAFE_LIBRARY_SOURCE = htmlToImageSource
	.replace(/\/\/# sourceMappingURL=.*$/m, "")
	.replace(/<\/script/gi, "<\\/script");

const CSP =
	"default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; media-src data:";

const DISPLAY_HARNESS = `
(function () {
	var styleEl = document.getElementById("slide-style");
	var contentEl = document.getElementById("slide-content");
	function apply(html) {
		try {
			var doc = new DOMParser().parseFromString(html, "text/html");
			var css = Array.prototype.map
				.call(doc.querySelectorAll("style"), function (node) {
					return node.textContent || "";
				})
				.join("\\n");
			if (styleEl) styleEl.textContent = css;
			if (contentEl) contentEl.innerHTML = doc.body ? doc.body.innerHTML : html;
		} catch (error) {
			/* keep the last good frame */
		}
	}
	window.addEventListener("message", function (event) {
		var data = event.data || {};
		if (data.type === "partial" && typeof data.html === "string") {
			apply(data.html);
		}
	});
	parent.postMessage({ type: "ready" }, "*");
})();
`;

function captureHarness(): string {
	return `
(function () {
	function progress(stage) {
		parent.postMessage({ type: "capture-progress", stage: stage }, "*");
	}

	function withTimeout(promise, ms, label) {
		return Promise.race([
			promise,
			new Promise(function (_resolve, reject) {
				setTimeout(function () {
					reject(new Error("Timed out waiting for " + label));
				}, ms);
			}),
		]);
	}

	function waitForReady() {
		progress("ready-check");
		var ready = Promise.resolve();
		if (window.__slideReady && typeof window.__slideReady.then === "function") {
			ready = withTimeout(window.__slideReady, 2000, "slide scripts");
		}
		return ready
			.then(function () {
				progress("fonts");
				return withTimeout(
					document.fonts ? document.fonts.ready : Promise.resolve(),
					1500,
					"fonts",
				);
			})
			.then(function () {
				progress("layout");
				return new Promise(function (resolve) {
					var done = false;
					function finish() {
						if (done) return;
						done = true;
						resolve();
					}
					if (typeof requestAnimationFrame === "function") {
						requestAnimationFrame(function () {
							requestAnimationFrame(finish);
						});
					}
					setTimeout(finish, 150);
				});
			});
	}

	function capture() {
		waitForReady()
			.then(function () {
				progress("serializing");
				var root =
					document.querySelector(".slide") ||
					document.getElementById("slide-content") ||
					document.body;
				return withTimeout(
					window.htmlToImage.toSvg(root, {
						width: 1280,
						height: 720,
						skipFonts: true,
					}),
					10000,
					"slide serialization",
				);
			})
			.then(function (dataUrl) {
				progress("serialized");
				parent.postMessage({ type: "svg", dataUrl: dataUrl }, "*");
			})
			.catch(function (error) {
				parent.postMessage(
					{
						type: "capture-error",
						message: String((error && error.message) || error),
					},
					"*",
				);
			});
	}

	window.addEventListener("message", function (event) {
		var data = event.data || {};
		if (data.type === "capture") capture();
	});
	parent.postMessage({ type: "ready" }, "*");
})();
`;
}

function extractDocumentParts(html: string): { styles: string; body: string } {
	try {
		const doc = new DOMParser().parseFromString(html, "text/html");
		const styles = [...doc.querySelectorAll("style")]
			.map((node) => node.textContent ?? "")
			.join("\n");
		let body = doc.body ? doc.body.innerHTML : html;

		const hasRoot =
			doc.querySelector(".slide, [id='slide'], [data-slide-root]") !== null;
		if (!hasRoot && body.trim().length > 0) {
			body = `<section class="slide">${body}</section>`;
		}

		return { styles, body };
	} catch {
		return { styles: "", body: html };
	}
}

function buildDocument(options: {
	tokensCss: string;
	styles: string;
	body: string;
	scripts: string;
}): string {
	return [
		"<!doctype html><html><head><meta charset=\"utf-8\">",
		`<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
		`<style>${options.tokensCss}</style>`,
		`<style>${options.styles}</style>`,
		"</head><body>",
		options.body,
		options.scripts,
		"</body></html>",
	].join("");
}

export interface SlideDisplayHandle {
	update(html: string): void;
	destroy(): void;
}

export function createSlideDisplay(
	host: HTMLElement,
	tokensCss: string,
): SlideDisplayHandle {
	host.style.position = "relative";
	host.style.overflow = "hidden";

	const iframe = document.createElement("iframe");
	iframe.setAttribute("sandbox", "allow-scripts");
	iframe.setAttribute("title", "Slide preview");
	iframe.style.cssText =
		"position:absolute;left:0;top:0;width:1280px;height:720px;border:0;transform-origin:top left;";

	let ready = false;
	let pending: string | undefined;

	const onMessage = (event: MessageEvent) => {
		if (event.source !== iframe.contentWindow) return;
		const data = event.data as { type?: string };
		if (data?.type !== "ready") return;
		ready = true;
		if (pending !== undefined) {
			iframe.contentWindow?.postMessage({ type: "partial", html: pending }, "*");
			pending = undefined;
		}
	};
	window.addEventListener("message", onMessage);

	const resize = () => {
		const scale = host.clientWidth > 0 ? host.clientWidth / 1280 : 1;
		iframe.style.transform = `scale(${scale})`;
	};
	const observer = new ResizeObserver(resize);
	observer.observe(host);
	resize();

	iframe.srcdoc = buildDocument({
		tokensCss,
		styles: "",
		body: '<div id="slide-content"></div><style id="slide-style"></style>',
		scripts: `<script>${DISPLAY_HARNESS}</script>`,
	});
	host.appendChild(iframe);

	return {
		update(html: string) {
			if (ready) {
				iframe.contentWindow?.postMessage({ type: "partial", html }, "*");
			} else {
				pending = html;
			}
		},
		destroy() {
			observer.disconnect();
			window.removeEventListener("message", onMessage);
			iframe.remove();
		},
	};
}

export interface CaptureOptions {
	pixelRatio?: number;
	quality?: number;
	backgroundColor: string;
}

function rasterizeSvg(
	dataUrl: string,
	pixelRatio: number,
	quality: number,
	backgroundColor: string,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		const timer = window.setTimeout(() => {
			reject(new Error("Slide rasterization timed out."));
		}, 12000);

		image.onload = () => {
			window.clearTimeout(timer);
			try {
				const canvas = document.createElement("canvas");
				canvas.width = 1280 * pixelRatio;
				canvas.height = 720 * pixelRatio;
				const ctx = canvas.getContext("2d");
				if (!ctx) throw new Error("Canvas is unavailable.");
				ctx.fillStyle = backgroundColor;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL("image/jpeg", quality));
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		};

		image.onerror = () => {
			window.clearTimeout(timer);
			reject(new Error("Slide image could not be decoded."));
		};

		image.src = dataUrl;
	});
}

export function captureSlideImage(
	html: string,
	tokensCss: string,
	options: CaptureOptions,
): Promise<string> {
	const pixelRatio = options.pixelRatio ?? 2;
	const quality = options.quality ?? 0.86;
	const { styles, body } = extractDocumentParts(html);

	const container = document.createElement("div");
	container.style.cssText =
		"position:fixed;left:-10000px;top:0;width:1280px;height:720px;pointer-events:none;";
	const iframe = document.createElement("iframe");
	iframe.setAttribute("sandbox", "allow-scripts");
	iframe.setAttribute("title", "Slide capture");
	iframe.style.cssText = `width:1280px;height:720px;border:0;background:${options.backgroundColor};`;
	container.appendChild(iframe);
	document.body.appendChild(container);

	return new Promise<string>((resolve, reject) => {
		let settled = false;
		const timeout = window.setTimeout(() => {
			if (settled) return;
			settled = true;
			window.removeEventListener("message", onMessage);
			reject(new Error("Slide rendering timed out."));
		}, 25000);

		const finish = (callback: () => void) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timeout);
			window.removeEventListener("message", onMessage);
			callback();
		};

		const onMessage = (event: MessageEvent) => {
			if (event.source !== iframe.contentWindow) return;
			const data = event.data as {
				type?: string;
				dataUrl?: string;
				message?: string;
			};
			if (!data || typeof data !== "object") return;

			if (data.type === "ready") {
				iframe.contentWindow?.postMessage({ type: "capture" }, "*");
			} else if (data.type === "svg" && typeof data.dataUrl === "string") {
				rasterizeSvg(
					data.dataUrl,
					pixelRatio,
					quality,
					options.backgroundColor,
				).then(
					(jpeg) => finish(() => resolve(jpeg)),
					(error) =>
						finish(() =>
							reject(
								error instanceof Error
									? error
									: new Error("Slide rasterization failed."),
							),
						),
				);
			} else if (data.type === "capture-error") {
				finish(() => reject(new Error(data.message ?? "Slide capture failed.")));
			}
		};

		window.addEventListener("message", onMessage);

		iframe.srcdoc = buildDocument({
			tokensCss,
			styles,
			body,
			scripts:
				`<script>${SAFE_LIBRARY_SOURCE}</script>` +
				`<script>${captureHarness()}</script>`,
		});
	}).finally(() => {
		container.remove();
	});
}
