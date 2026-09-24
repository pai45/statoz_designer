import type { Asset, Format, Project } from "./project";

export const standardFormats: Format[] = ["square", "portrait", "reel", "landscape"];
export const appShowcaseFormats: Format[] = [
  "instagramPortrait",
  "playPhonePortrait",
  "appStoreIphone69",
  "playTabletLandscape",
  "appStoreIpad13",
];
export const tabletShowcaseFormats = new Set<Format>(["playTabletLandscape", "appStoreIpad13"]);
export const opaquePngFormats = new Set<Format>([
  "playPhonePortrait",
  "appStoreIphone69",
  "playTabletLandscape",
  "appStoreIpad13",
  "playFeatureGraphic",
  "appStoreIcon",
]);

export const appCreativePlaceholders = {
  eyebrow: "FEATURE / 01",
  headline: "Feature headline.",
  body: "Add one clear supporting line.",
} as const;

/**
 * Whether an image can fill the phone frame: a portrait still between 16:9 and 21:9
 * (a 393 × 852 capture is ~19.5:9). Assets without recorded dimensions cannot be checked.
 */
export function fitsPhoneCapture(asset?: Asset) {
  if (!asset?.mime.startsWith("image/") || asset.mime === "image/svg+xml" || !asset.width || !asset.height) return false;
  const ratio = asset.height / asset.width;
  return ratio >= 1.7 && ratio <= 2.4;
}

export function isAppCreativeTemplate(templateId: string) {
  return ["app-showcase", "play-feature-graphic", "store-icon"].includes(templateId);
}

export function iconMasterIssues(asset?: Asset) {
  if (!asset) return ["Choose a PNG icon master."];
  const issues: string[] = [];
  if (asset.mime !== "image/png") issues.push("The icon master must be a PNG.");
  if (!asset.width || !asset.height) issues.push("Re-import this asset so its dimensions can be verified.");
  else {
    if (asset.width !== asset.height) issues.push("The icon master must be square.");
    if (asset.width < 1024 || asset.height < 1024) issues.push("The icon master must be at least 1024 × 1024.");
  }
  if (asset.hasAlpha === undefined) issues.push("Re-import this PNG so transparency can be verified.");
  else if (asset.hasAlpha) issues.push("Use an opaque, unmasked square master without transparent corners.");
  return issues;
}

function placeholderIssues(project: Project) {
  return project.pages.flatMap((page, index) => {
    const messages: string[] = [];
    if (!page.headline.trim() || page.headline.trim() === appCreativePlaceholders.headline)
      messages.push(`Page ${index + 1}: replace the headline prompt.`);
    if (!page.body.trim() || page.body.trim() === appCreativePlaceholders.body)
      messages.push(`Page ${index + 1}: replace the supporting-copy prompt.`);
    return messages;
  });
}

export function appCreativeReadiness(project: Project, format: Format, assets: Asset[]) {
  if (!isAppCreativeTemplate(project.templateId)) return [];
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  if (project.templateId === "store-icon") return iconMasterIssues(byId.get(project.pages[0]?.assetId));
  if (project.templateId === "play-feature-graphic") return placeholderIssues(project);

  const tablet = tabletShowcaseFormats.has(format);
  const issues = project.pages.flatMap((page, index) => {
    const assetId = tablet ? page.tabletAssetId : page.assetId;
    const asset = byId.get(assetId);
    if (!assetId) return [`Page ${index + 1}: choose a ${tablet ? "tablet" : "phone"} capture.`];
    if (!asset?.mime.startsWith("image/")) return [`Page ${index + 1}: choose a valid still image.`];
    if (!tablet && !fitsPhoneCapture(asset)) return [`Page ${index + 1}: the phone capture is not phone-shaped.`];
    return [];
  });
  return tablet ? issues : [...issues, ...placeholderIssues(project)];
}
