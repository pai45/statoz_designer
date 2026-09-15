import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { formats, type Project } from "@/domain/project";
import { assetPath, listAssets, root, StudioError } from "./storage";
import type { Media } from "@/features/compositions/composition";

const escaped = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
export async function dataUri(file: string, mime: string) { return `data:${mime};base64,${(await fs.readFile(file)).toString("base64")}`; }
export async function compositionHtml(project: Project, pageIndex = 0): Promise<string> {
  const assets = await listAssets();
  const media: Record<string, Media> = {};
  for (const id of new Set(project.pages.map(p => p.assetId).filter(Boolean))) {
    const asset = assets.find(a => a.id === id);
    if (!asset) throw new StudioError(`Missing asset: ${id}. Replace it in the editor.`);
    if (!asset.mime.startsWith("image/") && !asset.mime.startsWith("video/")) throw new StudioError(`${asset.name} cannot be used as visual media.`);
    if (asset.mime.startsWith("video/") && !["feature", "launch"].includes((await import("@/features/templates/registry")).templateFor(project.templateId).visual)) throw new StudioError("Video clips are supported in feature and launch compositions. Choose an image for this template.");
    if (asset.mime.startsWith("video/") && asset.duration) for (const scene of project.pages.filter(s => s.assetId === id)) {
      if (scene.clipStart >= asset.duration || (scene.clipEnd > 0 && scene.clipEnd > asset.duration + .01)) throw new StudioError(`Clip trim exceeds the ${asset.duration.toFixed(2)}-second source: ${asset.name}.`);
    }
    media[id] = { src: await dataUri(await assetPath(asset), asset.mime), mime: asset.mime, duration: asset.duration };
  }
  const [bundle, tokens, css, logo, onest, orbitron] = await Promise.all([
    build({ entryPoints: [path.join(root, "src/features/compositions/entry.tsx")], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", minify: true, jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, tsconfig: path.join(root, "tsconfig.json") }),
    fs.readFile(path.join(root, "src/design-system/styles/tokens.css"), "utf8"),
    fs.readFile(path.join(root, "src/features/compositions/composition.css"), "utf8"),
    dataUri(path.join(root, "public/assets/brand/logo.png"), "image/png"),
    dataUri(path.join(root, "src/app/fonts/onest-latin-variable.woff2"), "font/woff2"),
    dataUri(path.join(root, "src/app/fonts/orbitron-latin-variable.woff2"), "font/woff2"),
  ]);
  const d = formats[project.format];
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${d.width}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'"><style>html,body{margin:0;padding:0;width:${d.width}px;height:${d.height}px;overflow:hidden} @font-face{font-family:Onest;src:url('${onest}');font-weight:100 900;font-display:block}@font-face{font-family:Orbitron;src:url('${orbitron}');font-weight:400 900;font-display:block}${tokens}${css}</style></head><body><div id="root"></div><script>window.STUDIO=${escaped({ project, media, logo, pageIndex })};</script><script>${bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
}
