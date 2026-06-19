// api/ads/google.ts
//
// Server-side reader for Google Ads performance — the Google half of Bar's
// automated ad analysis (the Meta half is api/ads/meta.ts). App / UAC
// conversions flow to Google via Firebase/SDK, so the Ads account HAS the data;
// this endpoint reads it back via the Google Ads API (GAQL search) and returns
// a normalized JSON the Bar cloud routine can WebFetch on a schedule.
//
// AUTH (more involved than Meta — Google Ads has no single long-lived token):
//  - A refresh token (OAuth) is exchanged for a short-lived access token per call.
//  - Requires a Google Ads developer token + the OAuth client id/secret.
//  - All secrets live ONLY in Vercel env, never in the client build.
//  - Endpoint guarded by the SAME ADS_REPORT_SECRET as api/ads/meta.ts.
//  - Loud-fail (console.warn) on any missing env so gaps show in Vercel logs.
//
// Served at `/api/ads/google` (vercel.json deploys only api/**).
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADS_REPORT_SECRET = process.env.ADS_REPORT_SECRET;
const DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID; // digits only, no dashes
const LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID; // optional MCC/manager
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION ?? 'v17';

// Resource each level reports from. ad_group_ad gives creative-level rows (best
// for learnings) but UAC/App campaigns expose limited ad detail, so ad_group is
// the safe default that always returns data.
const LEVEL_RESOURCE: Record<string, string> = {
  campaign: 'campaign',
  ad_group: 'ad_group',
  ad: 'ad_group_ad',
};

interface GoogleMetrics {
  costMicros?: string;
  impressions?: string;
  clicks?: string;
  ctr?: number;
  averageCpc?: string;
  conversions?: number;
  conversionsValue?: number;
}
interface GoogleRow {
  campaign?: { name?: string };
  adGroup?: { name?: string };
  adGroupAd?: { ad?: { id?: string; name?: string } };
  metrics?: GoogleMetrics;
}
interface GoogleSearchResponse {
  results?: GoogleRow[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
}

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = (await resp.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new Error(`OAuth refresh failed: ${json.error_description ?? json.error ?? 'no access_token'}`);
  }
  return json.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Endpoint guard — private ad data.
  if (!ADS_REPORT_SECRET) {
    console.warn('[ads/google] ADS_REPORT_SECRET not set in Vercel env — refusing to serve ad data');
    return res.status(401).json({ error: 'ads report not configured' });
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADS_REPORT_SECRET}` && auth !== ADS_REPORT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!DEV_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !CUSTOMER_ID) {
    console.warn('[ads/google] missing Google Ads env (DEVELOPER_TOKEN / CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN / CUSTOMER_ID)');
    return res.status(500).json({
      error:
        'Google Ads not configured (set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID)',
    });
  }

  const q = req.query as Record<string, string | string[] | undefined>;
  const level = firstParam(q.level) ?? 'ad_group';
  const resource = LEVEL_RESOURCE[level] ?? 'ad_group';
  const since = firstParam(q.since);
  const until = firstParam(q.until);

  // Build the GAQL date clause. Validate date inputs strictly (GAQL is a query
  // language — never interpolate unvalidated strings).
  let dateClause = 'DURING LAST_30_DAYS';
  if (since || until) {
    if (!since || !until || !ISO_DATE.test(since) || !ISO_DATE.test(until)) {
      return res.status(400).json({ error: 'since & until must both be YYYY-MM-DD' });
    }
    dateClause = `BETWEEN '${since}' AND '${until}'`;
  }

  const selectFields = [
    'campaign.name',
    'ad_group.name',
    ...(resource === 'ad_group_ad' ? ['ad_group_ad.ad.id', 'ad_group_ad.ad.name'] : []),
    'metrics.cost_micros',
    'metrics.impressions',
    'metrics.clicks',
    'metrics.ctr',
    'metrics.average_cpc',
    'metrics.conversions',
    'metrics.conversions_value',
  ].join(', ');
  const query = `SELECT ${selectFields} FROM ${resource} WHERE segments.date ${dateClause}`;

  try {
    const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN);
    const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${CUSTOMER_ID}/googleAds:search`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': DEV_TOKEN,
      'Content-Type': 'application/json',
    };
    if (LOGIN_CUSTOMER_ID) headers['login-customer-id'] = LOGIN_CUSTOMER_ID;

    const raw: GoogleRow[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, pageSize: 1000, ...(pageToken ? { pageToken } : {}) }),
      });
      const json = (await resp.json()) as GoogleSearchResponse;
      if (json.error || !resp.ok) {
        console.warn('[ads/google] Ads API error', json.error);
        return res.status(502).json({
          error: `Google Ads error: ${json.error?.message ?? `HTTP ${resp.status}`}`,
          status: json.error?.status ?? null,
        });
      }
      if (json.results) raw.push(...json.results);
      pageToken = json.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 25);

    const rows = raw.map((row) => {
      const m = row.metrics ?? {};
      const cost = num(m.costMicros) / 1e6;
      const conversions = num(m.conversions);
      return {
        campaign: row.campaign?.name ?? null,
        ad_group: row.adGroup?.name ?? null,
        ad: row.adGroupAd?.ad?.name ?? null,
        cost,
        impressions: num(m.impressions),
        clicks: num(m.clicks),
        ctr: num(m.ctr),
        cpc: num(m.averageCpc) / 1e6,
        conversions,
        conversions_value: num(m.conversionsValue),
        cost_per_conversion: conversions > 0 ? cost / conversions : null,
        roas: cost > 0 ? num(m.conversionsValue) / cost : null,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.cost += r.cost;
        acc.impressions += r.impressions;
        acc.clicks += r.clicks;
        acc.conversions += r.conversions;
        acc.conversions_value += r.conversions_value;
        return acc;
      },
      { cost: 0, impressions: 0, clicks: 0, conversions: 0, conversions_value: 0 },
    );

    return res.status(200).json({
      ok: true,
      platform: 'google',
      customer: CUSTOMER_ID,
      level,
      range: since && until ? { since, until } : { date_preset: 'last_30d' },
      count: rows.length,
      totals,
      rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[ads/google] error', err);
    return res.status(500).json({ error: message });
  }
}
