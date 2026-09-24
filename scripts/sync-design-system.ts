/**
 * Refreshes the statoz-design-system skill from the design guide and tokens.
 *
 *   npm run design:sync
 *
 * Writes the generated references into `.agents/skills/statoz-design-system`, then
 * copies the whole skill to `.claude/skills/statoz-design-system` so Claude Code
 * and Codex load the same files. Run it after changing tokens.css,
 * composition.css's social scale, or src/domain/brand-guide.ts; `npm test` fails
 * until you do.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { claudeSkillDir, designSkillDir, generatedSkillReferences, loadDesignSources } from "../src/server/design-guide";

const references = generatedSkillReferences(await loadDesignSources());
for (const [file, content] of Object.entries(references)) {
  await fs.mkdir(path.dirname(path.join(designSkillDir, file)), { recursive: true });
  await fs.writeFile(path.join(designSkillDir, file), content);
  console.log(`Wrote ${path.relative(process.cwd(), path.join(designSkillDir, file))}`);
}
await fs.rm(claudeSkillDir, { recursive: true, force: true });
await fs.cp(designSkillDir, claudeSkillDir, { recursive: true });
console.log(`Mirrored the skill to ${path.relative(process.cwd(), claudeSkillDir)}`);
