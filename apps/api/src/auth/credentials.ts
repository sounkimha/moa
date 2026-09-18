import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const usernameSchema = z.string().trim().min(3, '아이디는 3자 이상 입력해주세요.')
  .max(32, '아이디는 32자 이내로 입력해주세요.')
  .regex(/^[A-Za-z0-9._-]+$/, '아이디는 영문·숫자·점·밑줄·하이픈만 사용할 수 있어요.')
  .transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(8, '비밀번호는 8자 이상이어야 해요.').max(128)
  .regex(/[A-Za-z]/, '비밀번호에 영문을 포함해주세요.')
  .regex(/[0-9]/, '비밀번호에 숫자를 포함해주세요.')
  .regex(/[^A-Za-z0-9\s]/, '비밀번호에 특수문자를 포함해주세요.');
export const credentialsSchema = z.object({ username: usernameSchema, password: passwordSchema,
  // Old clients sent reset on every login. Authentication must never erase accounts or trades.
  reset: z.boolean().optional(),
}).strict();
export const registrationSchema = z.object({ username: usernameSchema, password: passwordSchema,
  nickname: z.string().trim().min(2, '닉네임은 2자 이상 입력해주세요.').max(24, '닉네임은 24자 이내로 입력해주세요.'),
}).strict();

const demoPasswordHash = 'ffcaaabfead29c4d47e2e5c68a91a687a0ea2a93927654eb4b6b786d9ea495bc';
export function demoAccounts() {
  return [
    { username: (process.env.MOA_TEST_USERNAME || 'wasabi').trim().toLowerCase(), userId: 'u-me', role: 'buyer' as const,
      passwordHash: process.env.MOA_TEST_PASSWORD_SHA256 || demoPasswordHash },
    ...[
      { username: 'mintroad', userId: 'u-min' },
      { username: 'haru', userId: 'u-haru' },
      { username: 'joon', userId: 'u-joon' },
    ].map((account) => ({ ...account, role: 'traveler' as const,
      passwordHash: process.env.MOA_TRAVELER_TEST_PASSWORD_SHA256 || demoPasswordHash })),
  ];
}
export const reservedUsername = (username: string) => username === 'wasabi' || demoAccounts().some((account) => account.username === username);
export function verifyDemoPassword(password: string, hash: string) {
  if (!/^[a-f0-9]{64}$/i.test(hash)) return false;
  return timingSafeEqual(createHash('sha256').update(password).digest(), Buffer.from(hash, 'hex'));
}

// Server only. Each new account gets a random salt; no password is put on User,
// in a snapshot, or in the mobile bundle. Async scrypt does not block the event loop.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key));
});
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded?: string) {
  const parts = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded || '');
  if (!parts) return false;
  return timingSafeEqual(await derive(password, parts[1]), Buffer.from(parts[2], 'hex'));
}
