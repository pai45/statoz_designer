import { z } from "zod";
import type { JobStatus } from "./project";

/**
 * Assistant runs drive a locally installed Claude Code or Codex CLI. Each provider
 * signs in on its own, so the studio stores no API key and works without either
 * installed — the feature simply reports itself unavailable.
 */
export const providers = {
  claude: {
    label: "Claude",
    binary: "claude",
    env: "CLAUDE_CLI_PATH",
    summary: "Claude Code. Installed with the VS Code extension or the standalone CLI.",
  },
  codex: {
    label: "Codex",
    binary: "codex",
    env: "CODEX_CLI_PATH",
    summary: "OpenAI Codex CLI. Installed with npm i -g @openai/codex.",
  },
} as const;
export type Provider = keyof typeof providers;
export const providerIds = Object.keys(providers) as Provider[];
export const codexModelOptions = [
  { id: "", label: "CLI default" },
  { id: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { id: "gpt-6-astra", label: "GPT-6 Astra" },
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
] as const;

/** Runs share the render job lifecycle so the studio has one status vocabulary. */
export type RunStatus = JobStatus;
/** Statuses a run can still move on from. */
export const activeRunStatuses: readonly RunStatus[] = ["queued", "running"];
export const retryableRunStatuses: readonly RunStatus[] = ["failed", "cancelled", "interrupted"];

export type AgentRun = {
  schemaVersion: 1; id: string; provider: Provider; prompt: string;
  /** Creative is the legacy/default path; investor runs use structured review records. */
  workflow?: "creative" | "investor-review" | "investor-revision";
  reviewId?: string;
  /** Explicit provider model. Empty/omitted means the CLI chooses its default. */
  model?: string;
  projectId: string; projectName: string; mode: "create" | "revise";
  /** The scene/page the editor had selected when this revision was requested. */
  focusPageId?: string;
  status: RunStatus; createdAt: string; updatedAt: string; startedAt?: string; finishedAt?: string;
  /** Assistant's closing message, trimmed for the history list. */
  summary?: string;
  error?: string; turns?: number;
  /** Project files the run rewrote, and anything it touched that it should not have. */
  changedFiles?: string[]; outsideScope?: string[];
};

export type AgentStatus = { running: boolean; pid?: number; activeRunId?: string; providers: Record<Provider, { ready: boolean; detail: string }> };

/** One normalised line of a run transcript, whichever CLI produced it. */
export type RunEvent = { at: string; kind: "note" | "tool" | "message" | "error"; text: string };

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const modelId = z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/, "Choose a valid model identifier.");
const formatEnum = z.enum(["square", "portrait", "reel", "landscape"]);
const sportEnum = z.enum(["football", "cricket", "basketball", "tennis", "motorsport"]);

/**
 * Either revise an existing project (`projectId`) or create one, in which case the
 * studio builds the shell from the template registry before the assistant starts.
 */
export const agentRequestSchema = z.object({
  provider: z.enum(["claude", "codex"]),
  prompt: z.string().trim().min(1, "Describe what you want the assistant to make.").max(4000),
  model: modelId.optional(),
  projectId: id.optional(),
  focusPageId: id.optional(),
  templateId: id.optional(),
  format: formatEnum.optional(),
  sport: sportEnum.optional(),
  duration: z.number().min(8).max(60).optional(),
}).superRefine((request, ctx) => {
  if (request.provider !== "codex" && request.model) ctx.addIssue({ code: "custom", message: "Model selection is currently available for Codex runs.", path: ["model"] });
  if (request.projectId) return;
  if (request.focusPageId) ctx.addIssue({ code: "custom", message: "A focused scene can only be revised inside an existing project.", path: ["focusPageId"] });
  if (!request.templateId) ctx.addIssue({ code: "custom", message: "Choose a template, or pick a project to revise.", path: ["templateId"] });
  if (!request.format) ctx.addIssue({ code: "custom", message: "Choose an output format.", path: ["format"] });
});

export const agentSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  /** Hard ceiling on assistant turns, so a confused run cannot spend without bound. */
  maxTurns: z.number().int().min(1).max(60),
  timeoutMinutes: z.number().int().min(1).max(60),
  claudeModel: z.string().max(60),
  codexModel: z.string().max(60),
});
export type AgentSettings = z.infer<typeof agentSettingsSchema>;
export const defaultAgentSettings = (): AgentSettings => ({ schemaVersion: 1, maxTurns: 24, timeoutMinutes: 15, claudeModel: "", codexModel: "" });

export const runStatusNote: Record<RunStatus, string> = {
  queued: "Waiting for the assistant.",
  running: "Working on your project.",
  completed: "Finished. Open the project to review it.",
  failed: "Did not finish. The project was left as it was.",
  cancelled: "Stopped from the studio.",
  interrupted: "The studio restarted before this run finished.",
};
