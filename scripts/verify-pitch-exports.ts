import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { createProject } from "../src/features/templates/registry";

const data = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-pitch-exports-"));
process.env.STUDIO_DATA_DIR = data;
try {
  const [{ addProject, initialize, location, readJob }, { enqueue }, { renderJob }] = await Promise.all([
    import("../src/server/storage"), import("../src/server/jobs"), import("../src/server/render"),
  ]);
  await initialize();
  const project = createProject("investor-pitch", "landscape");
  await addProject(project);
  for (const outputType of ["zip", "pdf", "pptx"] as const) {
    const queued = await enqueue(project, "landscape", outputType);
    await renderJob(queued);
    const complete = await readJob(queued.id);
    if (complete.status !== "completed" || !complete.output) throw new Error(`${outputType} did not complete`);
    const bytes = await fs.readFile(path.join(location("renders", queued.id, ""), complete.output));
    if (outputType === "pdf") {
      const pdf = await PDFDocument.load(bytes);
      if (pdf.getPageCount() !== 12) throw new Error(`PDF has ${pdf.getPageCount()} pages`);
      const { width, height } = pdf.getPage(0).getSize();
      if (width / height !== 16 / 9) throw new Error("PDF is not 16:9");
    } else {
      const entries = unzipSync(bytes);
      const names = Object.keys(entries);
      const count = outputType === "zip" ? names.filter(name => name.endsWith(".png")).length : names.filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length;
      if (count !== 12) throw new Error(`${outputType.toUpperCase()} has ${count} slides`);
    }
    console.log(`PASS ${outputType.toUpperCase()} · 12 slides · ${bytes.length} bytes`);
  }
} finally {
  await fs.rm(data, { recursive: true, force: true });
}
