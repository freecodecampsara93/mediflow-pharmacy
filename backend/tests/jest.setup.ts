// Lazily required inside afterAll: eagerly importing testApp here would load
// (and cache) config/env before a test file's own top-level code gets a
// chance to set env overrides (see webhook.test.ts).
afterAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { testPool } = require('./testApp');
  await testPool.end();
});
