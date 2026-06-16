/**
 * Server-side PostHog event capture for Vercel serverless functions.
 *
 * Email funnels (sent → opened → clicked) and the WhatsApp-from-email tap
 * happen OUTSIDE the app — the client SDK never sees them. Without a
 * server capture they're invisible to every PostHog funnel, which is exactly
 * why the retention-email effectiveness was unmeasurable (only a bandit DB
 * counter existed, never a queryable event). Mirrors the proven pattern in
 * app/api/webhooks/revenuecat+api.ts.
 *
 * Uses the public capture HTTP endpoint instead of posthog-node so no new
 * server dependency is added. Fire-and-forget — any network/PostHog error is
 * swallowed so it never breaks the email send or the redirect.
 *
 * distinct_id MUST be userProfiles.id (the UUID) — the SAME id the client
 * passes to PostHog via identifyUser(profile.id). That merges these server
 * events onto the same person as in-app events, so the funnel
 *   retention_email_sent → retention_email_opened → retention_email_clicked
 *   → daily_active_day / lesson_started
 * is queryable end-to-end WITHOUT any client-side change.
 */

// EU project (176605). Default MUST be the EU host — the Vercel function
// runtime usually LACKS EXPO_PUBLIC_POSTHOG_HOST (an EXPO_PUBLIC_* var baked
// into the CLIENT build, not the server env). A US default silently ships
// every server capture to the wrong region. Same lesson as the RC webhook.
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;

export async function capturePostHog(
  eventName: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!POSTHOG_KEY || !distinctId) return;
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: eventName,
        distinct_id: distinctId,
        properties: { ...properties, $lib: 'finplay-server' },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[posthogCapture]', eventName, err);
  }
}
