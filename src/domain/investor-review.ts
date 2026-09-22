import { z } from "zod";
import { providerIds, type Provider, type RunStatus } from "./agent";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const note = z.string().trim().max(2000);

export const investorDimensionMaximums = {
  clarity: 15,
  timing: 10,
  product: 15,
  market: 10,
  proof: 20,
  business: 10,
  team: 10,
  ask: 10,
} as const;

export const investorDimensionLabels: Record<keyof typeof investorDimensionMaximums, string> = {
  clarity: "Pitch clarity and opening hook",
  timing: "Problem and timing",
  product: "Product and differentiation",
  market: "Market and initial wedge",
  proof: "Traction, retention and supporting proof",
  business: "Business model and economics",
  team: "Team and ability to execute",
  ask: "Funding ask and use of funds",
};

export const investorScoresSchema = z.object({
  clarity: z.number().int().min(0).max(15),
  timing: z.number().int().min(0).max(10),
  product: z.number().int().min(0).max(15),
  market: z.number().int().min(0).max(10),
  proof: z.number().int().min(0).max(20),
  business: z.number().int().min(0).max(10),
  team: z.number().int().min(0).max(10),
  ask: z.number().int().min(0).max(10),
});

export const investorQuestionSchema = z.object({
  id,
  prompt: z.string().trim().min(1).max(500),
  why: z.string().trim().min(1).max(500),
});

export const investorRecommendationSchema = z.object({
  id,
  priority: z.enum(["critical", "high", "medium"]),
  pageIds: z.array(id).max(12),
  title: z.string().trim().min(1).max(160),
  rationale: z.string().trim().min(1).max(700),
  action: z.string().trim().min(1).max(700),
  questionIds: z.array(id).max(8),
});

export const investorAssessmentSchema = z.object({
  signal: z.enum(["advance", "maybe", "pass"]),
  summary: z.string().trim().min(1).max(1200),
  scores: investorScoresSchema,
  strengths: z.array(z.string().trim().min(1).max(400)).max(3),
  objections: z.array(z.string().trim().min(1).max(500)).max(5),
  recommendations: z.array(investorRecommendationSchema).max(8),
  questions: z.array(investorQuestionSchema).max(8),
}).superRefine((assessment, ctx) => {
  const recommendationIds = new Set<string>();
  for (const [index, recommendation] of assessment.recommendations.entries()) {
    if (recommendationIds.has(recommendation.id)) ctx.addIssue({ code: "custom", message: "Recommendation IDs must be unique.", path: ["recommendations", index, "id"] });
    recommendationIds.add(recommendation.id);
  }
  const questionIds = new Set<string>();
  for (const [index, question] of assessment.questions.entries()) {
    if (questionIds.has(question.id)) ctx.addIssue({ code: "custom", message: "Question IDs must be unique.", path: ["questions", index, "id"] });
    questionIds.add(question.id);
  }
  for (const [index, recommendation] of assessment.recommendations.entries()) for (const questionId of recommendation.questionIds) {
    if (!questionIds.has(questionId)) ctx.addIssue({ code: "custom", message: `Unknown founder question: ${questionId}.`, path: ["recommendations", index, "questionIds"] });
  }
});

export type InvestorAssessment = z.infer<typeof investorAssessmentSchema>;
export type InvestorRecommendation = z.infer<typeof investorRecommendationSchema>;
export type InvestorQuestion = z.infer<typeof investorQuestionSchema>;
export type InvestorScores = z.infer<typeof investorScoresSchema>;

export function investorScoreTotal(scores: InvestorScores) {
  return Object.values(scores).reduce((total, score) => total + score, 0);
}

export const founderAnswerSchema = z.object({
  questionId: id,
  answer: z.string().trim().min(1).max(2000),
  sourceNote: z.string().trim().max(500),
});
export type FounderAnswer = z.infer<typeof founderAnswerSchema>;

const investorApplicationSchema = z.object({
  recommendationIds: z.array(id).min(1).max(8),
  answers: z.array(founderAnswerSchema).max(8),
  variantName: z.string().trim().min(1).max(80),
  audience: z.string().trim().min(1).max(300),
  revisionRunId: id,
  status: z.enum(["queued", "running", "completed", "failed", "cancelled", "interrupted"] satisfies [RunStatus, ...RunStatus[]]),
  variantProjectId: id.nullable(),
  followUpReviewId: id.nullable(),
  error: z.string().max(1000).optional(),
});

export const investorReviewSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  sourceProjectId: id,
  sourceProjectName: z.string().min(1).max(120),
  sourceRevision: z.number().int().min(1),
  sourceEtag: z.string().regex(/^[a-f0-9]{64}$/),
  provider: z.enum(providerIds as [Provider, ...Provider[]]),
  model: z.string().max(80).optional(),
  lens: z.literal("india-seed-vc"),
  depth: z.literal("first-screening"),
  context: note,
  phase: z.enum(["initial", "follow-up"]),
  parentReviewId: id.nullable(),
  runId: id,
  status: z.enum(["queued", "running", "completed", "failed", "cancelled", "interrupted"] satisfies [RunStatus, ...RunStatus[]]),
  assessment: investorAssessmentSchema.nullable(),
  application: investorApplicationSchema.nullable(),
  error: z.string().max(1000).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InvestorReview = z.infer<typeof investorReviewSchema>;

export const createInvestorReviewSchema = z.object({
  projectId: id,
  etag: z.string().regex(/^[a-f0-9]{64}$/),
  provider: z.enum(providerIds as [Provider, ...Provider[]]),
  model: z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/).optional(),
  context: note.default(""),
}).superRefine((request, ctx) => {
  if (request.provider !== "codex" && request.model) ctx.addIssue({ code: "custom", message: "Explicit model selection is currently available for Codex investor reviews.", path: ["model"] });
});

export const applyInvestorReviewSchema = z.object({
  recommendationIds: z.array(id).min(1).max(8),
  answers: z.array(founderAnswerSchema).max(8),
  variantName: z.string().trim().min(1).max(80),
  audience: z.string().trim().min(1).max(300),
  provider: z.enum(providerIds as [Provider, ...Provider[]]).optional(),
  model: z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/).optional(),
});

export const investorAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["signal", "summary", "scores", "strengths", "objections", "recommendations", "questions"],
  properties: {
    signal: { type: "string", enum: ["advance", "maybe", "pass"] },
    summary: { type: "string" },
    scores: {
      type: "object", additionalProperties: false,
      required: Object.keys(investorDimensionMaximums),
      properties: Object.fromEntries(Object.entries(investorDimensionMaximums).map(([key, maximum]) => [key, { type: "integer", minimum: 0, maximum }])),
    },
    strengths: { type: "array", maxItems: 3, items: { type: "string" } },
    objections: { type: "array", maxItems: 5, items: { type: "string" } },
    recommendations: {
      type: "array", maxItems: 8,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "priority", "pageIds", "title", "rationale", "action", "questionIds"],
        properties: {
          id: { type: "string" }, priority: { type: "string", enum: ["critical", "high", "medium"] },
          pageIds: { type: "array", maxItems: 12, items: { type: "string" } },
          title: { type: "string" }, rationale: { type: "string" }, action: { type: "string" },
          questionIds: { type: "array", maxItems: 8, items: { type: "string" } },
        },
      },
    },
    questions: {
      type: "array", maxItems: 8,
      items: {
        type: "object", additionalProperties: false, required: ["id", "prompt", "why"],
        properties: { id: { type: "string" }, prompt: { type: "string" }, why: { type: "string" } },
      },
    },
  },
} as const;
