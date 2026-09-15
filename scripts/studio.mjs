import { spawn } from 'node:child_process';
const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const children = [];
const worker = spawn(process.execPath, ['--import', 'tsx', 'src/server/worker.ts'], { stdio: 'inherit', windowsHide: true });
children.push(worker);
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', mode, '--hostname', '127.0.0.1', '--port', process.env.PORT || '3000'], { stdio: 'inherit', windowsHide: true });
children.push(app);
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); setTimeout(() => process.exit(code), 1500).unref(); }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
app.on('exit', code => stop(code || 0));
worker.on('exit', code => { if (!stopping) { console.error('Render worker exited. Restart the studio to resume exports.'); stop(code || 1); } });
