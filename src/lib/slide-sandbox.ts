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

const HARNESS_COMMON = `
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
`;

function captureHarness(): string {
	return `
(function () {
${HARNESS_COMMON}

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

function editableHarness(): string {
	return `
(function () {
${HARNESS_COMMON}

	var VIEW_WIDTH = 1280;
	var VIEW_HEIGHT = 720;
	var MAX_BLOCKS = 320;

	function slideRoot() {
		return (
			document.querySelector(".slide") ||
			document.getElementById("slide-content") ||
			document.body
		);
	}

	function insideSvg(element) {
		var node = element;
		while (node) {
			if (node.namespaceURI === "http://www.w3.org/2000/svg") return true;
			node = node.parentElement;
		}
		return false;
	}

	function isHidden(element) {
		var node = element;
		var depth = 0;
		while (node && node.nodeType === 1 && depth < 50) {
			var style = window.getComputedStyle(node);
			if (
				style.display === "none" ||
				style.visibility === "hidden" ||
				parseFloat(style.opacity || "1") === 0
			) {
				return true;
			}
			node = node.parentElement;
			depth += 1;
		}
		return false;
	}

	function hasTransparentFill(style) {
		var fill = style.webkitTextFillColor || "";
		if (fill === "transparent") return true;
		return /rgba\\([^)]*,\\s*(0|0?\\.0+)\\s*\\)$/i.test(fill);
	}

	function hasUnsupportedPaint(element, stop) {
		var node = element;
		while (node && node.nodeType === 1) {
			var style = window.getComputedStyle(node);
			if (style.backgroundClip === "text" || style.webkitBackgroundClip === "text") {
				return true;
			}
			if (hasTransparentFill(style)) return true;
			if (node === stop) break;
			node = node.parentElement;
		}
		return false;
	}

	function blockContainer(textNode, rootElement) {
		var element = textNode.parentElement;
		while (element && element !== rootElement) {
			var display = window.getComputedStyle(element).display;
			if (display !== "inline" && display !== "contents") return element;
			element = element.parentElement;
		}
		return rootElement;
	}

	function nodeBounds(textNode) {
		var range = document.createRange();
		range.selectNodeContents(textNode);
		var rects = range.getClientRects();
		if (!rects || rects.length === 0) {
			var single = range.getBoundingClientRect();
			if (!single || (!single.width && !single.height)) return null;
			return {
				left: single.left,
				top: single.top,
				right: single.right,
				bottom: single.bottom,
			};
		}
		var left = rects[0].left;
		var top = rects[0].top;
		var right = rects[0].right;
		var bottom = rects[0].bottom;
		for (var index = 1; index < rects.length; index += 1) {
			left = Math.min(left, rects[index].left);
			top = Math.min(top, rects[index].top);
			right = Math.max(right, rects[index].right);
			bottom = Math.max(bottom, rects[index].bottom);
		}
		return { left: left, top: top, right: right, bottom: bottom };
	}

	function textNodeLines(textNode) {
		var text = textNode.nodeValue || "";
		if (text.length > 3000) {
			var bounds = nodeBounds(textNode);
			if (!bounds) return [];
			return [
				{
					text: text,
					left: bounds.left,
					right: bounds.right,
					top: bounds.top,
					bottom: bounds.bottom,
				},
			];
		}
		var range = document.createRange();
		var lines = [];
		var current = null;
		for (var index = 0; index < text.length; index += 1) {
			var character = text.charAt(index);
			range.setStart(textNode, index);
			range.setEnd(textNode, index + 1);
			var rect = range.getBoundingClientRect();
			if (!rect || (!rect.width && !rect.height)) {
				if (current) current.text += character;
				continue;
			}
			var tolerance = Math.max(2, rect.height * 0.4);
			if (current && Math.abs(rect.top - current.top) <= tolerance) {
				current.text += character;
				current.left = Math.min(current.left, rect.left);
				current.right = Math.max(current.right, rect.right);
				current.top = Math.min(current.top, rect.top);
				current.bottom = Math.max(current.bottom, rect.bottom);
			} else {
				if (current) lines.push(current);
				current = {
					text: character,
					left: rect.left,
					right: rect.right,
					top: rect.top,
					bottom: rect.bottom,
				};
			}
		}
		if (current) lines.push(current);
		return lines;
	}

	var metricsCache = {};

	function fontMetrics(style) {
		var shorthand =
			(style.fontStyle || "normal") +
			" " +
			(style.fontWeight || "400") +
			" " +
			(parseFloat(style.fontSize) || 16) +
			"px " +
			(style.fontFamily || "sans-serif");
		if (metricsCache[shorthand]) return metricsCache[shorthand];
		var metrics = { ascent: 0, descent: 0 };
		try {
			var canvas = document.createElement("canvas");
			var context = canvas.getContext("2d");
			if (context) {
				context.font = shorthand;
				var measured = context.measureText("Hg");
				metrics.ascent = measured.fontBoundingBoxAscent || 0;
				metrics.descent = measured.fontBoundingBoxDescent || 0;
			}
		} catch (error) {
			metrics = { ascent: 0, descent: 0 };
		}
		if (!metrics.ascent || !metrics.descent) {
			var fontSize = parseFloat(style.fontSize) || 16;
			metrics.ascent = fontSize * 0.92;
			metrics.descent = fontSize * 0.24;
		}
		metricsCache[shorthand] = metrics;
		return metrics;
	}

	function rgbToHex(value) {
		if (!value) return "#000000";
		if (value.charAt(0) === "#") return value;
		var match = /rgba?\\(([^)]+)\\)/.exec(value);
		if (!match) return "#000000";
		var parts = match[1].split(",");
		var channel = function (part) {
			var number = Math.max(0, Math.min(255, parseInt(part, 10) || 0));
			var hex = number.toString(16);
			return hex.length === 1 ? "0" + hex : hex;
		};
		return "#" + channel(parts[0]) + channel(parts[1]) + channel(parts[2]);
	}

	function runStyle(style) {
		var weight = style.fontWeight || "400";
		var numericWeight = parseInt(weight, 10);
		return {
			fontFamily: style.fontFamily || "",
			fontSize: parseFloat(style.fontSize) || 16,
			bold:
				weight === "bold" ||
				(!isNaN(numericWeight) && numericWeight >= 600),
			italic: style.fontStyle === "italic" || style.fontStyle === "oblique",
			underline: (style.textDecorationLine || "").indexOf("underline") >= 0,
			color: hasTransparentFill(style) ? "#000000" : rgbToHex(style.color),
			charSpacing: parseFloat(style.letterSpacing) || 0,
			textTransform: style.textTransform || "none",
		};
	}

	function styleKey(style) {
		return [
			style.fontFamily,
			style.fontSize,
			style.bold,
			style.italic,
			style.underline,
			style.color,
			style.charSpacing,
			style.textTransform,
		].join("|");
	}

	function containerContentBox(container, style) {
		var rect = container.getBoundingClientRect();
		var padLeft = parseFloat(style.paddingLeft) || 0;
		var padRight = parseFloat(style.paddingRight) || 0;
		var borderLeft = parseFloat(style.borderLeftWidth) || 0;
		var borderRight = parseFloat(style.borderRightWidth) || 0;
		return {
			left: rect.left + borderLeft + padLeft,
			width: Math.max(
				0,
				rect.width - borderLeft - borderRight - padLeft - padRight,
			),
		};
	}

	function rotationDegrees(style) {
		var transform = style.transform || "";
		if (!transform || transform === "none") return 0;
		var match = /^matrix\\(([^)]+)\\)$/.exec(transform);
		if (!match) return 0;
		var parts = match[1].split(",").map(function (part) {
			return parseFloat(part);
		});
		if (parts.length < 4) return 0;
		if (
			Math.abs(parts[0] - parts[3]) > 0.01 ||
			Math.abs(parts[1] + parts[2]) > 0.01
		) {
			return 0;
		}
		var angle = Math.atan2(parts[1], parts[0]) * (180 / Math.PI);
		return Math.abs(angle) < 0.5 ? 0 : Math.round(angle * 10) / 10;
	}

	function collectGroups(rootElement) {
		var walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null);
		var groups = [];
		var textNode = walker.nextNode();
		while (textNode) {
			var value = textNode.nodeValue || "";
			var parent = textNode.parentElement;
			if (parent && value.replace(/\\s+/g, "").length > 0) {
				var tag = parent.tagName;
				var skip =
					tag === "SCRIPT" ||
					tag === "STYLE" ||
					tag === "NOSCRIPT" ||
					tag === "TITLE" ||
					tag === "TEXTAREA" ||
					insideSvg(parent) ||
					isHidden(parent) ||
					hasUnsupportedPaint(parent, rootElement);
				if (!skip) {
					var container = blockContainer(textNode, rootElement);
					var writingMode =
						window.getComputedStyle(container).writingMode || "";
					if (writingMode.indexOf("vertical") === 0) skip = true;
					if (!skip) {
						var computed = window.getComputedStyle(parent);
						var group = null;
						for (var index = 0; index < groups.length; index += 1) {
							if (groups[index].container === container) {
								group = groups[index];
								break;
							}
						}
						if (!group) {
							group = { container: container, nodes: [] };
							groups.push(group);
						}
						group.nodes.push({
							node: textNode,
							style: runStyle(computed),
							metrics: fontMetrics(computed),
							lines: textNodeLines(textNode),
						});
					}
				}
			}
			textNode = walker.nextNode();
		}
		return groups.slice(0, MAX_BLOCKS);
	}

	function buildBlock(group, rootElement) {
		var container = group.container;
		var containerStyle = window.getComputedStyle(container);

		var rawLines = [];
		for (var nodeIndex = 0; nodeIndex < group.nodes.length; nodeIndex += 1) {
			var entry = group.nodes[nodeIndex];
			for (
				var entryLineIndex = 0;
				entryLineIndex < entry.lines.length;
				entryLineIndex += 1
			) {
				var entryLine = entry.lines[entryLineIndex];
				rawLines.push({
					text: entryLine.text,
					style: entry.style,
					metrics: entry.metrics,
					left: entryLine.left,
					right: entryLine.right,
					top: entryLine.top,
					bottom: entryLine.bottom,
				});
			}
		}
		if (rawLines.length === 0) return null;
		rawLines.sort(function (a, b) {
			return a.top - b.top || a.left - b.left;
		});

		var visualLines = [];
		for (var lineIndex = 0; lineIndex < rawLines.length; lineIndex += 1) {
			var line = rawLines[lineIndex];
			var tolerance = Math.max(2, (line.bottom - line.top) * 0.4);
			var target = null;
			for (
				var mergeIndex = visualLines.length - 1;
				mergeIndex >= 0;
				mergeIndex -= 1
			) {
				if (visualLines[mergeIndex].top - line.top > tolerance) break;
				if (Math.abs(visualLines[mergeIndex].top - line.top) <= tolerance) {
					target = visualLines[mergeIndex];
					break;
				}
			}
			if (target) {
				target.parts.push(line);
				target.top = Math.min(target.top, line.top);
				target.bottom = Math.max(target.bottom, line.bottom);
				target.left = Math.min(target.left, line.left);
				target.right = Math.max(target.right, line.right);
			} else {
				visualLines.push({
					top: line.top,
					bottom: line.bottom,
					left: line.left,
					right: line.right,
					parts: [line],
				});
			}
		}
		visualLines.sort(function (a, b) {
			return a.top - b.top || a.left - b.left;
		});

		var firstVisual = visualLines[0];
		var lastVisual = visualLines[visualLines.length - 1];
		if (firstVisual.right <= 0 || firstVisual.bottom <= 0) return null;
		if (lastVisual.left >= VIEW_WIDTH || lastVisual.top >= VIEW_HEIGHT) return null;

		var baseStyle = group.nodes[0].style;
		var lineRunLists = [];
		for (
			var visualIndex = 0;
			visualIndex < visualLines.length;
			visualIndex += 1
		) {
			var visual = visualLines[visualIndex];
			visual.parts.sort(function (a, b) {
				return a.left - b.left;
			});
			var lineRuns = [];
			for (var partIndex = 0; partIndex < visual.parts.length; partIndex += 1) {
				var part = visual.parts[partIndex];
				var text = part.text.replace(/\\s+/g, " ");
				if (text.length === 0) continue;
				var previous = lineRuns.length > 0 ? lineRuns[lineRuns.length - 1] : null;
				if (previous && styleKey(previous.style) === styleKey(part.style)) {
					previous.text += text;
				} else {
					lineRuns.push({ text: text, style: part.style });
				}
			}
			if (lineRuns.length > 0) {
				lineRuns[0].text = lineRuns[0].text.replace(/^\\s+/, "");
				lineRuns[lineRuns.length - 1].text = lineRuns[lineRuns.length - 1].text.replace(
					/\\s+$/,
					"",
				);
				var filtered = [];
				for (
					var filterIndex = 0;
					filterIndex < lineRuns.length;
					filterIndex += 1
				) {
					if (lineRuns[filterIndex].text.length > 0) {
						filtered.push(lineRuns[filterIndex]);
					}
				}
				lineRunLists.push(filtered);
			} else {
				lineRunLists.push([]);
			}
		}

		var firstContentIndex = -1;
		var lastContentIndex = -1;
		for (var contentIndex = 0; contentIndex < lineRunLists.length; contentIndex += 1) {
			if (lineRunLists[contentIndex].length > 0) {
				if (firstContentIndex < 0) firstContentIndex = contentIndex;
				lastContentIndex = contentIndex;
			}
		}
		if (firstContentIndex < 0) return null;
		for (
			var fillIndex = firstContentIndex + 1;
			fillIndex < lastContentIndex;
			fillIndex += 1
		) {
			if (lineRunLists[fillIndex].length === 0) {
				lineRunLists[fillIndex] = [{ text: " ", style: baseStyle }];
			}
		}

		var align = containerStyle.textAlign || "left";
		if (
			align === "start" ||
			align === "justify" ||
			align === "justify-all" ||
			align === "match-parent"
		) {
			align = containerStyle.direction === "rtl" ? "right" : "left";
		}
		if (align !== "left" && align !== "center" && align !== "right") {
			align = "left";
		}

		var firstPart = firstVisual.parts[0];
		var fontSize = parseFloat(firstPart.style.fontSize) || 16;
		var rawLineHeight = parseFloat(firstPart.style.lineHeight);
		var cssPitch =
			isNaN(rawLineHeight) || rawLineHeight <= 0 ? fontSize * 1.2 : rawLineHeight;
		var pitch =
			visualLines.length > 1
				? (lastVisual.top - firstVisual.top) / (visualLines.length - 1)
				: cssPitch;
		if (!isFinite(pitch) || pitch <= 0) pitch = cssPitch;
		pitch = Math.max(fontSize * 0.8, Math.min(fontSize * 4, pitch));

		var x;
		var width;
		if (lastContentIndex > firstContentIndex) {
			var content = containerContentBox(container, containerStyle);
			x = content.left;
			width = content.width;
		} else {
			x = firstVisual.left;
			width = Math.max(1, firstVisual.right - firstVisual.left);
		}

		var clampedLeft = Math.max(0, x);
		var clampedRight = Math.min(VIEW_WIDTH, x + width);
		if (clampedRight <= clampedLeft) {
			clampedRight = Math.min(VIEW_WIDTH, clampedLeft + 1);
		}
		var clampedTop = Math.max(0, firstVisual.top + firstContentIndex * pitch);
		var clampedBottom = Math.min(VIEW_HEIGHT, lastVisual.bottom);

		var runs = [];
		for (
			var listIndex = firstContentIndex;
			listIndex <= lastContentIndex;
			listIndex += 1
		) {
			var list = lineRunLists[listIndex];
			for (var runIndex = 0; runIndex < list.length; runIndex += 1) {
				var runStyleValue = list[runIndex].style;
				runs.push({
					text: list[runIndex].text,
					fontFamily: runStyleValue.fontFamily,
					fontSize: runStyleValue.fontSize,
					bold: runStyleValue.bold,
					italic: runStyleValue.italic,
					underline: runStyleValue.underline,
					color: runStyleValue.color,
					charSpacing: runStyleValue.charSpacing,
					textTransform: runStyleValue.textTransform,
					breakLine: listIndex < lastContentIndex && runIndex === list.length - 1,
				});
			}
		}
		if (runs.length === 0) return null;

		return {
			x: clampedLeft,
			y: clampedTop,
			w: clampedRight - clampedLeft,
			h: Math.max(1, clampedBottom - clampedTop),
			align: align,
			lineHeight: pitch,
			ascent: firstPart.metrics.ascent,
			descent: firstPart.metrics.descent,
			fontSize: fontSize,
			lineCount: lastContentIndex - firstContentIndex + 1,
			rotate: rotationDegrees(containerStyle),
			runs: runs,
		};
	}

	function hideGroupNodes(group) {
		for (var index = 0; index < group.nodes.length; index += 1) {
			var node = group.nodes[index].node;
			if (!node.parentNode) continue;
			var span = document.createElement("span");
			span.style.visibility = "hidden";
			node.parentNode.insertBefore(span, node);
			span.appendChild(node);
		}
	}

	function extract() {
		waitForReady()
			.then(function () {
				progress("extracting");
				var rootElement = slideRoot();
				var groups = collectGroups(rootElement);
				var accepted = [];
				for (var index = 0; index < groups.length; index += 1) {
					var block = buildBlock(groups[index], rootElement);
					if (block) accepted.push({ group: groups[index], block: block });
				}
				for (var hideIndex = 0; hideIndex < accepted.length; hideIndex += 1) {
					hideGroupNodes(accepted[hideIndex].group);
				}
				progress("serializing");
				return withTimeout(
					window.htmlToImage.toSvg(rootElement, {
						width: VIEW_WIDTH,
						height: VIEW_HEIGHT,
						skipFonts: true,
					}),
					10000,
					"slide serialization",
				).then(function (dataUrl) {
					return {
						dataUrl: dataUrl,
						blocks: accepted.map(function (entry) {
							return entry.block;
						}),
					};
				});
			})
			.then(function (payload) {
				progress("serialized");
				parent.postMessage(
					{
						type: "editable",
						backgroundSvg: payload.dataUrl,
						blocks: payload.blocks,
					},
					"*",
				);
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
		if (data.type === "capture-editable") extract();
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

export interface EditableRun {
	text: string;
	fontFamily: string;
	fontSize: number;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	color: string;
	charSpacing: number;
	textTransform: string;
	breakLine: boolean;
}

export interface EditableTextBlock {
	x: number;
	y: number;
	w: number;
	h: number;
	align: "left" | "center" | "right";
	lineHeight: number;
	ascent: number;
	descent: number;
	fontSize: number;
	lineCount: number;
	rotate: number;
	runs: EditableRun[];
}

export interface EditableCapture {
	background: string;
	blocks: EditableTextBlock[];
}

type SandboxPayload =
	| { mode: "image"; svg: string }
	| { mode: "editable"; svg: string; blocks: EditableTextBlock[] };

function captureSandboxPayload(options: {
	html: string;
	tokensCss: string;
	backgroundColor: string;
	mode: "image" | "editable";
}): Promise<SandboxPayload> {
	const { styles, body } = extractDocumentParts(options.html);

	const container = document.createElement("div");
	container.style.cssText =
		"position:fixed;left:-10000px;top:0;width:1280px;height:720px;pointer-events:none;";
	const iframe = document.createElement("iframe");
	iframe.setAttribute("sandbox", "allow-scripts");
	iframe.setAttribute("title", "Slide capture");
	iframe.style.cssText = `width:1280px;height:720px;border:0;background:${options.backgroundColor};`;
	container.appendChild(iframe);
	document.body.appendChild(container);

	const startMessage =
		options.mode === "image" ? "capture" : "capture-editable";
	const harness =
		options.mode === "image" ? captureHarness() : editableHarness();

	return new Promise<SandboxPayload>((resolve, reject) => {
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
				backgroundSvg?: string;
				blocks?: EditableTextBlock[];
				message?: string;
			};
			if (!data || typeof data !== "object") return;

			if (data.type === "ready") {
				iframe.contentWindow?.postMessage({ type: startMessage }, "*");
			} else if (data.type === "svg" && typeof data.dataUrl === "string") {
				finish(() => resolve({ mode: "image", svg: data.dataUrl ?? "" }));
			} else if (
				data.type === "editable" &&
				typeof data.backgroundSvg === "string" &&
				Array.isArray(data.blocks)
			) {
				finish(() =>
					resolve({
						mode: "editable",
						svg: data.backgroundSvg ?? "",
						blocks: data.blocks ?? [],
					}),
				);
			} else if (data.type === "capture-error") {
				finish(() => reject(new Error(data.message ?? "Slide capture failed.")));
			}
		};

		window.addEventListener("message", onMessage);

		iframe.srcdoc = buildDocument({
			tokensCss: options.tokensCss,
			styles,
			body,
			scripts:
				`<script>${SAFE_LIBRARY_SOURCE}</script>` + `<script>${harness}</script>`,
		});
	}).finally(() => {
		container.remove();
	});
}

export function captureSlideImage(
	html: string,
	tokensCss: string,
	options: CaptureOptions,
): Promise<string> {
	const pixelRatio = options.pixelRatio ?? 2;
	const quality = options.quality ?? 0.86;
	return captureSandboxPayload({
		html,
		tokensCss,
		backgroundColor: options.backgroundColor,
		mode: "image",
	}).then((payload) => {
		if (payload.mode !== "image") {
			throw new Error("Unexpected slide capture response.");
		}
		return rasterizeSvg(payload.svg, pixelRatio, quality, options.backgroundColor);
	});
}

export function captureSlideEditable(
	html: string,
	tokensCss: string,
	options: CaptureOptions,
): Promise<EditableCapture> {
	const pixelRatio = options.pixelRatio ?? 2;
	const quality = options.quality ?? 0.86;
	return captureSandboxPayload({
		html,
		tokensCss,
		backgroundColor: options.backgroundColor,
		mode: "editable",
	}).then(async (payload) => {
		if (payload.mode !== "editable") {
			throw new Error("Unexpected slide capture response.");
		}
		const background = await rasterizeSvg(
			payload.svg,
			pixelRatio,
			quality,
			options.backgroundColor,
		);
		return { background, blocks: payload.blocks };
	});
}
