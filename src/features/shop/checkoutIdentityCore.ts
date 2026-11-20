// src/features/shop/checkoutIdentityCore.ts
//
// Who pays for a gem bundle or the starter pack (economy fix round E2c,
// 20.11). Pure logic, no React Native imports, so
// scripts/test-shop-economy-client.ts runs it in Node; IAPModal.tsx and
// StarterPackModal.tsx use it.
//
// Since 2026-11-20 the server credits bought gems only from the RevenueCat
// webhook, which finds the account by the RevenueCat app user id. A purchase
// made while RevenueCat is still anonymous (a guest, or a session whose
// RevenueCat login failed at launch) reaches the webhook under an anonymous id
// that matches no account, so nobody is credited. The Pro checkout
// (PricingScreen) already refused guests and waited for the login; the gem
// checkouts now do the same, before anything is charged.

export interface CheckoutAccount {
  isAuthenticated: boolean;
  isGuest: boolean;
  userId: string | null;
}

export type CheckoutIdentity =
  | { kind: 'ready'; userId: string }
  /** A guest, or no account: send them to sign up first. Nothing charged. */
  | { kind: 'needs_account' }
  /** RevenueCat could not be identified with the account. Nothing charged. */
  | { kind: 'identity_failed' };

/**
 * `login` is loginRevenueCat (src/services/revenueCat.ts): identifies the
 * RevenueCat SDK with the account (Purchases.logIn when a launch-time login
 * failed) and resolves with its customer info, or null when RevenueCat is not
 * available. A rejection or null means the purchase must not start.
 */
export async function identifyForCheckout(
  account: CheckoutAccount,
  login: (userId: string) => Promise<unknown>,
): Promise<CheckoutIdentity> {
  if (account.isGuest || !account.isAuthenticated || !account.userId) return { kind: 'needs_account' };
  const userId = account.userId;
  try {
    const info = await login(userId);
    if (info === null || info === undefined) return { kind: 'identity_failed' };
    return { kind: 'ready', userId };
  } catch {
    return { kind: 'identity_failed' };
  }
}

/** Hebrew copy shared by both checkouts. Plain and short, no em-dashes. */
export const CHECKOUT_COPY = {
  needsAccountTitle: 'צריך חשבון כדי לקנות',
  needsAccountBody: 'ההרשמה חינמית ולוקחת רגע. כך הרכישה נשמרת בחשבון שלכם.',
  needsAccountLater: 'לא עכשיו',
  needsAccountSignUp: 'להרשמה',
  identityFailedTitle: 'הרכישה לא התחילה',
  identityFailedBody: 'לא הצלחנו להתחבר לחנות, ולא חויבתם. נסו שוב בעוד רגע.',
} as const;
