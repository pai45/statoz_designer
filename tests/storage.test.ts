import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("storage persists projects, detects external edits and simultaneous saves, and reports malformed JSON", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-storage-test-"));
  process.env.STUDIO_DATA_DIR = folder;
  const store = await import("../src/server/storage");
  const { createProject } = await import("../src/features/templates/registry");
  try {
    await store.initialize();
    const created = await store.addProject(createProject("match-preview", "square"));
    const edited = await store.saveProject({ ...created.project, name: "Saved match" }, created.etag);
    assert.equal(edited.project.revision, 2); assert.equal((await store.readProject(edited.project.id)).project.name, "Saved match");
    await assert.rejects(() => store.saveProject(created.project, created.etag), /changed outside/);
    const racing = await Promise.allSettled([store.saveProject({ ...edited.project, name: "First" }, edited.etag), store.saveProject({ ...edited.project, name: "Second" }, edited.etag)]);
    assert.equal(racing.filter(r => r.status === "fulfilled").length, 1);
    const current = await store.readProject(edited.project.id);
    await fs.writeFile(store.location("projects", current.project.id), JSON.stringify({ ...current.project, name: "Assistant edit", revision: current.project.revision }));
    await assert.rejects(() => store.saveProject(current.project, current.etag), /changed outside/);
    await fs.writeFile(store.location("projects", "broken"), "{broken");
    const listing = await store.listProjects(); assert.ok(listing.errors.some(e => e.includes("malformed JSON"))); assert.ok(listing.projects.length > 0);
    assert.throws(() => store.location("projects", "../outside"), /Invalid local/);
    const originalRename = fs.rename;
    let sharingLocks = 0;
    fs.rename = async (source, destination) => {
      if (sharingLocks++ < 2) throw Object.assign(new Error("Windows sharing violation"), { code: "EPERM" });
      return originalRename(source, destination);
    };
    try {
      const target = path.join(folder, "retry-save.json");
      await store.atomicWrite(target, { recovered: true });
      assert.deepEqual(JSON.parse(await fs.readFile(target, "utf8")), { recovered: true });
      assert.equal(sharingLocks, 3);
    } finally { fs.rename = originalRename; }
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
