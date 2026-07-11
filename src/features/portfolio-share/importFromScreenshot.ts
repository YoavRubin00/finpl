/**
 * Screenshot → composer picks (Yoav 11.7): picks an image from the user's
 * gallery (a screenshot of their REAL investing app), sends it to the
 * server vision endpoint, and maps the extracted holdings into the
 * composer's DraftPick shape. The composer's existing edit UI is the
 * mandatory confirm step — nothing is shared without the user reviewing.
 *
 * Privacy: the server extracts percentages + tickers only (no amounts, no
 * account details) and persists nothing.
 */
import * as ImagePicker from 'expo-image-picker';
import { getApiBase } from '../../db/apiBase';
import type { FantasySectorId } from '../../constants/theme';
import { F2_SECTORS } from '../../constants/theme';
import { track } from '../../lib/analytics/events';

export interface ImportedPick {
  ticker: string;
  name: string;
  sector: FantasySectorId;
  allocationPct: number;
}

export type ImportResult =
  | { status: 'ok'; broker: string | null; picks: ImportedPick[] }
  | { status: 'empty' }        // model saw no holdings (not a portfolio screenshot)
  | { status: 'cancelled' }    // user closed the picker
  | { status: 'error' };

const ENDPOINT = '/api/portfolio/import-screenshot';

function isSector(v: string): v is FantasySectorId {
  return v in F2_SECTORS;
}

export async function importPortfolioFromScreenshot(): Promise<ImportResult> {
  try { track({ name: 'portfolio_screenshot_import_started', props: {} }); } catch { /* non-fatal */ }
  try {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
      // Screenshots are tall — no forced aspect / cropping.
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.base64) {
      return { status: 'cancelled' };
    }
    const asset = picked.assets[0];
    const res = await fetch(`${getApiBase()}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: asset.base64,
        mediaType: asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg',
      }),
    });
    if (!res.ok) throw new Error(`import failed: ${res.status}`);
    const data = (await res.json()) as {
      ok: boolean;
      broker?: string | null;
      positions?: { ticker: string; name: string; sector: string; allocationPct: number }[];
    };
    const positions = data.positions ?? [];
    if (!data.ok) throw new Error('import not ok');
    if (positions.length === 0) {
      try { track({ name: 'portfolio_screenshot_import_succeeded', props: { positions_count: 0 } }); } catch { /* non-fatal */ }
      return { status: 'empty' };
    }
    const picks: ImportedPick[] = positions.map((p) => ({
      ticker: p.ticker,
      name: p.name || p.ticker,
      sector: isSector(p.sector) ? p.sector : 'tech',
      allocationPct: Math.max(1, Math.round(p.allocationPct)),
    }));
    try {
      track({ name: 'portfolio_screenshot_import_succeeded', props: { positions_count: picks.length, broker: data.broker ?? undefined } });
    } catch { /* non-fatal */ }
    return { status: 'ok', broker: data.broker ?? null, picks };
  } catch (e) {
    try { track({ name: 'portfolio_screenshot_import_failed', props: {} }); } catch { /* non-fatal */ }
    return { status: 'error' };
  }
}
