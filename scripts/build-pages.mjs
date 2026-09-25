import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const siteRoot = path.join(root, "pages-site");
const output = path.join(siteRoot, "out");

await new Promise((resolve, reject) => {
  const build = spawn(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build", siteRoot],
    { stdio: "inherit", windowsHide: true },
  );
  build.on("error", reject);
  build.on("exit", code => code === 0 ? resolve() : reject(new Error(`Pages build exited with code ${code}.`)));
});

const publicAllowlist = [
  ["assets/brand/logo.png", "assets/brand/logo.png"],
  ["assets/library/stadium.png", "assets/library/stadium.png"],
  ["assets/library/arena.png", "assets/library/arena.png"],
];
for (const [source, target] of publicAllowlist) {
  await mkdir(path.dirname(path.join(output, target)), { recursive: true });
  await cp(path.join(root, "public", source), path.join(output, target));
}
await writeFile(path.join(output, ".nojekyll"), "");

console.log(`Static Studio ready at ${path.relative(root, output)}`);
