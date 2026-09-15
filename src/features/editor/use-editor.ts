"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { projectSchema, type Project, type ProjectEnvelope } from "@/domain/project";
import { api, ApiError } from "@/shared/api";

export function useEditor(initial: ProjectEnvelope) {
  const [project, setProject] = useState(initial.project);
  const [etag, setEtag] = useState(initial.etag);
  const [saved, setSaved] = useState(JSON.stringify(initial.project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const latest = useRef(project);
  const etagRef = useRef(etag);
  const savedRef = useRef(saved);
  const savingRef = useRef(false);
  const past = useRef<Project[]>([]), future = useRef<Project[]>([]);
  const dirty = JSON.stringify(project) !== saved;
  const validation = projectSchema.safeParse(project);
  const validationMessage = validation.success ? "" : validation.error.issues.map(i => i.message).join(" ");
  const edit = useCallback((change: (previous: Project) => Project) => {
    const before = latest.current;
    const next = change(structuredClone(before));
    if (JSON.stringify(next) === JSON.stringify(before)) return;
    past.current = [...past.current.slice(-79), structuredClone(before)]; future.current = [];
    latest.current = next; setProject(next); setHistory({ undo: past.current.length, redo: future.current.length });
  }, []);
  const undo = useCallback(() => {
    const previous = past.current.pop(); if (!previous) return;
    future.current.push(latest.current); latest.current = previous; setProject(previous); setHistory({ undo: past.current.length, redo: future.current.length });
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop(); if (!next) return;
    past.current.push(latest.current); latest.current = next; setProject(next); setHistory({ undo: past.current.length, redo: future.current.length });
  }, []);
  const save = useCallback(async () => {
    if (savingRef.current || conflict || !projectSchema.safeParse(latest.current).success) return;
    const captured = latest.current;
    if (JSON.stringify(captured) === savedRef.current) return;
    savingRef.current = true; setSaving(true); setError("");
    try {
      const result = await api<ProjectEnvelope>(`projects/${captured.id}`, { method: "PUT", headers: { "If-Match": etagRef.current }, body: JSON.stringify(captured) });
      etagRef.current = result.etag; setEtag(result.etag);
      savedRef.current = JSON.stringify(result.project); setSaved(savedRef.current);
      if (latest.current === captured) { latest.current = result.project; setProject(result.project); }
      else { const merged = { ...latest.current, revision: result.project.revision, updatedAt: result.project.updatedAt }; latest.current = merged; setProject(merged); }
    } catch (e) { if (e instanceof ApiError && e.status === 409) setConflict(true); setError((e as Error).message); }
    finally { savingRef.current = false; setSaving(false); }
  }, [conflict]);
  useEffect(() => {
    if (!dirty || conflict || validationMessage || saving) return;
    const timer = setTimeout(() => { void save(); }, 850);
    return () => clearTimeout(timer);
  }, [project, dirty, conflict, validationMessage, saving, save]);
  const reload = useCallback(async () => {
    try {
      const value = await api<ProjectEnvelope>(`projects/${initial.project.id}`);
      latest.current = value.project; etagRef.current = value.etag; savedRef.current = JSON.stringify(value.project);
      setProject(value.project); setEtag(value.etag); setSaved(savedRef.current); setConflict(false); setError(""); past.current = []; future.current = []; setHistory({ undo: 0, redo: 0 });
    } catch (e) { setError((e as Error).message); }
  }, [initial.project.id]);
  useEffect(() => {
    const timer = setInterval(async () => {
      if (savingRef.current) return;
      try {
        const current = await api<ProjectEnvelope>(`projects/${initial.project.id}`);
        if (savingRef.current || current.etag === etagRef.current) return;
        if (JSON.stringify(latest.current) !== savedRef.current) { setConflict(true); setError("This project changed outside the editor. Reload it or save your edits as a copy."); }
        else {
          latest.current = current.project; etagRef.current = current.etag; savedRef.current = JSON.stringify(current.project);
          setProject(current.project); setEtag(current.etag); setSaved(savedRef.current); setError("");
        }
      } catch (e) { setError((e as Error).message); }
    }, 3500);
    return () => clearInterval(timer);
  }, [initial.project.id]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  return { project, etag, edit, dirty, saving, save, error, conflict, reload, undo, redo, canUndo: history.undo > 0, canRedo: history.redo > 0, validationMessage };
}
