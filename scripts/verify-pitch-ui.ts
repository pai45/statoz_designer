import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { ProjectEnvelope } from "../src/domain/project";
import { location } from "../src/server/storage";

const base = process.env.STUDIO_URL || "http://127.0.0.1:3000";
const output = path.resolve("test-results/pitch-ui"); await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const unique = `UI variant ${Date.now()}`;
let variantId = "";
let investorReviewId = "";
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(base); await page.getByRole("button", { name: "Pitch decks", exact: true }).click();
  await page.getByRole("heading", { name: "Your pitch, with room to evolve." }).waitFor();
  await page.locator(".pitch-deck-card.master").waitFor();
  assert.equal(await page.locator(".pitch-deck-card.master").count(), 1);
  assert.equal(await page.getByRole("button", { name: "New investor deck" }).isVisible(), true);
  const master = page.locator(".pitch-deck-card.master");
  assert.equal(await master.getByRole("button", { name: "Review as investor" }).isVisible(), true);
  await master.getByRole("button", { name: "Review as investor" }).click();
  const investor = page.locator(".investor-review-modal");
  await investor.getByRole("heading", { name: /StatOz investor pitch/ }).waitFor();
  assert.equal(await investor.getByRole("button", { name: "Run investor screening" }).isVisible(), true);
  assert.equal(await investor.getByText("INDIA SEED VC", { exact: false }).first().isVisible(), true);
  await page.screenshot({ path: path.join(output, "investor-review-desktop.png"), fullPage: true });
  await investor.getByRole("button", { name: "Close investor review" }).click();
  const projectsResponse = await (await fetch(`${base}/api/projects`)).json() as { projects: ProjectEnvelope[] };
  const masterEnvelope = projectsResponse.projects.find(value => value.project.pitchDeck?.role === "master");
  assert.ok(masterEnvelope);
  investorReviewId = `ui-investor-${Date.now()}`;
  const now = new Date().toISOString();
  await fs.writeFile(location("reviews", investorReviewId), JSON.stringify({
    schemaVersion: 1, id: investorReviewId, sourceProjectId: masterEnvelope.project.id, sourceProjectName: masterEnvelope.project.name,
    sourceRevision: masterEnvelope.project.revision, sourceEtag: masterEnvelope.etag, provider: "codex", lens: "india-seed-vc", depth: "first-screening",
    context: "UI verification", phase: "initial", parentReviewId: null, runId: `ui-run-${Date.now()}`, status: "completed",
    assessment: { signal: "maybe", summary: "The product is clear, but the first screening still needs retention proof.", scores: { clarity: 12, timing: 6, product: 12, market: 6, proof: 4, business: 5, team: 2, ask: 7 }, strengths: ["The product loop is easy to understand."], objections: ["No measured retention evidence is shown."], recommendations: [{ id: "rec-retention", priority: "critical", pageIds: [], title: "Address the retention proof gap", rationale: "The deck explains retention mechanics without measured cohort evidence.", action: "Add sourced retention evidence or state that cohort validation remains pending.", questionIds: ["q-retention"] }], questions: [{ id: "q-retention", prompt: "What measured retention evidence is available?", why: "Seed investors need proof that the loop creates repeat behavior." }] },
    application: null, createdAt: now, updatedAt: now,
  }, null, 2));
  await master.getByRole("button", { name: "Review as investor" }).click();
  await investor.locator(".investor-score-hero").getByText("54/100", { exact: true }).waitFor();
  const recommendation = investor.locator(".investor-recommendation", { hasText: "Address the retention proof gap" });
  await recommendation.getByRole("checkbox").check();
  const apply = investor.getByRole("button", { name: "Create reviewed variant" });
  assert.equal(await apply.isDisabled(), true);
  await investor.getByLabel("What measured retention evidence is available?").fill("No measured cohort is available yet; the next round funds instrumentation and testing.");
  await investor.getByLabel("Source or date").fill("Founder supplied, September 2026");
  assert.equal(await apply.isEnabled(), true);
  await page.screenshot({ path: path.join(output, "investor-review-approval.png"), fullPage: true });
  await investor.getByRole("button", { name: "Close investor review" }).click();
  for (const label of ["PDF", "PPTX", "PNG ZIP"]) assert.equal(await master.getByRole("button", { name: label, exact: true }).isVisible(), true);
  await page.screenshot({ path: path.join(output, "library-desktop.png"), fullPage: true });
  await master.getByRole("button", { name: /New variant/ }).click();
  const dialog = page.locator(".pitch-variant-modal"); await dialog.getByLabel("Variant name").fill(unique); await dialog.getByLabel("Audience").fill("Verification audience");
  await dialog.getByRole("button", { name: /Create independent variant/ }).click();
  await page.getByLabel("Project name").waitFor();
  variantId = new URL(page.url()).searchParams.get("project") || ""; assert.ok(variantId);
  assert.equal(await page.getByLabel("Output aspect ratio").isDisabled(), true);
  assert.equal(await page.getByLabel("Output aspect ratio").inputValue(), "landscape");
  assert.equal(await page.locator(".scene-item").count(), 12);
  assert.equal(await page.getByLabel("Evidence state").isVisible(), true);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const exportDialog = page.locator(".export-modal");
  assert.deepEqual(await exportDialog.getByLabel("File type").locator("option").allTextContents(), ["PDF · Flattened 16:9 pages", "PPTX · Flattened widescreen slides", "ZIP · Ordered PNG slides"]);
  await exportDialog.getByRole("button", { name: "Back to editing" }).click();
  await page.getByRole("button", { name: "Back to projects" }).click();
  await page.getByRole("button", { name: "Pitch decks", exact: true }).click();
  const variant = page.locator(".pitch-deck-card.variant", { hasText: unique }); await variant.waitFor();
  page.once("dialog", prompt => prompt.accept(`${unique} renamed`)); await variant.getByRole("button", { name: "Rename" }).click();
  const renamed = page.locator(".pitch-deck-card.variant", { hasText: `${unique} renamed` }); await renamed.waitFor();
  await renamed.getByTitle("Archive").click(); await renamed.waitFor({ state: "detached" });
  await page.getByRole("checkbox", { name: "Show archived" }).check();
  const archived = page.locator(".pitch-deck-card.variant", { hasText: `${unique} renamed` }); await archived.waitFor(); await archived.getByTitle("Restore").click();
  await page.getByRole("checkbox", { name: "Show archived" }).uncheck(); await page.setViewportSize({ width: 412, height: 900 });
  await page.getByRole("button", { name: "Pitch decks", exact: true }).click(); await page.waitForTimeout(250);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator(".pitch-deck-card.master").getByRole("button", { name: "Review as investor" }).click();
  await page.locator(".investor-review-modal").waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator(".investor-review-modal").getByRole("button", { name: "Close investor review" }).click();
  await page.screenshot({ path: path.join(output, "library-mobile.png"), fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS pitch library grouping, variants, rename, archive/restore, editor controls, export choices, and mobile width");
} finally {
  await browser.close();
  if (variantId) await fs.rm(location("projects", variantId), { force: true });
  if (investorReviewId) await fs.rm(location("reviews", investorReviewId), { force: true });
  const listing = await (await fetch(`${base}/api/projects`)).json().catch(() => ({ projects: [] })) as { projects: ProjectEnvelope[] };
  for (const value of listing.projects || []) if (value.project.pitchDeck?.variantName.startsWith(unique)) await fs.rm(location("projects", value.project.id), { force: true });
}
