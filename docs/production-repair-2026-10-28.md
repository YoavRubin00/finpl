# FinPlay production repair — 2026-10-28

## Findings

- `finpl` is the API-only Vercel project for this repository. The active deployment was READY, but `/` returned 404 because no static site is exported there. The existing marketing site is `https://finplay.me`.
- Recent production request logs contained intermittent 502 responses from `/api/trading/quote` and `/api/ai/banner-tip`. AAPL and USD/ILS read probes succeeded during diagnosis; no evidence of a general outage was found.
- The initial RevenueCat state had `configuredFor === null`. Calling `configureRevenueCat()` for a guest also computed a null target and returned before initializing the native SDK. This can prevent guest offerings from loading.

## Changes

- Redirect only `/` to the marketing site; all API routes remain intact.
- Bound quote requests to 8 seconds per Yahoo host, fall back to the alternate host on transient failures, validate request shape and finite positive prices, retain currency/OHLCV, map TA125 consistently with the native client, and cache successful public responses at the CDN for 5 seconds. Errors are not cached. Never return a fabricated or stale fallback price.
- Disable Gemini 2.5 Flash thinking for the short banner and increase visible-output headroom; bound the request, ignore thought parts, and log safe failure metadata. No user prompt, API key, or upstream response body is logged.
- Configure RevenueCat once, including anonymous guests. Lazily initialize before offering reads. Use logIn/logOut for identity changes, serialize these changes with checkout, and wait for the current account before purchasing. Existing entitlements are synchronized before offering a second checkout.
- Retry transient subscription sync failures twice. If the store has confirmed a purchase but activation is pending, explain that state and offer restoration rather than another purchase.

## Verification and release

- `scripts/test-production-api.ts`: mocked provider fallback, deadlines, missing/invalid ticker, invalid price, preserved currency/OHLCV, cache policy, banner token budget/parts/empty response.
- `scripts/test-trial-activation.ts`: executes the actual service with a native SDK double, covering iOS/Android guest initialization, cold paywall, configure-once identity switches, serialized checkout, logout, missing keys, first identified login. No real purchase, trial grant, or payment was performed.
- Targeted strict server typecheck passed. Full Expo typecheck has a pre-existing baseline of errors; changed files were checked separately for new diagnostics.
- OTA uses the production EAS environment/workflow for each native platform. Runtime remains `1.4.7`, matching the latest production iOS and Android builds (1.5.0). No native dependency or configuration changed in this repair. The old open energy decision is superseded by the explicit 2026-10-14 approval and current MAX_HEARTS=10; no energy behavior changed here.
- Live store checkout still requires an eligible store account and on-device verification. A mock test does not establish production trial eligibility or successful billing.

References: [RevenueCat initialization](https://www.revenuecat.com/docs/getting-started/quickstart), [customer identity](https://www.revenuecat.com/docs/customers/identifying-customers), [Gemini thinking and output limits](https://ai.google.dev/gemini-api/docs/generate-content/thinking).
