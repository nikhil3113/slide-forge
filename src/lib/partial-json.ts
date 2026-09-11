import { jsonrepair } from "jsonrepair";

export function tryParsePartial(text: string): Record<string, unknown> | undefined {
	const start = text.indexOf("{");
	if (start === -1) return undefined;

	const candidate = text.slice(start);
	try {
		return JSON.parse(candidate) as Record<string, unknown>;
	} catch {
		// fall through to repair
	}

	try {
		return JSON.parse(jsonrepair(candidate)) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}
