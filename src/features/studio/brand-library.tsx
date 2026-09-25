import { sortAssetsForCategory } from "@/domain/asset-library";
import type { Asset } from "@/domain/project";
import { FilterChips, Tag } from "@/design-system/components/ui";
import { AssetGrid } from "./asset-library";
import { ActionsSection, ComponentsSection } from "./brand-actions-section";
import { ColorsSection, DoDontSection, LayoutSection, OverviewPrinciples, ShapeSection, TypographySection, UseCasesSection } from "./brand-guide-sections";
import { publicAsset } from "@/shared/api";
import "./brand-library.css";

export const brandTabs = ["Overview", "Brand assets", "Colors", "Typography", "Shape & surface", "Actions", "Components", "Layout & motion", "Use cases", "Do & don't"] as const;
export type BrandTab = typeof brandTabs[number];

export function BrandLibrary({ assets, search, selected, onSelect, resourceUrl, readOnlyDemo = false }: { assets: Asset[]; search: string; selected: BrandTab; onSelect: (tab: BrandTab) => void; resourceUrl?: (asset: Asset) => string; readOnlyDemo?: boolean }) {
  const query = search.trim().toLowerCase();
  const brandAssets = sortAssetsForCategory(assets.filter(asset => asset.approval === "brand" && (!query || `${asset.name} ${asset.source}`.toLowerCase().includes(query))), "brand-artwork");
  return <section className="library-section" aria-label="Brand library">
    <div className="asset-toolbar"><FilterChips label="Brand reference" options={[...brandTabs]} selected={selected} onSelect={value => onSelect(value as BrandTab)}/></div>
    {selected === "Overview" && <div className="brand-system"><section className="brand-showcase"><div className="brand-large-logo"><img src={publicAsset("/assets/brand/logo.png")} alt="StatOz brand mark"/><span>StatOz<span>.</span></span></div><div><div className="section-caption">THE VISUAL SIGNATURE</div><h2>Competitive energy.<br/>Deliberate restraint.</h2><p>Dark navy. Clear hierarchy. A flash of cyan. Outlined cut-corner panels, purposeful motion, and the unmistakable StatOz mark.</p><Tag>BRAND SNAPSHOT · 15 SEP 2026</Tag></div></section><OverviewPrinciples/><p className="muted-note">{readOnlyDemo ? "This public guide is view-only. Connect the local companion for the downloadable design kit." : "The same guide drives the statoz-design-system assistant skill. Download tokens, fonts and the logo from Assets › Design kit."}</p></div>}
    {selected === "Brand assets" && <AssetGrid assets={brandAssets} resourceUrl={resourceUrl} empty={query ? `No brand assets match “${search.trim()}”.` : "Registered StatOz brand artwork will appear here."}/>}
    {selected === "Colors" && <ColorsSection/>}
    {selected === "Typography" && <TypographySection/>}
    {selected === "Shape & surface" && <ShapeSection/>}
    {selected === "Actions" && <ActionsSection/>}
    {selected === "Components" && <ComponentsSection/>}
    {selected === "Layout & motion" && <LayoutSection/>}
    {selected === "Use cases" && <UseCasesSection/>}
    {selected === "Do & don't" && <DoDontSection/>}
  </section>;
}
