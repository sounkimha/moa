import { createHash, randomBytes, scryptSync } from 'node:crypto';

const email = process.argv[2];
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('사용법: npm run admin:setup -- operator@example.com');
  process.exit(1);
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes) {
  let bits = 0, value = 0, result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits -= 5)) & 31];
    }
  }
  if (bits) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16);
const secret = randomBytes(20);
const hash = scryptSync(password, salt, 64).toString('hex');
const uri = `otpauth://totp/${encodeURIComponent(`MOA Admin:${email}`)}?secret=${base32(secret)}&issuer=${encodeURIComponent('MOA Admin')}&algorithm=SHA1&digits=6&period=30`;
const fingerprint = createHash('sha256').update(email).digest('hex').slice(0, 8);

console.log(`\nMOA Admin 계정 설정 (${fingerprint})`);
console.log('아래 네 줄을 apps/api/.env 끝에 추가하고 API 서버를 재시작하세요.');
console.log(`ADMIN_EMAIL=${email}`);
console.log(`ADMIN_PASSWORD_SCRYPT=${salt.toString('hex')}:${hash}`);
console.log(`ADMIN_TOTP_SECRET=${secret.toString('hex')}`);
console.log('ADMIN_ROLE=OPERATIONS');
console.log('\n로그인 비밀번호 (다시 표시되지 않음):');
console.log(password);
console.log('\n인증 앱에 아래 URI를 QR 또는 수동 등록하세요 (비밀값이므로 공유 금지):');
console.log(uri);
console.log('\n.env, 비밀번호, TOTP URI를 Git에 추가하거나 채팅에 보내지 마세요.');
