# Starter Pack — IAP setup for App Store + Google Play (via RevenueCat)

This document is what you (or whoever's running the store consoles) needs to do
to make the **חבילת מתחילים** (starter pack, daily-rotating ₪19.90 bundle) a
real, billable purchase.

The code is already wired — it calls
`purchaseGemBundle('starter-pack')` from
[`src/services/revenueCat.ts`](../src/services/revenueCat.ts). All you need to
do is configure the product in three places.

---

## 0. The exact identifiers (don't deviate)

The client expects these strings byte-for-byte:

| Where | Value |
| --- | --- |
| App Store / Play Console product ID | `finplay_starter_pack_19_90` |
| RevenueCat product mapping key | `starter-pack` |
| RC entitlement (PRO subscription) | `FinPlay Pro` |

If you change any of these, also change the matching constant in
[`src/services/revenueCat.ts`](../src/services/revenueCat.ts) and
[`src/features/shop/starterPack.ts`](../src/features/shop/starterPack.ts).

---

## 1. App Store Connect (Apple)

1. Sign in to **appstoreconnect.apple.com** with the team admin account.
2. Apps → **FinPlay** → **In-App Purchases** → **+ Create**.
3. Type: **Consumable** (this matters — Apple won't accept "Non-consumable" for
   bundles that grant repeating consumable goods even if a user only buys it
   once. Consumable lets the user re-buy on a different day.)
4. Reference Name: `Starter Pack 19.90`.
5. Product ID: `finplay_starter_pack_19_90` ← exact match.
6. Pricing: choose Tier `ILS 19.90` from the price matrix.
   - Apple uses tier-based pricing; tier "ILS-Tier 19" is ₪19.90.
7. Localizations:
   - Hebrew display name: `חבילת מתחילים`
   - Hebrew description: `מטבעות, יהלומים, ושתי דמויות אווטר. תוכן הופכת מדי יום בחצות.`
   - English display name: `Starter Pack`
   - English description: `Coins, gems, and two avatar characters. Contents rotate daily at midnight Israel time.`
8. Review Information: upload a screenshot of the modal (`StarterPackModal`
   open in the simulator). Reviewers need to see what the user sees.
9. Save → **Submit for Review** (after the next app build is uploaded).

**Tax category**: Apple's default for consumable IAP. No special category needed.

**Family Sharing**: leave OFF (consumables can't be family-shared).

---

## 2. Google Play Console

1. Sign in to **play.google.com/console** with the project admin account.
2. Apps → **FinPlay** → Monetize → **In-app products** → **Create product**.
3. Product type: **Managed product** (Google's term for non-subscription IAP;
   for consumables you mark them consumable when calling
   `consumeAsync` — RevenueCat does this for you).
4. Product ID: `finplay_starter_pack_19_90` ← exact match.
5. Name: `חבילת מתחילים — Starter Pack`.
6. Description (Hebrew): `מטבעות, יהלומים, ושתי דמויות אווטר. תוכן הופכת מדי יום בחצות.`
7. Default price: **₪19.90** (set Israel as the default region; Google will
   auto-derive other regions, override as needed).
8. Status: **Active**.
9. Save → activate. Google generally takes ~1 hour for the product to be
   visible in the test track and ~24h for production.

**Important Google quirk**: products only show up in the live store after the
**app is published in at least the closed-testing track** with a build that
references the SKU. If you're testing locally before that, RC's `getProducts`
will return an empty array and the buy button will throw.

---

## 3. RevenueCat dashboard

1. Sign in to **app.revenuecat.com**.
2. Project: **FinPlay** (or create one if missing).
3. **Apps** → ensure both `App Store` and `Google Play` apps are configured
   with their respective shared secrets / service-account JSON.
4. **Products** → **+ New** → import the product:
   - For iOS: pick `finplay_starter_pack_19_90` from the dropdown (RC pulls
     it from App Store Connect once the app is set up).
   - For Android: pick the same SKU from the Play Console dropdown.
5. **Offerings** → open the `default` offering → **+ Add Package**:
   - Package identifier: leave RC's default or set to `starter_pack`.
   - Attach the iOS and Android products to this package.
6. Make sure the offering is marked as the **current** offering.
7. **API keys** → copy the **iOS public SDK key** and **Android public SDK key**
   into your `.env`:
   ```
   EXPO_PUBLIC_RC_APPLE_KEY=appl_xxxxxxxxxxxx
   EXPO_PUBLIC_RC_GOOGLE_KEY=goog_xxxxxxxxxxxx
   ```
8. Rebuild (`eas build` or `npx expo prebuild`) so the env vars get baked into
   the binary. The keys are public-by-design — safe to ship in the client.

---

## 4. Sandbox testing

### iOS
1. App Store Connect → Users and Access → **Sandbox testers** → create one
   (e.g. `tester+finplay@yourcompany.com`).
2. On a real iPhone (sandbox doesn't work on simulator for IAP), go to
   Settings → App Store → Sandbox Account → sign in with the sandbox tester.
3. Run the app, open the daily deals, tap the starter pack banner, hit "קנה
   ב-₪19.90". You should see Apple's sandbox confirmation prompt.
4. After confirming, the app should grant the bundle locally and the modal
   should auto-close. RC dashboard will show the receipt within ~30 seconds.

### Android
1. Play Console → Setup → **License testing** → add the tester's Google
   account (must be a real Gmail).
2. Internal testing track → upload the build that references the SKU →
   send the tester an opt-in link → install via that link (NOT a sideload).
3. Buy flow shows "This is a test purchase, you won't be charged."

---

## 5. Compliance checklist before shipping

- [ ] **Minor gate**: `StarterPackModal` already blocks users with
  `profile.ageGroup === 'minor'` and shows a parental-consent message
  ([`StarterPackModal.tsx`](../src/features/shop/StarterPackModal.tsx) lines
  ~155-165). Confirm the onboarding actually populates `ageGroup` for every
  user before they reach the shop.
- [ ] **Restore Purchases**: there's no UI surface for `restorePurchases()`
  yet. App Store will reject without it. Add a button in Settings →
  "שחזר רכישות" that calls
  `restorePurchases()` from `services/revenueCat.ts`.
- [ ] **Tax**: ₪19.90 in App Store / Google Play is **including VAT**. Both
  stores collect and remit Israeli VAT for you (since 2022).
- [ ] **Privacy manifest** (iOS 17+): consumable IAP is covered by Apple's
  default privacy template — no extra changes to `PrivacyInfo.xcprivacy`
  required.
- [ ] **Terms / EULA**: link the existing
  [terms-and-privacy doc](finplay-terms-and-privacy.md) from the modal
  ("בלחיצה על קנה אני מאשר את התנאים"). Currently NOT linked.

---

## 6. Verifying the wiring locally

```bash
# 1. Make sure the env vars are set
cat .env | grep RC_

# 2. Rebuild
npx expo prebuild --clean
npx expo run:ios   # or run:android

# 3. Open the app, navigate to daily deals, tap starter pack.
#    With RC keys present → real IAP flow opens.
#    Without RC keys → grant happens locally (preview-only stub) and a
#    successful Alert appears. This stub path is gated by
#    `HAS_RC_KEY` in StarterPackModal.tsx.
```

---

## 7. What changes when you want to add another bundle

1. Add a variant to `STARTER_PACK_VARIANTS` in
   [`starterPack.ts`](../src/features/shop/starterPack.ts).
   The rotation will pick it up automatically — no extra config.
2. The IAP product (`finplay_starter_pack_19_90`) does NOT change. Same
   product, same price, contents vary client-side.
3. If you ever want to change the **price**, you must:
   - Create a NEW SKU in both stores (`finplay_starter_pack_29_90` etc.) —
     stores don't allow renaming a SKU's price.
   - Add it to `GEM_PRODUCT_IDS` in
     [`revenueCat.ts`](../src/services/revenueCat.ts).
   - Update `STARTER_PACK_PRICE_LABEL` in `starterPack.ts`.
