"use client";
import { useEffect, useRef, useState } from "react";
import { formats, type Asset, type Project } from "@/domain/project";
import { Composition } from "@/features/compositions/composition";

export function Thumbnail({ project, assets, pageIndex = 0, className = "" }: { project: Project; assets: Asset[]; pageIndex?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 300, height: 280 });
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); if (box.current) observer.observe(box.current); return () => observer.disconnect(); }, []);
  const d = formats[project.format], scale = Math.min(size.width / d.width, size.height / d.height);
  const media = Object.fromEntries(assets.map(a => [a.id, { src: `/api/assets/${a.id}`, mime: a.mime }]));
  return <div ref={box} className={`thumbnail ${className}`}><div style={{ width: d.width * scale, height: d.height * scale }}><div style={{ width: d.width, height: d.height, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: "none" }}><Composition project={project} media={media} pageIndex={pageIndex}/></div></div></div>;
}

export function Preview({ project, time, pageIndex, guides, zoom, onOverflow }: { project: Project; time: number; pageIndex: number; guides: boolean; zoom: number; onOverflow: (messages: string[]) => void }) {
  const frame = useRef<HTMLIFrameElement>(null), holder = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState({ width: 600, height: 700 });
  const live = useRef({ project, time, pageIndex, guides });
  const overflowRef = useRef(onOverflow);
  useEffect(() => { live.current = { project, time, pageIndex, guides }; overflowRef.current = onOverflow; }, [project, time, pageIndex, guides, onOverflow]);
  const mediaKey = project.pages.map(s => `${s.assetId}:${s.tabletAssetId}`).join("|");
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (holder.current) observer.observe(holder.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: live.current.project, pageIndex: live.current.pageIndex }), signal: abort.signal });
        if (!response.ok) throw new Error((await response.json()).error);
        setHtml(await response.text());
      } catch (e) { if (!abort.signal.aborted) { setError((e as Error).message); setLoading(false); } }
    }
    void load(); return () => abort.abort();
  }, [project.id, project.templateId, mediaKey]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data.type === "studio:ready") { setLoading(false); frame.current?.contentWindow?.postMessage({ type: "studio:frame", ...live.current }, "*"); }
      if (event.data.type === "studio:error") { setError(event.data.message); setLoading(false); }
      if (event.data.overflow) overflowRef.current(event.data.overflow);
    };
    window.addEventListener("message", listener); return () => window.removeEventListener("message", listener);
  }, []);
  useEffect(() => { frame.current?.contentWindow?.postMessage({ type: "studio:frame", project, time, pageIndex, guides }, "*"); }, [project, time, pageIndex, guides, html]);
  const d = formats[project.format], scale = Math.max(.05, Math.min((size.width - 60) / d.width, (size.height - 60) / d.height)) * zoom;
  return <div className="preview-holder" ref={holder}>{loading && <div className="preview-status">Preparing your composition…</div>}{error && <div className="preview-error" role="alert">{error}</div>}<div className="preview-paper" style={{ width: d.width * scale, height: d.height * scale }}><iframe ref={frame} title="Design preview" sandbox="allow-scripts" srcDoc={html || undefined} style={{ width: d.width, height: d.height, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}/></div></div>;
}
