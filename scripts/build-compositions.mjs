import { build } from 'esbuild';
import fs from 'node:fs/promises';
export async function buildCompositions() {
  const result = await build({ entryPoints: ['src/features/compositions/entry.tsx'], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', minify: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, tsconfig: 'tsconfig.json' });
  await fs.mkdir('.studio', { recursive: true });
  await fs.writeFile('.studio/composition.js.tmp', result.outputFiles[0].text);
  await fs.rename('.studio/composition.js.tmp', '.studio/composition.js');
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/build-compositions.mjs')) await buildCompositions();
