import { doctor } from "../src/server/runtime";
const checks = await doctor();
for (const c of checks) console.log(`${c.ok ? "OK" : "MISSING"} ${c.name}: ${c.detail}`);
if (checks.some(c => !c.ok && c.name !== "Render worker")) process.exitCode = 1;
