import { createHash, randomBytes, scryptSync } from 'node:crypto';

const username = process.argv[2];
if (!username || !/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
  console.error('사용법: npm run admin:setup -- operator');
  process.exit(1);
}

const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64).toString('hex');
const fingerprint = createHash('sha256').update(username).digest('hex').slice(0, 8);

console.log(`\nMOA Admin 계정 설정 (${fingerprint})`);
console.log('아래 세 줄을 apps/api/.env 또는 Railway Variables에 추가하고 API 서버를 재시작하세요.');
console.log(`ADMIN_USERNAME=${username}`);
console.log(`ADMIN_PASSWORD_SCRYPT=${salt.toString('hex')}:${hash}`);
console.log('ADMIN_ROLE=OPERATIONS');
console.log('\n로그인 비밀번호 (다시 표시되지 않음):');
console.log(password);
console.log('\n.env와 비밀번호를 Git에 추가하거나 채팅에 보내지 마세요.');
