import { useEffect, useRef, useState } from "react";
import type { RenderJob } from "@/domain/project";
import { openStatuses, platformIds, platforms, tabStatuses, type Platform, type PublisherStatus, type PublishOptions, type PublishRecord, type PublishSettings } from "@/domain/publish";
import { Button, Icon, InputField } from "@/design-system/components/ui";
import { api } from "@/shared/api";
import "./publish.css";

const statusText: Record<PublishRecord["status"], string> = { queued: "Waiting for the posting window", opening: "Opening…", "needs-login": "Sign in needed", ready: "Ready. Finish in the posting window", posted: "Posted", closed: "Closed", failed: "Needs attention" };

export function PostDialog({ job, publisher, notify, onClose, onQueued }: { job: RenderJob; publisher: PublisherStatus | null; notify: (message: string) => void; onClose: () => void; onQueued: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<PublishOptions | null>(null), [selected, setSelected] = useState<Platform[]>([]);
  const [caption, setCaption] = useState(""), [title, setTitle] = useState(""), [sending, setSending] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    void api<PublishOptions>(`publish-options/${job.id}`).then(value => { setOptions(value); setCaption(value.caption); setTitle(value.title); }).catch(e => { notify((e as Error).message); onClose(); });
  }, [job.id, notify, onClose]);
  const overLimit = selected.filter(p => caption.length > platforms[p].captionLimit);
  const canSend = !!options && selected.length > 0 && !overLimit.length && !(selected.includes("youtube") && !title.trim()) && !sending;
  async function send() {
    setSending(true); const queued: string[] = [];
    try {
      for (const platform of selected) {
        await api("publish", { method: "POST", body: JSON.stringify({ jobId: job.id, platform, caption, ...(platform === "youtube" ? { title } : {}) }) });
        queued.push(platforms[platform].label);
      }
      notify(`${queued.join(", ")} will open in the posting window. Review each post and click Post there.`); onQueued(); onClose();
    } catch (e) { notify(`${queued.length ? `${queued.join(", ")} queued. ` : ""}${(e as Error).message}`); onQueued(); }
    finally { setSending(false); }
  }
  return <dialog ref={dialog} className="modal post-modal" onCancel={onClose}>
    <div className="modal-heading"><div><span className="section-caption">POST TO SOCIAL</span><h2>{job.projectName}</h2></div><Button variant="ghost" aria-label="Close post dialog" onClick={onClose}><Icon name="close"/></Button></div>
    <p className="muted-note">The posting window attaches this export and fills in your caption. You review each post and click Post on the site.</p>
    {publisher && !publisher.running && <p className="export-error">The posting window is not running. Restart the studio with npm run dev.</p>}
    {!options ? <p className="muted-note">Checking this export…</p> : <>
      <fieldset className="platform-picker"><legend>Post to</legend>{platformIds.map(p => { const check = options.platforms[p]; return <label key={p} className={check.ok ? "" : "disabled"}>
        <input type="checkbox" disabled={!check.ok} checked={selected.includes(p)} onChange={e => setSelected(previous => e.target.checked ? [...previous, p] : previous.filter(value => value !== p))}/>
        <span><strong>{platforms[p].label}</strong><small>{check.ok ? check.warnings.join(" ") || platforms[p].summary : check.reason}</small></span>
      </label>; })}</fieldset>
      {selected.includes("youtube") && <label className="field"><span>YouTube title</span><input maxLength={100} value={title} onChange={e => setTitle(e.target.value)}/><small>{title.length}/100</small></label>}
      <label className="field"><span>Caption</span><textarea rows={6} value={caption} onChange={e => setCaption(e.target.value)}/>
        <small>{selected.length ? selected.map(p => <span key={p} className={caption.length > platforms[p].captionLimit ? "over-limit" : ""}>{platforms[p].label} {caption.length}/{platforms[p].captionLimit} </span>) : "Choose at least one platform."}</small></label>
      {overLimit.length > 0 && <p className="export-error">Shorten the caption for {overLimit.map(p => platforms[p].label).join(" and ")}.</p>}
    </>}
    <div className="modal-footer"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!canSend} onClick={() => void send()}>{sending ? "Opening…" : "Open in posting window"}<Icon name="arrow" size={17}/></Button></div>
  </dialog>;
}

