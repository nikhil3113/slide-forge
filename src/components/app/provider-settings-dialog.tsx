import { useState } from "react";
import { KeyRoundIcon, Settings2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	PROVIDER_PRESETS,
	getProviderPreset,
	type ProviderSettings,
} from "@/lib/providers";
import type { ProviderId } from "@/types/deck";

interface ProviderSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: ProviderSettings;
	onChange: (settings: ProviderSettings) => void;
}

export function ProviderSettingsDialog({
	open,
	onOpenChange,
	settings,
	onChange,
}: ProviderSettingsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(value) => onOpenChange(value)}>
			<DialogContent>
				<ProviderSettingsForm
					key={open ? "open" : "closed"}
					settings={settings}
					onSave={(next) => {
						onChange(next);
						onOpenChange(false);
					}}
					onCancel={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

interface ProviderSettingsFormProps {
	settings: ProviderSettings;
	onSave: (settings: ProviderSettings) => void;
	onCancel: () => void;
}

function ProviderSettingsForm({
	settings,
	onSave,
	onCancel,
}: ProviderSettingsFormProps) {
	const [draft, setDraft] = useState<ProviderSettings>(settings);

	const preset = getProviderPreset(draft.providerId);
	const apiKey = draft.keys[draft.providerId] ?? "";
	const model = draft.models[draft.providerId] ?? preset.defaultModel;
	const canSave =
		apiKey.trim().length > 0 &&
		model.trim().length > 0 &&
		(!preset.requiresBaseUrl || draft.baseUrl.trim().length > 0);

	const setKey = (value: string) => {
		setDraft((current) => ({
			...current,
			keys: { ...current.keys, [current.providerId]: value },
		}));
	};

	const setModel = (value: string) => {
		setDraft((current) => ({
			...current,
			models: { ...current.models, [current.providerId]: value },
		}));
	};

	const save = () => {
		onSave({
			...draft,
			keys: { ...draft.keys, [draft.providerId]: apiKey.trim() },
			models: { ...draft.models, [draft.providerId]: model.trim() },
		});
	};

	return (
		<>
			<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings2Icon className="size-4 text-muted-foreground" />
						Provider settings
					</DialogTitle>
					<DialogDescription>
						Your key is stored in this browser session only and is sent
						per-request through the local proxy. It is never logged or saved
						server-side.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-5">
					<div className="grid gap-2">
						<Label>Provider</Label>
						<Select
							value={draft.providerId}
							onValueChange={(value) =>
								setDraft((current) => ({
									...current,
									providerId: value as ProviderId,
								}))
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PROVIDER_PRESETS.map((item) => (
									<SelectItem key={item.id} value={item.id}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{preset.note ? (
							<p className="text-xs text-muted-foreground">{preset.note}</p>
						) : null}
					</div>

					{preset.requiresBaseUrl ? (
						<div className="grid gap-2">
							<Label htmlFor="provider-base-url">Base URL</Label>
							<Input
								id="provider-base-url"
								placeholder="https://api.example.com/v1"
								value={draft.baseUrl}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										baseUrl: event.target.value,
									}))
								}
							/>
						</div>
					) : null}

					<div className="grid gap-2">
						<Label htmlFor="provider-model">Model</Label>
						<Input
							id="provider-model"
							placeholder={preset.defaultModel || "model-id"}
							value={model}
							onChange={(event) => setModel(event.target.value)}
						/>
						{preset.models.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{preset.models.map((suggestion) => (
									<button
										key={suggestion}
										type="button"
										onClick={() => setModel(suggestion)}
									>
										<Badge
											variant={
												suggestion === model ? "default" : "outline"
											}
										>
											{suggestion}
										</Badge>
									</button>
								))}
							</div>
						) : null}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="provider-key" className="flex items-center gap-1.5">
							<KeyRoundIcon className="size-3.5" />
							API key
						</Label>
						<Input
							id="provider-key"
							type="password"
							autoComplete="off"
							placeholder={preset.keyPlaceholder}
							value={apiKey}
							onChange={(event) => setKey(event.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
					<Button onClick={save} disabled={!canSave}>
						Save settings
					</Button>
				</DialogFooter>
		</>
	);
}
