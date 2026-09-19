import 'dotenv/config';

const confirmation = process.env.MOA_RESET_CONFIRM;
if (confirmation !== 'RESET_TEST_DATA') {
  throw new Error('Refusing to reset data. Set MOA_RESET_CONFIRM=RESET_TEST_DATA for this one command.');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. This command intentionally never resets a local file by accident.');
}

const { Store } = await import('../apps/api/dist/infrastructure/store.js');
const store = new Store();
try {
  await store.resetCleanTestData();
  console.log('Test data reset complete. Created 6 clean test accounts and retained the place catalog.');
} finally {
  await store.onModuleDestroy();
}