export function PublishStatus({ records, notify, onChange }: { records: PublishRecord[]; notify: (message: string) => void; onChange: () => void }) {
  const latest = platformIds.map(p => records.filter(r => r.platform === p).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]).filter(Boolean);
  if (!latest.length) return null;
  async function act(record: PublishRecord, action: "retry" | "close" | "posted") {
    let body = {};
    if (action === "posted") {
      const link = window.prompt(`Paste the link to the ${platforms[record.platform].label} post (optional).`);
      if (link === null) return;
      if (link.trim()) body = { postUrl: link.trim() };
    }
    try { await api(`publish/${record.id}/${action}`, { method: "POST", body: JSON.stringify(body) }); onChange(); }
    catch (e) { notify((e as Error).message); }
  }
  return <ul className="publish-status" aria-label="Social posts">{latest.map(r => <li key={r.id} className={`publish-${r.status}`}>
    <span className="publish-chip"><i/>{platforms[r.platform].label} · {statusText[r.status]}</span>
    <span className="publish-actions">
      {r.status === "posted" && r.postUrl && <a href={r.postUrl} target="_blank" rel="noreferrer">View post</a>}
      {["ready", "failed", "closed"].includes(r.status) && <button onClick={() => void act(r, "posted")}>Mark posted</button>}
      {["failed", "closed"].includes(r.status) && <button onClick={() => void act(r, "retry")}>Open again</button>}
      {openStatuses.includes(r.status) && <button onClick={() => void act(r, "close")}>Close tab</button>}
    </span>
    {r.message && ["opening", "needs-login", "failed"].includes(r.status) && <small>{r.message}</small>}
  </li>)}</ul>;
}

export function SocialAccounts({ publisher, records, notify }: { publisher: PublisherStatus | null; records: PublishRecord[]; notify: (message: string) => void }) {
  const [settings, setSettings] = useState<PublishSettings | null>(null), [saving, setSaving] = useState(false);
  useEffect(() => { void api<PublishSettings>("publish-settings").then(setSettings).catch(e => notify((e as Error).message)); }, [notify]);
  const busy = records.some(r => tabStatuses.includes(r.status));
  async function save() {
    if (!settings) return; setSaving(true);
    try { setSettings(await api<PublishSettings>("publish-settings", { method: "PUT", body: JSON.stringify(settings) })); notify("Posting settings saved. A browser change applies the next time the posting window opens."); }
    catch (e) { notify((e as Error).message); } finally { setSaving(false); }
  }
  async function signIn(platform: Platform) {
    try { await api(`publish-login/${platform}`, { method: "POST", body: "{}" }); notify(`A ${platforms[platform].label} sign-in window is opening. Sign in to the StatOz account, then close that window.`); }
    catch (e) { notify((e as Error).message); }
  }
  const state = !publisher?.running ? "Posting window not running. Restart the studio with npm run dev." : publisher.signIn ? `${platforms[publisher.signIn].label} sign-in window open. Close it when you are done.` : "Posting window ready";
  return <div className="social-accounts">
    <section className="social-intro"><div><span className="section-caption">ASSISTED POSTING</span><h2>The StatOz pages, one step from your exports.</h2><p>The posting window attaches an export and fills in your caption. You review every post and click Post yourself. Sign-ins are kept in a browser profile outside this project folder, so cloud sync never uploads them. Never share or copy that profile.</p></div>
      <div className={`publisher-state ${publisher?.running ? "ok" : "missing"}`}><Icon name={publisher?.running ? "check" : "close"} size={17}/><span>{state}</span></div></section>
    <div className="social-grid">{platformIds.map(p => <article key={p} className="social-card"><h3>{platforms[p].label}</h3><p>{platforms[p].summary}</p>
      <Button variant="secondary" disabled={!publisher?.running || !!publisher.signIn || busy} onClick={() => void signIn(p)}>Sign in</Button></article>)}</div>
    {busy && <p className="muted-note">Sign-in is available when no posting tabs are open.</p>}
    {settings && <section className="social-settings"><h2>Posting settings</h2>
      <InputField label="LinkedIn company ID" placeholder="e.g. 12345678" value={settings.linkedinCompanyId} onChange={e => setSettings({ ...settings, linkedinCompanyId: e.target.value.trim() })}/>
      <small>From the StatOz page admin link: linkedin.com/company/ID/admin</small>
      <label className="field"><span>Posting browser</span><select value={settings.browserChannel} onChange={e => setSettings({ ...settings, browserChannel: e.target.value as PublishSettings["browserChannel"] })}><option value="msedge">Microsoft Edge</option><option value="chrome">Google Chrome</option><option value="chromium">Playwright Chromium</option></select></label>
      <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button></section>}
  </div>;
}
