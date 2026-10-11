# FinPlay Pro Yearly — store setup brief (for the backend/ops agent)

Date: 2026-10-11. Owner: Yoav Rubin. Scope: create the **annual** Pro subscription in both stores so the existing RevenueCat package `$rc_annual` becomes purchasable. The app already renders a monthly/annual picker the moment the offering carries both packages (no app release needed).

## 0. Facts you must not change
- App: **FinPlay**, bundle id / package name `com.finplay.app`.
- RevenueCat project `projbe6d1148`, entitlement **`FinPlay Pro`** (`entl81de32bde3`), offering **`default`** (`ofrng0753c167b9`).
- Existing monthly: App Store `finplay_pro_monthly` (₪29.90, 7-day free trial), Play `finplay_pro_monthly` base plan `monthly` (₪29.90, 7-day free-trial offer). **Do not edit it.**
- Do not create new offerings or entitlements. Do not rename anything.

## 1. Price (decision: ~70% saving)
- 12 × ₪29.90 = ₪358.80.
- Target yearly price: **₪109.90** (69.4% saving). If App Store Connect offers a **₪107.90** price point for Israel, use it instead (70.0%) and mirror it in Play. Both stores must show the same ILS price.
- Israel is the base territory; let the store auto-equalize other territories.

## 2. App Store Connect
1. My Apps → FinPlay → Monetization → Subscriptions → open the **same subscription group** that contains `finplay_pro_monthly`.
2. Create subscription: Reference name `FinPlay Pro Yearly`, **Product ID `finplay_pro_yearly`** (exact), duration **1 year**.
3. Price: Israel ₪109.90 (or ₪107.90, see §1), equalize other territories.
4. Introductory offer: **Free trial, 7 days**, all territories, eligibility new subscribers (same as the monthly).
5. Localization (Hebrew + English): display name `FinPlay Pro שנתי` / `FinPlay Pro Yearly`; description `גישה מלאה לכל התכנים, אנרגיה בלי סוף, בלי פרסומות` / `Full access, unlimited energy, no ads`.
6. Subscription group ranking: put the yearly at the same level as the monthly (so switching is an upgrade/crossgrade, not a downgrade).
7. Review information: upload a screenshot of the pricing screen (any current paywall screenshot works) and submit the subscription for review. It can be submitted on its own; it does not need a new app binary.
8. In **RevenueCat → Apps → FinPlay (App Store)**: the App Store Connect API key is **not configured** (`asc_api_key_configured=false`). Add one (Users and Access → Integrations → App Store Connect API, role App Manager) so RevenueCat can sync prices and the catalog. Optional but recommended.

## 3. Google Play Console
1. Monetize → Products → Subscriptions → Create subscription: **Product ID `finplay_pro_yearly`** (exact), name `FinPlay Pro Yearly`.
2. Base plan: **ID `yearly`** (exact, RevenueCat expects `finplay_pro_yearly:yearly`), auto-renewing, billing period 1 year, grace period as the monthly, price Israel ₪109.90 (or ₪107.90), convert other regions automatically.
3. Offer on that base plan: **Free trial 7 days**, eligibility new customers, offer id `freetrial7`.
4. Activate the base plan and the offer. Confirm the product shows **Active**.

## 4. RevenueCat (already done on 11.10 by Claude; verify, do not duplicate)
- Products: `finplay_pro_yearly` = `prode9cfcbc52a` (App Store app `app0e625a27bf`), `finplay_pro_yearly:yearly` = `prod06346e584f` (Play app `app95cadbcc45`), plus Test Store `yearly` = `prode23bf57ada`. Their `duration` is empty in RevenueCat until the store products exist; that is expected.
- All three attached to entitlement `FinPlay Pro` (it now holds 6 products: 3 monthly + 3 yearly).
- Package **`$rc_annual`** = `pkged644fa0ec6` in offering `default`, position 1 (after `$rc_monthly`). The app selects by package type, not by position, so the order is fine.
- If any of these is missing, create exactly that piece; nothing else.
- Play shortcut: RevenueCat's Play credentials work (store state read = `not_found`), so you may create the Play product through a RevenueCat **product store state plan** (`create-product-store-state-plan` → review → apply) instead of the Play Console UI. Use the same ids, price and 7-day trial as §3, and review the plan before applying. App Store cannot be driven from RevenueCat until the API key in §2.8 is added.

## 5. Verification (required before reporting done)
1. iOS: TestFlight build 1.4.9 (build 183) with a sandbox tester → open the app → any Pro entry point → the pricing screen shows **two pills** (שנתי / חודשי) with "הכי משתלם · 69%" on the yearly. Buy the yearly → entitlement `FinPlay Pro` active in RevenueCat → the app shows "המנוי שלכם פעיל".
2. Android: internal-testing track with a license tester → same flow.
3. Webhook: RevenueCat → Integrations → Webhook `FinPlay Backend Webhook` → the `INITIAL_PURCHASE` event for the test purchase shows **200** from `https://finpl.vercel.app/api/webhooks/revenuecat`.
4. PostHog: `paywall_cta_state` now carries `package_type: ANNUAL` for new viewers; `paywall_plan_selected` fires when the user flips plans.

## 6. Report back
Product ids per store, final ILS prices, trial config, review status (App Store), activation status (Play), screenshots of both store pages, and the RevenueCat offering page showing two packages. If a store rejects something, the exact rejection text.
