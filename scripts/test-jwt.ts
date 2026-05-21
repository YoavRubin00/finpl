// scripts/test-jwt.ts
// Run: npx tsx scripts/test-jwt.ts
import 'dotenv/config';
import { signSession, verifySession } from '../api/_shared/jwt';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL: ${label}`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  actual:   ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  console.log(`PASS: ${label}`);
}

function assertThrows(fn: () => unknown, label: string): void {
  try {
    fn();
  } catch {
    console.log(`PASS: ${label}`);
    return;
  }
  console.error(`FAIL: ${label} — did not throw`);
  process.exit(1);
}

(async () => {
  if (!process.env.AUTH_JWT_SECRET) {
    console.error('FAIL: AUTH_JWT_SECRET not set in .env');
    process.exit(1);
  }

  const payload = { sub: '550e8400-e29b-41d4-a716-446655440000', authId: 'user@example.com' };
  const token = signSession(payload);
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    console.error('FAIL: signSession did not return a 3-part JWT string');
    process.exit(1);
  }
  console.log('PASS: signSession returns 3-part JWT');

  const decoded = verifySession(token);
  assertEqual(decoded.sub, payload.sub, 'verifySession returns sub');
  assertEqual(decoded.authId, payload.authId, 'verifySession returns authId');

  assertThrows(() => verifySession('not.a.token'), 'verifySession throws on garbage');
  assertThrows(() => verifySession(token + 'tamper'), 'verifySession throws on tampered token');

  console.log('All JWT tests passed.');
})();
