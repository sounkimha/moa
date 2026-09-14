import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const windows = process.platform === 'win32';
const children = [];
let stopping = false;
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
try {
  for (const port of [Number(process.env.PORT || 4000), 8081]) {
    await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', () => reject(new Error(
        `${port} 포트를 이미 사용 중입니다. 기존 MOA 개발 서버를 종료한 뒤 npm run dev를 다시 실행해주세요. 이전 API와 새 화면을 혼합해서 실행하지 않습니다.`,
      )));
      probe.listen(port, '0.0.0.0', () => probe.close(resolve));
    });
  }
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
      ['run', 'web', '-w', '@moa/mobile'],
    ]) {
      start(args).on('exit', (status) => {
        if (!stopping) {
          process.exitCode = status || 1;
          stop();
        }
      });
    }
    console.log('\nMOA: http://localhost:8081 | API: http://localhost:4000/health\n');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
  stop();
}
