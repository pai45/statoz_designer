import fs from "node:fs/promises";
import path from "node:path";
import { loadDesignSources, renderDesignGuideMarkdown, tokensCssPath } from "./design-guide";
import type { BrandKitItem } from "@/domain/brand-guide";
import { resolveToken } from "@/design-system/tokens/parse-css";

/**
 * The downloadable design kit on Assets › Design kit: the files someone needs to
 * work in the StatOz style outside the studio. Only these ids are served, and
 * every one is read from a fixed repository path or generated from the tokens.
 */

type Source = { file: string } | { generate: () => Promise<string> };
type Entry = Omit<BrandKitItem, "bytes"> & { mime: string; source: Source };

const root = process.cwd();
const entries: Entry[] = [
  { id: "design-guide", name: "StatOz design guide", fileName: "statoz-design-guide.md", format: "Markdown", mime: "text/markdown; charset=utf-8", description: "Foundations, use-case recipes and do/don't in one document. Generated from the live tokens.", source: { generate: async () => renderDesignGuideMarkdown(await loadDesignSources()) } },
  { id: "tokens-css", name: "Design tokens · CSS", fileName: "statoz-tokens.css", format: "CSS", mime: "text/css; charset=utf-8", description: "Every --ds-* custom property: colour, type, shape, spacing and clip-paths. Drop into any web page.", source: { file: tokensCssPath } },
  { id: "tokens-json", name: "Design tokens · JSON", fileName: "statoz-tokens.json", format: "JSON", mime: "application/json; charset=utf-8", description: "The same tokens, resolved to values, for Figma variables, slides or other tools.", source: { generate: async () => `${JSON.stringify(tokensJson((await loadDesignSources()).tokens), null, 2)}\n` } },
  { id: "font-orbitron", name: "Orbitron variable", fileName: "orbitron-latin-variable.woff2", format: "WOFF2", mime: "font/woff2", description: "Display face: headlines, numbers and brand identity.", source: { file: path.join(root, "src/app/fonts/orbitron-latin-variable.woff2") } },
  { id: "font-onest", name: "Onest variable", fileName: "onest-latin-variable.woff2", format: "WOFF2", mime: "font/woff2", description: "Body face: supporting copy and controls.", source: { file: path.join(root, "src/app/fonts/onest-latin-variable.woff2") } },
  { id: "logo", name: "StatOz mark", fileName: "statoz-logo.png", format: "PNG", mime: "image/png", description: "The brand mark. Keep its proportions; never recolour or redraw it.", source: { file: path.join(root, "public/assets/brand/logo.png") } },
  { id: "brand-guide", name: "Brand guide", fileName: "statoz-brand-guide.md", format: "Markdown", mime: "text/markdown; charset=utf-8", description: "The written brand rules: identity, geometry, social composition and claims.", source: { file: path.join(root, "docs/brand-guide.md") } },
];

/** Tokens as `{ "--ds-name": value }` with references resolved, so they work outside CSS. */
export function tokensJson(tokens: Record<string, string>) {
  return { name: "StatOz design tokens", source: "src/design-system/styles/tokens.css", tokens: Object.fromEntries(Object.keys(tokens).map(name => [name, resolveToken(tokens, name)])) };
}

async function read(entry: Entry): Promise<Buffer> {
  return "file" in entry.source ? fs.readFile(entry.source.file) : Buffer.from(await entry.source.generate());
}

export async function listBrandKit(): Promise<BrandKitItem[]> {
  return Promise.all(entries.map(async entry => ({
    id: entry.id, name: entry.name, fileName: entry.fileName, format: entry.format, description: entry.description,
    bytes: "file" in entry.source ? (await fs.stat(entry.source.file)).size : (await read(entry)).length,
  })));
}

/** The file for a kit id, or undefined for anything that is not in the kit. */
export async function readBrandKitFile(id: string): Promise<{ data: Buffer; mime: string; fileName: string } | undefined> {
  const entry = entries.find(item => item.id === id);
  return entry && { data: await read(entry), mime: entry.mime, fileName: entry.fileName };
}
