import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const windows = process.platform === 'win32';
const children = [];
let stopping = false;
const apiPort = Number(process.env.PORT || 4000);
const webPort = 8081;
const metroPort = 8082;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      if (windows) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message);
    }
  }
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', stop);
const start = (args) => {
  const child = spawn(windows ? 'npm.cmd' : 'npm', args, {
    cwd: root, stdio: 'inherit', shell: windows,
    // Own the full process tree, including npm → watcher → API/Metro.
    detached: !windows, env: process.env,
  });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); process.exitCode = 1; stop(); });
  return child;
};
const isPortFree = (port) =>
  new Promise((resolve) => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.listen(port, '0.0.0.0', () => probe.close(() => resolve(true)));
  });
const hasMoaApi = async () => {
  try {
    const response = await fetch(`http://127.0.0.1:${apiPort}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    const health = await response.json();
    return response.ok && health.status === 'ok' && health.mode === 'demo';
  } catch {
    return false;
  }
};
const [apiFree, webFree, metroFree] = await Promise.all([apiPort, webPort, metroPort].map(isPortFree));
if (!apiFree && !webFree && await hasMoaApi()) {
  console.log(`MOA가 이미 실행 중입니다: http://localhost:${webPort} | API: http://localhost:${apiPort}/health`);
} else try {
  for (const [port, free] of [[apiPort, apiFree], [webPort, webFree], [metroPort, metroFree]])
    if (!free) throw new Error(
      `${port} 포트를 이미 사용 중입니다. 기존 MOA 개발 서버를 종료한 뒤 npm run dev를 다시 실행해주세요. 이전 API와 새 화면을 혼합해서 실행하지 않습니다.`,
    );
  const build = start(['run', 'build', '-w', '@moa/domain']);
  const code = await new Promise((resolve) => build.once('exit', resolve));
  children.splice(children.indexOf(build), 1);
  if (code || stopping) {
    process.exitCode = code || 0;
    stop();
  } else {
    for (const args of [
      ['exec', '-w', '@moa/domain', '--', 'tsc', '--watch', '--preserveWatchOutput'],
      ['run', 'dev', '-w', '@moa/api'],
      ['exec', '--', 'node', 'scripts/dev-proxy.mjs'],
      ['run', 'web', '-w', '@moa/mobile', '--', '--port', String(metroPort)],
    ]) {
      start(args).on('exit', (status) => {
        if (!stopping) {
          process.exitCode = status || 1;
          stop();
        }
      });
    }
    console.log(`\nMOA: http://localhost:${webPort} | API: http://localhost:${apiPort}/health\n`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
  stop();
}
