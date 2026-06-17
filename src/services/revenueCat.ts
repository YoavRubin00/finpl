import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

/* ── Conditional import — react-native-purchases crashes on web ───── */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RNPurchases = IS_WEB ? null : require('react-native-purchases');
const Purchases = IS_WEB ? null : RNPurchases.default;
const LOG_LEVEL_DEBUG = IS_WEB ? 0 : RNPurchases?.LOG_LEVEL?.DEBUG;
// react-native-purchases v9 renamed `ProductType` → `PRODUCT_CATEGORY` and
// `INAPP` → `NON_SUBSCRIPTION`. Falling back to the old name keeps us safe
// across minor SDK bumps. Without this filter, getProducts on Android returns
// an empty array for consumable IAPs (the starter pack + gem bundles), which
// surfaces to users as a silent failure or a "product not found" error.
interface ProductCategoryEnum {
  NON_SUBSCRIPTION?: string;
  INAPP?: string;
}
const PRODUCT_CATEGORY: ProductCategoryEnum | null = IS_WEB
  ? null
  : ((RNPurchases?.PRODUCT_CATEGORY ?? RNPurchases?.ProductCategory ?? RNPurchases?.ProductType) as ProductCategoryEnum | null);
const NON_SUBSCRIPTION_TYPE = PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? PRODUCT_CATEGORY?.INAPP;

// RevenueCat's structured error-code enum (web-safe; null on web). Used to
// reliably tell a user-cancellation apart from a real purchase failure — the
// `/cancel/i` message regex alone misses iOS StoreKit / Android BillingClient
// codes that don't contain the word "cancel".
const PURCHASES_ERROR_CODE: Record<string, string> | null = IS_WEB
  ? null
  : (RNPurchases?.PURCHASES_ERROR_CODE ?? null);

/** Re-export types for consumers (type-only — no runtime cost) */
export type { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesOffering = import('react-native-purchases').PurchasesOffering;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;
type PurchasesStoreProduct = import('react-native-purchases').PurchasesStoreProduct;

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
  // Daily-rotating starter pack — same product ID, contents rotate client-side.
  // Configure in App Store Connect / Play Console as a CONSUMABLE at ₪19.90.
  'starter-pack': 'finplay_starter_pack_19_90',
};

/* ── Initialization ────────────────────────────────────────────────── */

let configuredFor: string | null = null;

export function configureRevenueCat(appUserId?: string): void {
  if (IS_WEB || !Purchases) return;

  const targetId = appUserId ?? null;
  if (configuredFor === targetId) return;

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;
  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[RevenueCat] No API key found — skipping init (dev mode)');
    }
    return;
  }

  Purchases.configure({ apiKey, appUserID: appUserId ?? undefined });

  if (__DEV__ && LOG_LEVEL_DEBUG !== undefined) {
    Purchases.setLogLevel(LOG_LEVEL_DEBUG);
  }

  configuredFor = targetId;
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

/** Fetch the current offering (subscription packages + gem products).
 *
 * Retries up to 5 times — Google Play's BillingClient routinely returns either
 * null OR a `current` offering SHELL with zero packages on the first cold call,
 * before products finish hydrating. The old code returned `offerings.current`
 * as soon as it was truthy, so an empty-package shell was accepted and the
 * caller (PricingScreen) flipped the CTA to the dead "נסה שוב" state — this is
 * a large share of the ~24% `paywall_cta_state{unavailable}` rate (PostHog,
 * 2026-06). Now we keep retrying until `current` actually has packages, with
 * backoff, and only give up (returning whatever `current` is, even if empty)
 * after the last attempt.
 */
export async function getOffering(): Promise<PurchasesOffering | null> {
  if (IS_WEB || !Purchases) return null;
  const MAX_ATTEMPTS = 5;
  let lastCurrent: PurchasesOffering | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current ?? null;
      if (current) lastCurrent = current;
      // Only accept a fully-hydrated offering. An offering with no packages is
      // treated as "not ready yet" and retried (the cold-BillingClient case).
      if (current && (current.availablePackages?.length ?? 0) > 0) return current;
    } catch {
      // swallow — retry
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      // Backoff: 0.6s, 1.2s, 1.8s, 2.4s — gives the store time to hydrate
      // without an excessively long spinner (~6s worst case).
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  // Last resort: return the best `current` we ever saw (may be empty) so gem
  // purchases that scan availablePackages still have a shot; null if nothing.
  return lastCurrent;
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

/** Classify a purchase error as a USER CANCELLATION (not a real failure).
 *  RevenueCat surfaces a cancel via a `userCancelled` boolean AND/OR the
 *  structured `PURCHASE_CANCELLED_ERROR` code; some native paths only carry a
 *  "cancel" message. Check all three so cancellations are never miscounted as
 *  `subscription_purchase_failed`. */
export function isPurchaseCancelledError(err: unknown): boolean {
  const e = err as { userCancelled?: boolean; code?: string } | null;
  if (e?.userCancelled === true) return true;
  if (PURCHASES_ERROR_CODE && e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return true;
  const msg = err instanceof Error ? err.message : '';
  return /cancel/i.test(msg);
}

/** Best-effort RevenueCat error-code string for failure diagnostics. */
export function purchaseErrorCode(err: unknown): string {
  return (err as { code?: string } | null)?.code ?? 'unknown';
}

/** Purchase a consumable product by its store product ID (for gem bundles).
 * Tries 3 strategies in order — same robust path as the working Starter Pack.
 * Required because Android's BillingClient can return empty arrays in cases
 * where the type filter is misclassified, the product is reachable only via
 * an offering, or the cold-start cache is empty.
 */
export async function purchaseGemBundle(
  bundleId: string,
): Promise<CustomerInfo> {
  if (IS_WEB || !Purchases) throw new Error('Purchases not available on web');

  const productId = GEM_PRODUCT_IDS[bundleId];
  if (!productId) {
    throw new Error(`Unknown gem bundle: ${bundleId}`);
  }

  const fetchWithTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      p,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Store timeout (${ms}ms)`)), ms)
      ),
    ]);
  };

  // ── Strategy 1: typed getProducts (matches the working Starter Pack flow) ──
  let products: PurchasesStoreProduct[] = [];
  try {
    products = await fetchWithTimeout(
      Purchases.getProducts([productId], NON_SUBSCRIPTION_TYPE),
      8000,
    );
  } catch {
    /* swallow — try next strategy */
  }

  // ── Strategy 2: untyped getProducts ──
  // Some Android SDK versions misclassify the product or return [] when the
  // type filter is set. Retry without the filter.
  if (!products || products.length === 0) {
    try {
      products = await fetchWithTimeout(
        Purchases.getProducts([productId]),
        8000,
      );
    } catch {
      /* swallow */
    }
  }

  // If we found the product via getProducts, complete the purchase.
  if (products && products.length > 0) {
    const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
    return customerInfo;
  }

  // ── Strategy 3: purchase via offering package ──
  // If gem products are configured in a RevenueCat offering (recommended),
  // we can purchase the package directly without needing getProducts to work.
  try {
    const offering = await getOffering();
    if (offering) {
      const pkg = offering.availablePackages.find(
        (p) => p.product?.identifier === productId,
      );
      if (pkg) {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return customerInfo;
      }
    }
  } catch {
    /* swallow — we'll throw the user-facing error below */
  }

  throw new Error(
    `Product "${productId}" not available. Verify it's Active + Consumable + has an ILS price in Play Console / App Store Connect.`
  );
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
