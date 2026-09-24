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

await mkdir(path.join(output, "assets", "brand"), { recursive: true });
await cp(
  path.join(root, "public", "assets", "brand", "logo.png"),
  path.join(output, "assets", "brand", "logo.png"),
);
await writeFile(path.join(output, ".nojekyll"), "");

console.log(`Static Studio ready at ${path.relative(root, output)}`);
