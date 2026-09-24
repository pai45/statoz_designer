import type { Asset, AssetCategory } from "./project";

export const assetCategoryLabels: Record<AssetCategory, string> = {
  uploads: "Upload",
  "product-capture": "Product capture",
  "player-portrait": "Player portrait",
  "team-crest": "Team crest",
  "news-photo": "News photo",
  "line-art": "Line art",
  "audio-video": "Audio / video",
  "brand-artwork": "Brand artwork",
};

/**
 * Older schema-version-1 asset records predate library categories. Keep their
 * files untouched and derive the same stable category whenever they are read.
 */
export function assetCategoryOf(asset: Asset): AssetCategory {
  if (asset.category) return asset.category;
  const id = asset.id.toLowerCase(), source = asset.source.toLowerCase(), mime = asset.mime.toLowerCase();
  if (id.startsWith("line-art-") || source.includes("public/assets/games/") && mime === "image/svg+xml") return "line-art";
  if (id.startsWith("pitch-duel-") && source.includes("card roster")) return "player-portrait";
  if (id.startsWith("espn-news-")) return "news-photo";
  if (id.startsWith("espn-") || source.startsWith("espn:")) return "team-crest";
  if (mime.startsWith("audio/") || mime.startsWith("video/")) return "audio-video";
  if (asset.approval === "brand") return "brand-artwork";
  if (source.startsWith("user import:")) return "uploads";
  return "product-capture";
}

export function normalizeAssetCategory(asset: Asset): Asset & { category: AssetCategory } {
  return { ...asset, category: assetCategoryOf(asset) };
}

export function sortAssetsForCategory(assets: Asset[], category: AssetCategory) {
  const alphabetical = ["player-portrait", "team-crest", "line-art", "brand-artwork"].includes(category);
  return [...assets].sort(alphabetical
    ? (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    : (a, b) => b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name));
}
