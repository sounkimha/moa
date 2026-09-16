import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['apps/api/src', 'apps/mobile/src', 'apps/admin/src', 'packages/domain/src', 'scripts'];
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename);
    else if (extensions.has(path.extname(entry.name))) files.push(filename);
  }
}
await Promise.all(roots.map(walk));

const failures = [];
for (const filename of files) {
  const source = await readFile(filename, 'utf8');
  source.split('\n').forEach((line, index) => {
    if (/^(<<<<<<<|=======|>>>>>>>)/.test(line)) failures.push(`${filename}:${index + 1} unresolved merge marker`);
    if (/[ \t]+$/.test(line)) failures.push(`${filename}:${index + 1} trailing whitespace`);
    if (!filename.endsWith('lint.mjs') && /심부름꾼|구매\s*대행자|거래\s*수행자/.test(line)) failures.push(`${filename}:${index + 1} forbidden customer-facing role term`);
    if (filename.includes('/screens/') && /#[0-9a-f]{3,8}/i.test(line)) failures.push(`${filename}:${index + 1} screen color must use a theme token`);
  });
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Lint passed: ${files.length} source files checked.`);
