import { jsonrepair } from "jsonrepair";
import type { ZodError, ZodType } from "zod";

export class JsonValidationError extends Error {
	readonly code = "invalid_json";

	constructor(message = "The model did not return valid JSON") {
		super(message);
		this.name = "JsonValidationError";
	}
}

export function extractJson(text: string): string {
	let cleaned = text.trim();

	const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fence?.[1]) {
		cleaned = fence[1].trim();
	}

	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start !== -1 && end > start) {
		cleaned = cleaned.slice(start, end + 1);
	}

	return cleaned;
}

export function parseJsonLoose(text: string): unknown {
	const extracted = extractJson(text);
	try {
		return JSON.parse(extracted);
	} catch {
		return JSON.parse(jsonrepair(extracted));
	}
}

function formatIssues(error: ZodError): string {
	return error.issues
		.slice(0, 5)
		.map((issue) => {
			const path = issue.path.join(".");
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join("; ");
}

export function parseWithSchema<T>(schema: ZodType<T>, text: string): T {
	let raw: unknown;
	try {
		raw = parseJsonLoose(text);
	} catch {
		throw new JsonValidationError(
			"The model did not return valid JSON. Try regenerating or use a different model.",
		);
	}

	const result = schema.safeParse(raw);
	if (!result.success) {
		throw new JsonValidationError(
			`The model returned JSON that did not match the expected shape (${formatIssues(result.error)}).`,
		);
	}

	return result.data;
}
