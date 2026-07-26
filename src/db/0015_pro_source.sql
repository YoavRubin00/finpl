-- 0015: promo-grant visibility (Yoav 2026-07-26).
-- Records HOW the Pro entitlement was granted: 'promotional' = manual
-- RevenueCat promotional entitlement (period_type PROMOTIONAL), 'store' =
-- regular paid purchase. Written by api/webhooks/revenuecat.ts on grant,
-- read by GET /api/sync/subscription so the client can show the one-time
-- "קיבלתם Pro במתנה" modal + the ≤3-days expiry banner for promo grants.
-- Additive + idempotent — run manually against prod DATABASE_URL (NOT
-- drizzle-kit push — known schema drift).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS pro_source text;
