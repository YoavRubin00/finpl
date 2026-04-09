import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

/* ── Conditional import — react-native-purchases crashes on web ───── */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Purchases = IS_WEB ? null : require('react-native-purchases').default;
const LOG_LEVEL_DEBUG = IS_WEB ? 0 : require('react-native-purchases').LOG_LEVEL?.DEBUG;

/** Re-export types for consumers (type-only — no runtime cost) */
export type { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesOffering = import('react-native-purchases').PurchasesOffering;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;

/* ── API Keys ──────────────────────────────────────────────────────────
 * Replace with your real RevenueCat public SDK keys.
 * These are safe to ship in the client — they are NOT secret.
 * ─────────────────────────────────────────────────────────────────── */

const RC_API_KEY_APPLE = process.env.EXPO_PUBLIC_RC_APPLE_KEY ?? '';
const RC_API_KEY_GOOGLE = process.env.EXPO_PUBLIC_RC_GOOGLE_KEY ?? '';

/* ── Entitlement & Offering IDs ─────────────────────────────────────
 * Must match what you configured in the RevenueCat dashboard.
 * ─────────────────────────────────────────────────────────────────── */

/** The entitlement that unlocks PRO features — must match RevenueCat dashboard */
export const RC_ENTITLEMENT_PRO = 'FinPlay Pro';

/** Offering IDs */
export const RC_OFFERING_DEFAULT = 'default';

/* ── Product ID mapping ─────────────────────────────────────────────
 * Maps our gem bundle IDs to store product IDs configured in RevenueCat.
 * Key = our gemBundles.ts id, Value = App Store / Google Play product ID.
 * ─────────────────────────────────────────────────────────────────── */

export const GEM_PRODUCT_IDS: Record<string, string> = {
  'gems-fistful': 'finplay_gems_80',
  'gems-pouch': 'finplay_gems_500',
  'gems-bucket': 'finplay_gems_1200',
  'gems-barrel': 'finplay_gems_2500',
  'gems-wagon': 'finplay_gems_6500',
  'gems-spire': 'finplay_gems_14000',
};

/* ── Initialization ────────────────────────────────────────────────── */

let isConfigured = false;

/**
 * Initialize RevenueCat SDK. Call once at app startup (e.g. in _layout.tsx).
 * Safe to call multiple times — only configures once.
 * No-op on web.
 */
export function configureRevenueCat(appUserId?: string): void {
  if (IS_WEB || isConfigured || !Purchases) return;

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;

  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[RevenueCat] No API key found — skipping init (dev mode)');
    }
    return;
  }

  Purchases.configure({
    apiKey,
    appUserID: appUserId ?? undefined,
  });

  if (__DEV__ && LOG_LEVEL_DEBUG !== undefined) {
    Purchases.setLogLevel(LOG_LEVEL_DEBUG);
  }

  isConfigured = true;
}

/* ── User identification ───────────────────────────────────────────── */

/** Link a logged-in user to RevenueCat so purchases persist across devices */
export async function loginRevenueCat(appUserId: string): Promise<CustomerInfo | null> {
  if (IS_WEB || !Purchases) return null;
  const { customerInfo } = await Purchases.logIn(appUserId);
  return customerInfo;
}

/** Reset to anonymous user (on sign-out) */
export async function logoutRevenueCat(): Promise<void> {
  if (IS_WEB || !Purchases) return;
  await Purchases.logOut();
}

/* ── Offerings ─────────────────────────────────────────────────────── */

/** Fetch the current offering (subscription packages + gem products) */
export async function getOffering(): Promise<PurchasesOffering | null> {
  if (IS_WEB || !Purchases) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

/* ── Purchases ─────────────────────────────────────────────────────── */

/** Purchase a subscription or consumable package */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  if (IS_WEB || !Purchases) throw new Error('Purchases not available on web');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/** Purchase a consumable product by its store product ID (for gem bundles) */
export async function purchaseGemBundle(
  bundleId: string,
): Promise<CustomerInfo> {
  if (IS_WEB || !Purchases) throw new Error('Purchases not available on web');

  const productId = GEM_PRODUCT_IDS[bundleId];
  if (!productId) {
    throw new Error(`Unknown gem bundle: ${bundleId}`);
  }

  const products = await Purchases.getProducts([productId]);
  if (products.length === 0) {
    throw new Error(`Product not found in store: ${productId}`);
  }

  const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
  return customerInfo;
}

/* ── Entitlement checks ────────────────────────────────────────────── */

/** Check if the current user has an active PRO entitlement */
export async function checkProEntitlement(): Promise<boolean> {
  if (IS_WEB || !Purchases) return false;
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined;
}

/** Get current customer info */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (IS_WEB || !Purchases) return null;
  return Purchases.getCustomerInfo();
}

/** Restore purchases (e.g. after reinstall) */
export async function restorePurchases(): Promise<CustomerInfo> {
  if (IS_WEB || !Purchases) throw new Error('Purchases not available on web');
  return Purchases.restorePurchases();
}

/* ── Listener ──────────────────────────────────────────────────────── */

/**
 * Register a listener for customer info changes (subscription status updates).
 * Returns an unsubscribe function.
 */
export function onCustomerInfoUpdated(
  callback: (info: CustomerInfo) => void,
): () => void {
  if (IS_WEB || !Purchases) return () => { };
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}
