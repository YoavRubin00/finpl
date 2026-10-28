import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the real service with a native SDK double. No store account, purchase,
// entitlement grant, or network call is made by this regression check.
interface Service {
  configureRevenueCat(id?: string): void;
  loginRevenueCat(id: string): Promise<unknown>;
  logoutRevenueCat(): Promise<void>;
  getOffering(): Promise<unknown>;
  getOfferingFailureReason(): string | null;
  purchasePackage(pkg: unknown): Promise<unknown>;
}
function load(platform = 'android', hasKey = true) {
  const events: string[] = [];
  let configured = false;
  let currentId = 'guest';
  const offering = { availablePackages: [{ identifier: 'monthly' }] };
  const sdk = {
    configure: (options: { appUserID?: string; apiKey: string }) => {
      assert.equal(options.apiKey, platform === 'ios' ? 'apple-test' : 'google-test');
      configured = true; currentId = options.appUserID ?? 'guest'; events.push(`configure:${currentId}`);
    },
    getOfferings: async () => {
      assert.ok(configured, 'offerings require a configured SDK');
      events.push('offerings'); return { current: offering };
    },
    getCustomerInfo: async () => ({ entitlements: { active: {} } }),
    logIn: async (id: string) => { await Promise.resolve(); currentId = id; events.push(`login:${id}`); return { customerInfo: { id } }; },
    logOut: async () => { events.push('logout'); },
    purchasePackage: async () => { events.push(`purchase:${currentId}`); return { customerInfo: { id: currentId } }; },
  };
  const code = ts.transpileModule(readFileSync('src/services/revenueCat.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const nativeRequire = (id: string) => {
    if (id === 'react-native') return { Platform: { OS: platform } };
    if (id === 'react-native-purchases') return { default: sdk };
    throw new Error(`Unexpected runtime import: ${id}`);
  };
  new Function('require', 'module', 'exports', '__DEV__', 'process', code)(nativeRequire, mod, mod.exports, false, { env: hasKey ? { EXPO_PUBLIC_RC_APPLE_KEY: 'apple-test', EXPO_PUBLIC_RC_GOOGLE_KEY: 'google-test' } : {} });
  return { service: mod.exports as Service, events, offering };
}
async function main() {
  for (const platform of ['ios', 'android']) {
    const { service, events, offering } = load(platform);
    service.configureRevenueCat();
    service.configureRevenueCat();
    assert.deepEqual(events, ['configure:guest'], 'fresh guests must initialize once');
    assert.equal(await service.getOffering(), offering);
    service.configureRevenueCat('account-one');
    await Promise.all([service.loginRevenueCat('account-one'), service.loginRevenueCat('account-two')]);
    assert.equal(events.filter((event) => event.startsWith('configure:')).length, 1, 'account switching never reconfigures the SDK');
    assert.deepEqual(events.slice(-2), ['login:account-one', 'login:account-two']);
    await service.loginRevenueCat('account-two');
    assert.equal(events.filter((event) => event === 'login:account-two').length, 1);
    await Promise.all([service.loginRevenueCat('checkout-account'), service.purchasePackage({})]);
    assert.deepEqual(events.slice(-2), ['login:checkout-account', 'purchase:checkout-account'], 'checkout waits for the identified account');
    await service.logoutRevenueCat();
    await service.logoutRevenueCat();
    assert.equal(events.filter((event) => event === 'logout').length, 1, 'anonymous logout is a no-op');
  }
  const cold = load();
  await cold.service.getOffering();
  assert.deepEqual(cold.events, ['configure:guest', 'offerings'], 'paywall can load before the root initialization effect');
  const missing = load('android', false);
  assert.equal(await missing.service.getOffering(), null);
  assert.equal(missing.service.getOfferingFailureReason(), 'sdk_not_configured');
  assert.equal(missing.events.length, 0);
  const identified = load();
  await identified.service.loginRevenueCat('stable-account');
  assert.deepEqual(identified.events, ['configure:stable-account']);
  console.log('PASS: iOS/Android guest initialization, cold paywall, account switches, logout, missing key and first identified login');
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
