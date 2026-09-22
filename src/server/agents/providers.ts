import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { providers, type AgentSettings, type Provider, type RunEvent } from "@/domain/agent";

/** A run could not start or finish for a reason worth showing the person as prose. */
export class AgentError extends Error {}

const now = () => new Date().toISOString();
const event = (kind: RunEvent["kind"], text: string): RunEvent => ({ at: now(), kind, text: text.slice(0, 2000) });

const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`;
/**
 * npm installs its CLIs as `.cmd` shims on Windows, and Node refuses to execute those
 * directly. Build the command line ourselves and let the shell run it. Safe because
 * every argument here is a fixed flag or a path — the prompt travels on stdin.
 */
export function launch(binary: string, args: string[]): { file: string; args: string[]; shell: boolean } {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(binary)) return { file: [binary, ...args].map(quote).join(" "), args: [], shell: true };
  return { file: binary, args, shell: false };
}

function usable(candidate: string) {
  try {
    const plan = launch(candidate, ["--version"]);
    if (plan.shell) execSync(plan.file, { stdio: "pipe", windowsHide: true, timeout: 20000 });
    else execFileSync(plan.file, plan.args, { stdio: "pipe", windowsHide: true, timeout: 20000 });
    return true;
  } catch { return false; }
}

/**
 * Claude Code ships inside the VS Code extension at a version-stamped path, so the
 * folder name changes on every update. Match the family and take the newest.
 */
function claudeFromVsCode() {
  const roots = [path.join(os.homedir(), ".vscode", "extensions"), path.join(os.homedir(), ".vscode-insiders", "extensions")];
  const found: { version: number[]; file: string }[] = [];
  for (const root of roots) {
    let entries: string[] = [];
    try { entries = fs.readdirSync(root); } catch { continue; }
    for (const entry of entries) {
      if (!entry.startsWith("anthropic.claude-code-")) continue;
      const file = path.join(root, entry, "resources", "native-binary", process.platform === "win32" ? "claude.exe" : "claude");
      if (!fs.existsSync(file)) continue;
      const digits = entry.slice("anthropic.claude-code-".length).split("-")[0].split(".").map(Number);
      found.push({ version: digits.map(n => (Number.isFinite(n) ? n : 0)), file });
    }
  }
  found.sort((a, b) => { for (let i = 0; i < 3; i++) if ((b.version[i] ?? 0) !== (a.version[i] ?? 0)) return (b.version[i] ?? 0) - (a.version[i] ?? 0); return 0; });
  return found[0]?.file;
}

/**
 * The Codex VS Code extension ships a native CLI that is kept in step with the
 * extension's model-cache format. Prefer it to an older npm shim on PATH: an old
 * CLI can fail during startup while reading a cache written by the newer one.
 */
export function codexFromVsCode(roots = [path.join(os.homedir(), ".vscode", "extensions"), path.join(os.homedir(), ".vscode-insiders", "extensions")]) {
  if (process.platform !== "win32") return undefined;
  const target = process.arch === "arm64" ? "windows-aarch64" : "windows-x86_64";
  const found: { version: number[]; file: string }[] = [];
  for (const root of roots) {
    let entries: string[] = [];
    try { entries = fs.readdirSync(root); } catch { continue; }
    for (const entry of entries) {
      if (!entry.startsWith("openai.chatgpt-")) continue;
      const file = path.join(root, entry, "bin", target, "codex.exe");
      if (!fs.existsSync(file)) continue;
      const digits = entry.slice("openai.chatgpt-".length).split("-")[0].split(".").map(Number);
      found.push({ version: digits.map(n => (Number.isFinite(n) ? n : 0)), file });
    }
  }
  found.sort((a, b) => { for (let i = 0; i < Math.max(a.version.length, b.version.length); i++) if ((b.version[i] ?? 0) !== (a.version[i] ?? 0)) return (b.version[i] ?? 0) - (a.version[i] ?? 0); return 0; });
  return found[0]?.file;
}

/** Env override, then the name on PATH, then known install locations. */
export function resolveProvider(provider: Provider): string {
  const { env, binary, label } = providers[provider];
  const override = process.env[env];
  if (override) {
    if (!usable(override)) throw new AgentError(`${env} is set to ${override}, but it did not run. Clear it or point it at the ${label} CLI.`);
    return override;
  }
  if (provider === "codex") {
    const bundled = codexFromVsCode();
    if (bundled && usable(bundled)) return bundled;
  }
  const onPath = process.platform === "win32" ? [`${binary}.cmd`, `${binary}.exe`, binary] : [binary];
  for (const candidate of onPath) if (usable(candidate)) return candidate;
  if (provider === "claude") { const bundled = claudeFromVsCode(); if (bundled && usable(bundled)) return bundled; }
  throw new AgentError(`${label} was not found. ${providers[provider].summary} Set ${env} if it is installed somewhere unusual.`);
}

export function providerReady(provider: Provider) {
  try { return { ready: true, detail: resolveProvider(provider) }; }
  catch (error) { return { ready: false, detail: (error as Error).message }; }
}

export type CodexResultFiles = { schema: string; result: string };
export type SpawnPlan = { args: string[]; parse: (line: string) => RunEvent | null; final: (events: RunEvent[]) => string };

/**
 * Both CLIs run non-interactively with file access scoped to the studio folder.
 * Claude has no shell tool; Codex uses a structured-result contract and is told not
 * to call tools. Never add a bypass flag here.
 */
export function planFor(provider: Provider, workdir: string, settings: AgentSettings, model?: string, resultFiles?: CodexResultFiles, options: { readOnly?: boolean } = {}): SpawnPlan {
  if (provider === "claude") {
    return {
      args: [
        "-p",
        "--output-format", "stream-json", "--verbose",
        "--permission-mode", "acceptEdits",
        "--allowedTools", ...(options.readOnly ? ["Read", "Glob", "Grep"] : ["Read", "Edit", "Write", "Glob", "Grep"]),
        "--add-dir", workdir,
        "--max-turns", String(settings.maxTurns),
        ...(settings.claudeModel ? ["--model", settings.claudeModel] : []),
      ],
      parse: line => {
        const message = JSON.parse(line) as { type?: string; subtype?: string; result?: string; is_error?: boolean; message?: { content?: { type?: string; text?: string; name?: string }[] } };
        if (message.type === "assistant") {
          const parts = message.message?.content ?? [];
          const text = parts.filter(p => p.type === "text" && p.text?.trim()).map(p => p.text!.trim()).join(" ");
          const tools = parts.filter(p => p.type === "tool_use" && p.name).map(p => p.name!);
          if (tools.length) return event("tool", tools.join(", "));
          if (text) return event("message", text);
          return null;
        }
        if (message.type === "result") return event(message.is_error ? "error" : "note", message.result || message.subtype || "Run finished.");
        if (message.type === "system") return event("note", message.subtype === "init" ? "Session started." : String(message.subtype ?? "system"));
        return null;
      },
      final: events => [...events].reverse().find(e => e.kind === "message" || e.kind === "note")?.text ?? "",
    };
  }
  return {
    args: [
      "exec",
      // Studio runs must not depend on personal config or a model cache written by
      // another Codex version. Authentication still comes from CODEX_HOME.
      "--ignore-user-config",
      "--ephemeral",
      "--json",
      "--sandbox", options.readOnly ? "read-only" : "workspace-write",
      "-C", workdir,
      "--skip-git-repo-check",
      ...(resultFiles ? ["--output-schema", resultFiles.schema, "--output-last-message", resultFiles.result] : []),
      ...(model || settings.codexModel ? ["--model", model || settings.codexModel] : []),
    ],
    parse: line => {
      type CodexBody = { type?: string; message?: string; text?: string; command?: string | string[] };
      type CodexEvent = { type?: string; message?: string; error?: { message?: string }; msg?: CodexBody; item?: CodexBody };
      const message = JSON.parse(line) as CodexEvent;
      const body: CodexBody = message.item ?? message.msg ?? { type: message.type, message: message.message };
      const kind = String(body.type ?? "");
      const text = body.message || body.text;
      if (kind.includes("agent_message") && text) return event("message", text);
      if ((kind.includes("agent_reasoning") || kind === "reasoning") && text) return event("note", text);
      if ((kind.includes("exec_command") || kind === "command_execution") && body.command && message.type !== "item.started") {
        return event("tool", Array.isArray(body.command) ? body.command.join(" ") : body.command);
      }
      if ((kind.includes("patch") || kind.includes("apply") || kind === "file_change") && message.type !== "item.started") return event("tool", "Updated project files.");
      if (message.type === "thread.started") return event("note", "Session started.");
      if (message.type === "turn.failed") return event("error", message.error?.message || "Codex run failed.");
      if (message.type === "error" || kind.includes("error")) return event("error", message.message || text || kind);
      return null;
    },
    final: events => [...events].reverse().find(e => e.kind === "message")?.text ?? "",
  };
}
