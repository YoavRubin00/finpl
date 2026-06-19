// api/ads/meta.ts
//
// Server-side reader for Meta (Facebook/Instagram) Ads performance — the data
// source for Bar's automated ad-performance analysis. The app fires the Meta
// pixel/CAPI (react-native-fbsdk-next), so the Ads account HAS conversion data,
// but it lives in Meta — unreachable from a cloud routine without a token. This
// endpoint pulls it via the Marketing API (Graph `/{account}/insights`) and
// returns a normalized JSON so the בר routine can WebFetch it on a schedule.
//
// SECURITY:
//  - The endpoint is guarded by ADS_REPORT_SECRET (Bearer or raw) — it exposes
//    private ad-account data, so an unauthenticated caller must be rejected.
//  - The Meta token lives ONLY in Vercel env (META_ADS_TOKEN), never in the
//    client build and never returned to the caller.
//  - Loud-fail (console.warn) when a required env var is missing so the gap
//    shows up in Vercel logs instead of silently serving nothing — same lesson
//    as api/_shared/posthogCapture.ts.
//
// Only `api/**` is deployed as a Vercel function (see vercel.json), so this is
// served at `/api/ads/meta`.
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Graph API version is path-pinned and sunsets ~2 years after release. Override
// with META_GRAPH_VERSION in Vercel env if Meta rejects the default as too old.
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v21.0';
const META_ADS_TOKEN = process.env.META_ADS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID; // e.g. act_1234567890
const ADS_REPORT_SECRET = process.env.ADS_REPORT_SECRET;

// Insight fields requested per row. `actions` / `cost_per_action_type` /
// `purchase_roas` are arrays keyed by action_type — we pull installs/purchases
// out of them below.
const INSIGHT_FIELDS = [
  'campaign_name',
  'adset_name',
  'ad_name',
  'spend',
  'impressions',
  'clicks',
  'ctr',
  'cpc',
  'reach',
  'frequency',
  'actions',
  'cost_per_action_type',
  'purchase_roas',
  'date_start',
  'date_stop',
].join(',');

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsightRow {
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  reach?: string;
  frequency?: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
  purchase_roas?: MetaAction[];
  date_start?: string;
  date_stop?: string;
}

interface MetaInsightsResponse {
  data?: MetaInsightRow[];
  paging?: { next?: string };
  error?: { message?: string; type?: string; code?: number };
}

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Sum the first matching action_type across the possible Meta aliases. */
function pickAction(arr: MetaAction[] | undefined, types: string[]): number {
  if (!arr) return 0;
  for (const t of types) {
    const hit = arr.find((a) => a.action_type === t);
    if (hit) return num(hit.value);
  }
  return 0;
}

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Endpoint guard — private ad data. Loud-fail when the secret isn't set.
  if (!ADS_REPORT_SECRET) {
    console.warn('[ads/meta] ADS_REPORT_SECRET not set in Vercel env — refusing to serve ad data');
    return res.status(401).json({ error: 'ads report not configured' });
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADS_REPORT_SECRET}` && auth !== ADS_REPORT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!META_ADS_TOKEN || !META_AD_ACCOUNT_ID) {
    console.warn('[ads/meta] META_ADS_TOKEN / META_AD_ACCOUNT_ID missing in Vercel env');
    return res
      .status(500)
      .json({ error: 'Meta ads not configured (set META_ADS_TOKEN + META_AD_ACCOUNT_ID)' });
  }

  // Range: ?since=YYYY-MM-DD&until=YYYY-MM-DD wins; otherwise ?date_preset
  // (default last_30d). Granularity: ?level=ad|adset|campaign (default ad — the
  // deepest, best for creative-level learnings).
  const q = req.query as Record<string, string | string[] | undefined>;
  const level = firstParam(q.level) ?? 'ad';
  const since = firstParam(q.since);
  const until = firstParam(q.until);
  const datePreset = firstParam(q.date_preset) ?? 'last_30d';

  const account = META_AD_ACCOUNT_ID.startsWith('act_')
    ? META_AD_ACCOUNT_ID
    : `act_${META_AD_ACCOUNT_ID}`;
  const base = `https://graph.facebook.com/${META_GRAPH_VERSION}/${account}/insights`;
  const params = new URLSearchParams({
    level,
    fields: INSIGHT_FIELDS,
    limit: '500',
    access_token: META_ADS_TOKEN,
  });
  if (since && until) {
    params.set('time_range', JSON.stringify({ since, until }));
  } else {
    params.set('date_preset', datePreset);
  }

  try {
    // Follow paging.next until exhausted (capped so a runaway can't hang the fn).
    const raw: MetaInsightRow[] = [];
    let next: string | null = `${base}?${params.toString()}`;
    let pages = 0;
    while (next && pages < 25) {
      const resp = await fetch(next);
      const json = (await resp.json()) as MetaInsightsResponse;
      if (json.error) {
        console.warn('[ads/meta] Graph API error', json.error);
        return res.status(502).json({
          error: `Meta Graph error: ${json.error.message ?? 'unknown'}`,
          code: json.error.code ?? null,
        });
      }
      if (json.data) raw.push(...json.data);
      next = json.paging?.next ?? null;
      pages += 1;
    }

    const rows = raw.map((row) => {
      const spend = num(row.spend);
      const installs = pickAction(row.actions, ['mobile_app_install', 'omni_app_install']);
      const purchases = pickAction(row.actions, [
        'omni_purchase',
        'purchase',
        'app_custom_event.fb_mobile_purchase',
      ]);
      const roas = row.purchase_roas?.length ? num(row.purchase_roas[0].value) : 0;
      return {
        campaign: row.campaign_name ?? null,
        adset: row.adset_name ?? null,
        ad: row.ad_name ?? null,
        spend,
        impressions: num(row.impressions),
        clicks: num(row.clicks),
        ctr: num(row.ctr),
        cpc: num(row.cpc),
        reach: num(row.reach),
        frequency: num(row.frequency),
        installs,
        purchases,
        cpi: installs > 0 ? spend / installs : null,
        cpa: purchases > 0 ? spend / purchases : null,
        roas,
        date_start: row.date_start ?? null,
        date_stop: row.date_stop ?? null,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.spend += r.spend;
        acc.impressions += r.impressions;
        acc.clicks += r.clicks;
        acc.installs += r.installs;
        acc.purchases += r.purchases;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, installs: 0, purchases: 0 },
    );

    return res.status(200).json({
      ok: true,
      platform: 'meta',
      account,
      level,
      range: since && until ? { since, until } : { date_preset: datePreset },
      count: rows.length,
      totals,
      rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[ads/meta] error', err);
    return res.status(500).json({ error: message });
  }
}
