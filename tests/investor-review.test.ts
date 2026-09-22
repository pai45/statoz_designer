import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { investorAssessmentSchema, investorScoreTotal } from "../src/domain/investor-review";
import { createProject } from "../src/features/templates/registry";

const assessment = investorAssessmentSchema.parse({
  signal: "maybe",
  summary: "The product is visible, but the deck does not yet prove repeatable demand.",
  scores: { clarity: 12, timing: 6, product: 12, market: 6, proof: 4, business: 5, team: 1, ask: 7 },
  strengths: ["The product loop is concrete."],
  objections: ["No verified retention or team evidence is shown."],
  recommendations: [{ id: "rec-proof", priority: "critical", pageIds: [], title: "Show retention evidence", rationale: "Retention is the main first-screening gap.", action: "Add a sourced traction slide or clearly state that validation is pending.", questionIds: ["q-retention"] }],
  questions: [{ id: "q-retention", prompt: "What measured retention data is available?", why: "The deck currently makes a retention case without cohort evidence." }],
});

test("the Investor Lens rubric totals one hundred points and validates question links", () => {
  assert.equal(investorScoreTotal(assessment.scores), 53);
  assert.equal(investorScoreTotal({ clarity: 15, timing: 10, product: 15, market: 10, proof: 20, business: 10, team: 10, ask: 10 }), 100);
  assert.equal(investorAssessmentSchema.safeParse({ ...assessment, recommendations: [{ ...assessment.recommendations[0], questionIds: ["missing"] }] }).success, false);
});

test("investor application is bound to the reviewed revision and creates only a temporary fresh-id candidate", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-investor-review-"));
  process.env.STUDIO_DATA_DIR = folder;
  const stub = path.join(folder, process.platform === "win32" ? "codex-stub.cmd" : "codex-stub.sh");
  await fs.writeFile(stub, process.platform === "win32" ? "@echo off\r\necho codex-stub 1.0\r\n" : "#!/bin/sh\necho codex-stub 1.0\n");
  if (process.platform !== "win32") await fs.chmod(stub, 0o755);
  process.env.CODEX_CLI_PATH = stub;
  const storage = await import("../src/server/storage");
  const investor = await import("../src/server/investor/queue");
  try {
    await storage.initialize();
    const master = createProject("investor-pitch", "landscape");
    const saved = await storage.addProject(master);
    const created = await investor.createInvestorReview({ projectId: master.id, etag: saved.etag, provider: "codex", context: "Seed screening" });
    await storage.updateRun(created.run.id, { status: "completed" });
    await storage.updateInvestorReview(created.review.id, { status: "completed", assessment });

    await assert.rejects(() => investor.applyInvestorReview(created.review.id, { recommendationIds: ["rec-proof"], answers: [], variantName: "Investor revision", audience: "India seed VCs", provider: "claude" }), /same provider/);
    await assert.rejects(() => investor.applyInvestorReview(created.review.id, { recommendationIds: ["rec-proof"], answers: [], variantName: "Investor revision", audience: "India seed VCs" }), /Answer every founder question/);

    const applied = await investor.applyInvestorReview(created.review.id, {
      recommendationIds: ["rec-proof"],
      answers: [{ questionId: "q-retention", answer: "No measured cohort is available yet.", sourceNote: "Founder supplied, September 2026" }],
      variantName: "Investor revision",
      audience: "India seed VCs",
    });
    assert.equal(applied.run.workflow, "investor-revision");
    const candidate = JSON.parse(await fs.readFile(storage.location("reviews", created.review.id, ".candidate.json"), "utf8"));
    assert.notEqual(candidate.id, master.id);
    assert.equal(candidate.pitchDeck.familyId, master.id);
    assert.equal(candidate.pitchDeck.basedOnProjectId, master.id);
    assert.equal(candidate.pages.some((page: { id: string }) => master.pages.some(source => source.id === page.id)), false);
    assert.deepEqual((await storage.readProject(master.id)).project, master);
    await storage.updateRun(applied.run.id, { status: "failed" });

    const staleMaster = createProject("investor-pitch", "landscape");
    const staleSaved = await storage.addProject(staleMaster);
    const staleReview = await investor.createInvestorReview({ projectId: staleMaster.id, etag: staleSaved.etag, provider: "codex" });
    await storage.updateRun(staleReview.run.id, { status: "completed" });
    await storage.updateInvestorReview(staleReview.review.id, { status: "completed", assessment });
    await storage.saveProject({ ...staleMaster, name: "Changed after review" }, staleSaved.etag);
    await assert.rejects(() => investor.applyInvestorReview(staleReview.review.id, {
      recommendationIds: ["rec-proof"], answers: [{ questionId: "q-retention", answer: "None yet", sourceNote: "Founder supplied" }],
      variantName: "Stale", audience: "India seed VCs",
    }), /changed/);
  } finally {
    delete process.env.CODEX_CLI_PATH;
    await fs.rm(folder, { recursive: true, force: true });
  }
});
