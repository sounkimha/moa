import { rename, access } from 'node:fs/promises';
import path from 'node:path';
const file = path.resolve('apps/api/.data/moa.json');
try {
  await access(file);
  const backup = `${file}.${Date.now()}.backup`;
  await rename(file, backup);
  console.log(`Demo data backed up to ${backup}. Restart the API to reseed.`);
} catch (e) {
  if (e.code === 'ENOENT') console.log('No local demo database yet.');
  else throw e;
}
