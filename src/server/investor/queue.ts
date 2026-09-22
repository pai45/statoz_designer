import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { AgentRun } from "@/domain/agent";
import {
  applyInvestorReviewSchema,
  createInvestorReviewSchema,
  type InvestorReview,
} from "@/domain/investor-review";
import { pitchVariantFrom } from "@/server/storage";
import {
  addInvestorReview,
  atomicWrite,
  listRuns,
  location,
  readInvestorReview,
  readProject,
  StudioError,
  updateInvestorReview,
} from "@/server/storage";
import { activeRunStatuses, retryableRunStatuses } from "@/domain/agent";
import { assertIdle, cancelRun } from "@/server/agents/queue";
import { providerReady } from "@/server/agents/providers";

async function queueRun(run: AgentRun) {
  await atomicWrite(location("runs", run.id), run);
  return run;
}

function queuedRun(review: InvestorReview, workflow: "investor-review" | "investor-revision", projectName = review.sourceProjectName): AgentRun {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: randomUUID(),
    provider: review.provider,
    prompt: workflow === "investor-review" ? "Run the India seed-VC first screening." : "Apply the approved investor recommendations to a new pitch-deck variant.",
    ...(review.model ? { model: review.model } : {}),
    workflow,
    reviewId: review.id,
    projectId: review.sourceProjectId,
    projectName,
    mode: "revise",
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

export async function createInvestorReview(input: unknown) {
  const request = createInvestorReviewSchema.parse(input);
  await assertIdle();
  const ready = providerReady(request.provider);
  if (!ready.ready) throw new StudioError(ready.detail);
  const source = await readProject(request.projectId);
  if (!source.project.pitchDeck) throw new StudioError("Investor Lens reviews require a pitch deck.");
  if (source.etag !== request.etag) throw new StudioError("Save or reload the latest deck before requesting an investor review.", 409);
  const now = new Date().toISOString();
  const reviewId = randomUUID(), runId = randomUUID();
  const review: InvestorReview = {
    schemaVersion: 1,
    id: reviewId,
    sourceProjectId: source.project.id,
    sourceProjectName: source.project.name,
    sourceRevision: source.project.revision,
    sourceEtag: source.etag,
    provider: request.provider,
    ...(request.model ? { model: request.model } : {}),
    lens: "india-seed-vc",
    depth: "first-screening",
    context: request.context,
    phase: "initial",
    parentReviewId: null,
    runId,
    status: "queued",
    assessment: null,
    application: null,
    createdAt: now,
    updatedAt: now,
  };
  const run: AgentRun = { ...queuedRun(review, "investor-review"), id: runId };
  await addInvestorReview(review);
  await queueRun(run);
  return { review, run };
}

export async function applyInvestorReview(id: string, input: unknown) {
  const request = applyInvestorReviewSchema.parse(input);
  await assertIdle();
  const review = await readInvestorReview(id);
  if (review.status !== "completed" || !review.assessment) throw new StudioError("Finish the investor review before applying recommendations.");
  if (review.application) throw new StudioError("This review already has an investor revision. Review that variant to continue iterating.", 409);
  if (request.provider && request.provider !== review.provider) throw new StudioError("Investor review, revision and follow-up must use the same provider.");
  if (request.model && request.model !== review.model) throw new StudioError("Investor review, revision and follow-up must use the same model.");
  const source = await readProject(review.sourceProjectId);
  if (source.etag !== review.sourceEtag || source.project.revision !== review.sourceRevision)
    throw new StudioError("The reviewed deck changed. Run a fresh investor review before applying recommendations.", 409);

  const selected = new Set(request.recommendationIds);
  if (selected.size !== request.recommendationIds.length) throw new StudioError("Choose each recommendation once.");
  const recommendations = review.assessment.recommendations.filter(item => selected.has(item.id));
  if (recommendations.length !== selected.size) throw new StudioError("One or more selected recommendations no longer exist.");
  const questionIds = new Set(review.assessment.questions.map(question => question.id));
  const answers = new Map<string, (typeof request.answers)[number]>();
  for (const answer of request.answers) {
    if (!questionIds.has(answer.questionId)) throw new StudioError(`Unknown founder question: ${answer.questionId}.`);
    if (answers.has(answer.questionId)) throw new StudioError(`Answer each founder question once: ${answer.questionId}.`);
    answers.set(answer.questionId, answer);
  }
  const required = new Set(recommendations.flatMap(item => item.questionIds));
  const missing = [...required].filter(questionId => !answers.has(questionId));
  if (missing.length) throw new StudioError("Answer every founder question required by the selected recommendations.");

  const candidate = pitchVariantFrom(source.project, request.variantName, request.audience);
  const run = queuedRun(review, "investor-revision", candidate.name);
  await fs.writeFile(location("reviews", review.id, ".candidate.json"), JSON.stringify(candidate, null, 2), { flag: "wx" });
  const application: NonNullable<InvestorReview["application"]> = {
    recommendationIds: request.recommendationIds,
    answers: request.answers,
    variantName: request.variantName,
    audience: request.audience,
    revisionRunId: run.id,
    status: "queued",
    variantProjectId: null,
    followUpReviewId: null,
  };
  await updateInvestorReview(review.id, { application });
  await queueRun(run);
  return { review: await readInvestorReview(review.id), run };
}

export async function queueFollowUpInvestorReview(parentId: string, variantProjectId: string) {
  const parent = await readInvestorReview(parentId);
  if (!parent.application) throw new StudioError("The investor revision is missing its application record.");
  const source = await readProject(variantProjectId);
  const now = new Date().toISOString(), id = randomUUID(), runId = randomUUID();
  const review: InvestorReview = {
    schemaVersion: 1, id,
    sourceProjectId: source.project.id,
    sourceProjectName: source.project.name,
    sourceRevision: source.project.revision,
    sourceEtag: source.etag,
    provider: parent.provider,
    ...(parent.model ? { model: parent.model } : {}),
    lens: "india-seed-vc", depth: "first-screening",
    context: `Automatic follow-up to review ${parent.id}. Score the revised deck independently, then identify resolved and remaining objections.`,
    phase: "follow-up", parentReviewId: parent.id,
    runId, status: "queued", assessment: null, application: null,
    createdAt: now, updatedAt: now,
  };
  const run: AgentRun = { ...queuedRun(review, "investor-review"), id: runId };
  await addInvestorReview(review);
  await queueRun(run);
  await updateInvestorReview(parent.id, { application: { ...parent.application, followUpReviewId: id } });
  return { review, run };
}

export async function markInvestorRunState(run: AgentRun, status: AgentRun["status"], error?: string) {
  if (!run.reviewId || !run.workflow?.startsWith("investor-")) return;
  const review = await readInvestorReview(run.reviewId);
  if (run.workflow === "investor-review") {
    await updateInvestorReview(review.id, { status, ...(error ? { error } : { error: undefined }) });
    return;
  }
  if (review.application) await updateInvestorReview(review.id, {
    application: { ...review.application, status, ...(error ? { error } : { error: undefined }) },
  });
}

export async function cancelInvestorReview(id: string) {
  const review = await readInvestorReview(id);
  const runId = review.application && activeRunStatuses.includes(review.application.status) ? review.application.revisionRunId : review.runId;
  const run = await cancelRun(runId);
  if (run.status === "cancelled") await markInvestorRunState(run, "cancelled", run.error ?? "Cancelled before it started.");
  return run;
}

export async function retryInvestorReview(id: string) {
  const review = await readInvestorReview(id);
  await assertIdle();
  if (review.application && retryableRunStatuses.includes(review.application.status)) {
    const source = await readProject(review.sourceProjectId);
    if (source.etag !== review.sourceEtag) throw new StudioError("The reviewed deck changed. Run a fresh investor review instead.", 409);
    const candidate = pitchVariantFrom(source.project, review.application.variantName, review.application.audience);
    await fs.unlink(location("reviews", review.id, ".candidate.json")).catch(() => {});
    await fs.writeFile(location("reviews", review.id, ".candidate.json"), JSON.stringify(candidate, null, 2), { flag: "wx" });
    const run = queuedRun(review, "investor-revision", candidate.name);
    await updateInvestorReview(review.id, { application: { ...review.application, revisionRunId: run.id, status: "queued", error: undefined } });
    await queueRun(run);
    return { review: await readInvestorReview(id), run };
  }
  if (!retryableRunStatuses.includes(review.status)) throw new StudioError("Only a failed or stopped investor run can be retried.");
  const source = await readProject(review.sourceProjectId);
  if (source.etag !== review.sourceEtag) throw new StudioError("The reviewed deck changed. Run a fresh investor review instead.", 409);
  const run = queuedRun(review, "investor-review");
  await updateInvestorReview(review.id, { runId: run.id, status: "queued", assessment: null, error: undefined });
  await queueRun(run);
  return { review: await readInvestorReview(id), run };
}

export async function investorQueueBusy() {
  return (await listRuns()).some(run => activeRunStatuses.includes(run.status));
}
