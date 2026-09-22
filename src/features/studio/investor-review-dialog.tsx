"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { codexModelOptions, providerIds, providers, type Provider } from "@/domain/agent";
import { investorDimensionLabels, investorScoreTotal, type FounderAnswer, type InvestorReview } from "@/domain/investor-review";
import type { ProjectEnvelope } from "@/domain/project";
import { Button, FilterChips, Icon, Tag } from "@/design-system/components/ui";
import { api } from "@/shared/api";
import "./investor-review-dialog.css";

type Props = {
  source: ProjectEnvelope | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onOpen: (value: ProjectEnvelope) => void;
  notify: (message: string) => void;
};

const active = (status?: string) => status === "queued" || status === "running";
const defaultAudience = "India-focused pre-seed and seed gaming investors";

export function InvestorReviewDialog({ source, onClose, onRefresh, onOpen, notify }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reviews, setReviews] = useState<InvestorReview[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [followUp, setFollowUp] = useState<InvestorReview | null>(null);
  const [provider, setProvider] = useState<Provider>("codex");
  const [model, setModel] = useState("");
  const [context, setContext] = useState("");
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, { answer: string; sourceNote: string }>>({});
  const [variantName, setVariantName] = useState("India seed VC · investor revision");
  const [audience, setAudience] = useState(defaultAudience);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!source) return;
    const next = await api<InvestorReview[]>(`investor-reviews?projectId=${encodeURIComponent(source.project.id)}`);
    setReviews(next);
    setSelectedId(current => current && next.some(review => review.id === current) ? current : next[0]?.id ?? "");
  }, [source]);

  const selected = reviews.find(review => review.id === selectedId) ?? null;
  const followUpId = selected?.application?.followUpReviewId;
  const shownFollowUp = followUp?.id === followUpId ? followUp : null;

  function chooseReview(id: string) {
    setSelectedId(id); setSelectedRecommendations([]); setAnswers({}); setFollowUp(null);
  }

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (source && !node.open) { node.showModal(); void load(); }
    if (!source && node.open) node.close();
  }, [source, load]);

  useEffect(() => {
    const id = followUpId;
    if (!id) return;
    void api<InvestorReview>(`investor-reviews/${id}`).then(setFollowUp).catch(() => setFollowUp(null));
  }, [followUpId, selected?.updatedAt]);

  useEffect(() => {
    const polling = reviews.some(review => active(review.status) || active(review.application?.status)) || active(shownFollowUp?.status);
    if (!source || !polling) return;
    const timer = setInterval(() => { void load(); if (followUpId) void api<InvestorReview>(`investor-reviews/${followUpId}`).then(setFollowUp); }, 2000);
    return () => clearInterval(timer);
  }, [source, reviews, shownFollowUp?.status, load, followUpId]);

  const requiredQuestions = useMemo(() => {
    if (!selected?.assessment) return [];
    const ids = new Set(selected.assessment.recommendations.filter(item => selectedRecommendations.includes(item.id)).flatMap(item => item.questionIds));
    return selected.assessment.questions.filter(question => ids.has(question.id));
  }, [selected, selectedRecommendations]);
  const missingAnswers = requiredQuestions.filter(question => !answers[question.id]?.answer.trim());

  async function startReview() {
    if (!source) return;
    setWorking(true);
    try {
      const result = await api<{ review: InvestorReview }>("investor-reviews", { method: "POST", body: JSON.stringify({ projectId: source.project.id, etag: source.etag, provider, ...(provider === "codex" && model ? { model } : {}), context }) });
      chooseReview(result.review.id); setContext(""); await load(); notify("Investor screening queued.");
    } catch (error) { notify((error as Error).message); }
    finally { setWorking(false); }
  }

  async function applyRecommendations() {
    if (!selected) return;
    setWorking(true);
    try {
      const founderAnswers: FounderAnswer[] = requiredQuestions.map(question => ({ questionId: question.id, answer: answers[question.id].answer.trim(), sourceNote: answers[question.id].sourceNote.trim() }));
      await api(`investor-reviews/${selected.id}/apply`, { method: "POST", body: JSON.stringify({ recommendationIds: selectedRecommendations, answers: founderAnswers, variantName, audience }) });
      await load(); notify("Investor-focused variant queued. The master will remain unchanged.");
    } catch (error) { notify((error as Error).message); }
    finally { setWorking(false); }
  }

  async function act(action: "cancel" | "retry", reviewId = selected?.id) {
    if (!reviewId) return;
    try { await api(`investor-reviews/${reviewId}/${action}`, { method: "POST" }); await load(); if (reviewId === shownFollowUp?.id) setFollowUp(await api<InvestorReview>(`investor-reviews/${reviewId}`)); }
    catch (error) { notify((error as Error).message); }
  }

  async function openVariant() {
    const id = selected?.application?.variantProjectId;
    if (!id) return;
    await onRefresh();
    try { onOpen(await api<ProjectEnvelope>(`projects/${id}`)); onClose(); }
    catch (error) { notify((error as Error).message); }
  }

  const assessment = selected?.assessment;
  const baseTotal = assessment ? investorScoreTotal(assessment.scores) : null;
  const followTotal = shownFollowUp?.assessment ? investorScoreTotal(shownFollowUp.assessment.scores) : null;
  const runStatus = selected?.application ? selected.application.status : selected?.status;
  const retryable = runStatus && ["failed", "cancelled", "interrupted"].includes(runStatus);

  return <dialog ref={dialog} className="modal investor-review-modal" onCancel={onClose}>
    <div className="modal-heading investor-review-heading"><div><span className="section-caption">INVESTOR LENS · INDIA SEED VC</span><h2>{source?.project.name}</h2><p>Simulated first screening. Evidence gaps become founder questions, never invented claims.</p></div><Button variant="ghost" aria-label="Close investor review" onClick={onClose}><Icon name="close"/></Button></div>
    <div className="investor-review-shell">
      <aside className="investor-review-history" aria-label="Investor review history">
        <div className="section-caption">SCREENING HISTORY</div>
        {reviews.map(review => <button key={review.id} className={review.id === selectedId ? "is-active" : ""} onClick={() => chooseReview(review.id)}><span>{review.phase === "follow-up" ? "FOLLOW-UP" : `REV ${review.sourceRevision}`}</span><strong>{review.assessment ? `${investorScoreTotal(review.assessment.scores)}/100` : review.status}</strong><small>{new Date(review.createdAt).toLocaleDateString()}</small></button>)}
        {!reviews.length && <p>No screenings yet.</p>}
      </aside>
      <main className="investor-review-main">
        {!selected && <section className="investor-start">
          <div><span className="section-caption">NEW SCREENING</span><h3>Would this deck earn the next meeting?</h3><p>The agent reads the saved deck as an India-focused seed investor and returns a concise, evidence-aware screening memo.</p></div>
          <FilterChips label="Investor assistant" options={providerIds.map(id => providers[id].label)} selected={providers[provider].label} onSelect={label => setProvider(providerIds.find(id => providers[id].label === label) ?? "codex")}/>
          {provider === "codex" && <label className="field"><span>Codex model</span><select value={model} onChange={event => setModel(event.target.value)}>{codexModelOptions.map(option => <option key={option.id || "default"} value={option.id}>{option.label}</option>)}</select></label>}
          <label className="field"><span>Optional screening context</span><textarea rows={4} maxLength={2000} value={context} onChange={event => setContext(event.target.value)} placeholder="For example: We are raising ₹1 Cr and want feedback on whether the current proof is enough for an initial seed meeting."/></label>
          <Button disabled={working} onClick={() => void startReview()}><Icon name="spark"/>{working ? "Queuing…" : "Run investor screening"}</Button>
        </section>}

        {selected && !assessment && <section className="investor-pending" aria-live="polite"><Icon name="spark" size={30}/><h3>{active(selected.status) ? "Investor screening in progress" : "Investor screening needs attention"}</h3><p>{selected.error ?? (selected.status === "queued" ? "Waiting for the local assistant." : selected.status === "running" ? "Reviewing the saved deck and its evidence." : "The review did not finish.")}</p><div>{active(selected.status) && <Button variant="ghost" onClick={() => void act("cancel")}>Stop review</Button>}{retryable && <Button variant="secondary" onClick={() => void act("retry")}>Retry review</Button>}<Button variant="ghost" onClick={() => chooseReview("")}>New screening</Button></div></section>}

        {selected && assessment && <>
          <section className="investor-score-hero"><div><span className="section-caption">FIRST-SCREENING SIGNAL</span><strong>{baseTotal}<small>/100</small></strong></div><div><Tag>{assessment.signal.toUpperCase()}</Tag><p>{assessment.summary}</p></div></section>
          <section className="investor-score-grid">{Object.entries(assessment.scores).map(([key, score]) => <div key={key}><span>{investorDimensionLabels[key as keyof typeof investorDimensionLabels]}</span><strong>{score}</strong></div>)}</section>
          <div className="investor-columns"><section><div className="section-caption">WHAT WORKS</div><ul>{assessment.strengths.map(item => <li key={item}>{item}</li>)}</ul></section><section><div className="section-caption">WHY AN INVESTOR HESITATES</div><ul>{assessment.objections.map(item => <li key={item}>{item}</li>)}</ul></section></div>

          {!selected.application && <section className="investor-recommendations"><div className="section-header"><div><span className="section-caption">APPROVE THE REVISION</span><h3>Select the changes worth making</h3></div><span>{selectedRecommendations.length} selected</span></div>
            {assessment.recommendations.map(item => <label className={`investor-recommendation priority-${item.priority}`} key={item.id}><input type="checkbox" checked={selectedRecommendations.includes(item.id)} onChange={event => setSelectedRecommendations(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}/><span><b>{item.priority}</b><strong>{item.title}</strong><p>{item.rationale}</p><small>{item.action}</small>{item.questionIds.length > 0 && <em>Founder input required</em>}</span></label>)}
            {requiredQuestions.length > 0 && <div className="investor-questions"><div className="section-caption">FOUNDER INPUT</div>{requiredQuestions.map(question => <div key={question.id}><label className="field"><span>{question.prompt}</span><textarea rows={3} value={answers[question.id]?.answer ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: { answer: event.target.value, sourceNote: current[question.id]?.sourceNote ?? "" } }))}/><small>{question.why}</small></label><label className="field"><span>Source or date</span><input value={answers[question.id]?.sourceNote ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: { answer: current[question.id]?.answer ?? "", sourceNote: event.target.value } }))} placeholder="Founder supplied, September 2026"/></label></div>)}</div>}
            <div className="investor-variant-fields"><label className="field"><span>Variant name</span><input maxLength={80} value={variantName} onChange={event => setVariantName(event.target.value)}/></label><label className="field"><span>Investor audience</span><textarea rows={2} maxLength={300} value={audience} onChange={event => setAudience(event.target.value)}/></label></div>
            <Button disabled={working || !selectedRecommendations.length || missingAnswers.length > 0 || !variantName.trim() || !audience.trim()} onClick={() => void applyRecommendations()}><Icon name="copy"/>{working ? "Queuing…" : "Create reviewed variant"}</Button>{missingAnswers.length > 0 && <p className="investor-inline-warning">Answer the founder questions required by your selection.</p>}
          </section>}

          {selected.application && <section className="investor-application" aria-live="polite"><div className="section-caption">INVESTOR REVISION</div><h3>{selected.application.status === "completed" ? "Variant created" : active(selected.application.status) ? "Building the approved variant" : "Revision needs attention"}</h3><p>{selected.application.error ?? (selected.application.status === "completed" ? "The master stayed unchanged. A second investor screening is running automatically." : "Only the selected recommendations and supplied answers will be applied.")}</p>{active(selected.application.status) && <Button variant="ghost" onClick={() => void act("cancel")}>Stop revision</Button>}{["failed", "cancelled", "interrupted"].includes(selected.application.status) && <Button variant="secondary" onClick={() => void act("retry")}>Retry revision</Button>}{selected.application.variantProjectId && <Button onClick={() => void openVariant()}>Open revised variant<Icon name="arrow"/></Button>}</section>}

          {selected.application?.variantProjectId && <section className="investor-comparison"><div className="section-caption">AUTOMATIC RE-SCREENING</div>{shownFollowUp?.assessment ? <><div className="comparison-score"><span><small>BEFORE</small><strong>{baseTotal}</strong></span><i>→</i><span><small>AFTER</small><strong>{followTotal}</strong></span><b className={(followTotal ?? 0) - (baseTotal ?? 0) >= 0 ? "positive" : "negative"}>{(followTotal ?? 0) - (baseTotal ?? 0) >= 0 ? "+" : ""}{(followTotal ?? 0) - (baseTotal ?? 0)}</b></div><p>{shownFollowUp.assessment.summary}</p><div className="investor-columns"><section><h4>Remaining objections</h4><ul>{shownFollowUp.assessment.objections.map(item => <li key={item}>{item}</li>)}</ul></section><section><h4>Follow-up strengths</h4><ul>{shownFollowUp.assessment.strengths.map(item => <li key={item}>{item}</li>)}</ul></section></div></> : <><p>{shownFollowUp?.error ?? "Waiting for the independent follow-up score."}</p>{shownFollowUp && ["failed", "cancelled", "interrupted"].includes(shownFollowUp.status) && <Button variant="secondary" onClick={() => void act("retry", shownFollowUp.id)}>Retry follow-up screening</Button>}</>}</section>}
          <Button variant="ghost" onClick={() => chooseReview("")}>Run another screening</Button>
        </>}
      </main>
    </div>
  </dialog>;
}
