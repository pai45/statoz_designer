import type { InvestorReview } from "@/domain/investor-review";
import { maxPitchPages, type Project } from "@/domain/project";

export function investorReviewPrompt(review: InvestorReview, project: Project, rubric: string) {
  return `# Investor Lens: India seed-VC first screening

You are simulating a skeptical first-screening investor. This is an assessment, not investment advice.

Review the complete saved pitch deck below using the shared rubric. Use only the project JSON, its source notes, repository-backed product evidence described in the deck, and the optional founder context. Do not browse the web and do not invent or repair missing facts.

Return one JSON object matching the required assessment schema. Do not wrap it in Markdown or add commentary.
- Use existing page IDs in recommendation.pageIds. Use [] for a recommendation that affects the whole narrative or requires a new slide.
- Use short stable IDs such as rec-clarity and q-retention.
- Every recommendation that needs unavailable founder information must reference one or more question IDs.
- Give no more than three strengths, five objections, eight recommendations, and eight questions.
- Score only supported evidence. A polished unsupported claim earns no proof points.

# Optional founder context

${review.context || "No additional context supplied."}

# Shared rubric

${rubric}

# Saved project JSON

${JSON.stringify(project, null, 2)}
`;
}

export function investorRevisionPrompt(review: InvestorReview, candidate: Project, rubric: string, candidateFile: string, structured: boolean) {
  if (!review.assessment || !review.application) throw new Error("Investor revision requires an assessment and approved application.");
  const recommendations = review.assessment.recommendations.filter(item => review.application!.recommendationIds.includes(item.id));
  const answers = review.application.answers.map(answer => ({
    ...answer,
    prompt: review.assessment!.questions.find(question => question.id === answer.questionId)?.prompt ?? answer.questionId,
  }));
  const delivery = structured
    ? `Return the complete revised project through the required projectJson response field. Its value must be a JSON string containing the whole project object, not a patch or explanation. Do not call tools.`
    : `Edit only ${candidateFile}. Do not edit the source deck, another project, assets, exports, or repository files. Finish when that candidate JSON is valid.`;
  return `# Investor Lens: approved pitch-deck revision

Apply only the approved recommendations below to the temporary candidate deck. You may reorder, add, remove, rewrite, or relayout slides within the existing project schema and ${maxPitchPages}-page pitch limit. Preserve verified claims, registered asset IDs, pitch-family provenance, and all protected identifiers.

Founder answers are supplied claims, not independent verification. When an answer enters a slide, keep a visible source note such as "Founder supplied, [date or source note]; not independently verified." If an answer lacks enough support, keep the affected claim qualified or input-needed. Never invent traction, retention, financials, market figures, team credentials, customers, or financing terms.

${delivery}

# Approved recommendations

${JSON.stringify(recommendations, null, 2)}

# Founder answers

${JSON.stringify(answers, null, 2)}

# Shared rubric and writing standard

${rubric}

# Temporary candidate project JSON

${JSON.stringify(candidate, null, 2)}
`;
}
