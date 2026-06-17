import { useCallback } from 'react';
import { useHeartsStore } from '../../subscription/useHeartsStore';
import { captureEvent } from '../../../lib/posthog';
import { useStockAnalystStore } from '../useStockAnalystStore';
import { useIsPro } from '../../subscription/useSubscription';
import { useUsageStore } from '../../subscription/useUsageStore';
import { useTradingStore } from '../../trading-hub/useTradingStore';
import { fetchQuickAnalysis, fetchDeepAnalysis, fetchLiveQuote } from '../services/stockAnalystClient';
import { buildPortfolioContext } from '../services/portfolioContext';
import { toSharkVoiceError } from '../services/sharkErrorVoice';
import { useAnalystHistoryStore } from '../useAnalystHistoryStore';
import type { AnalystMessage, StockAnalysisDeep, StockAnalysisQuick } from '../types';

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Best-effort lookup of a human company name. The market service caches
// quotes but doesn't expose a name endpoint — for now we fall back to the
// ticker itself; future iteration can add an Alpha Vantage overview call.
function deriveCompanyName(ticker: string): string {
  const map: Record<string, string> = {
    NVDA: 'NVIDIA',
    AAPL: 'Apple',
    MSFT: 'Microsoft',
    GOOGL: 'Alphabet',
    AMZN: 'Amazon',
    META: 'Meta Platforms',
    TSLA: 'Tesla',
    NFLX: 'Netflix',
    AMD: 'AMD',
    INTC: 'Intel',
    JPM: 'JPMorgan Chase',
    V: 'Visa',
    MA: 'Mastercard',
    DIS: 'Disney',
    BA: 'Boeing',
  };
  return map[ticker] ?? ticker;
}

/**
 * Drives the submit lifecycle: gate → loading message → API call → result
 * cards → optional portfolio context card → cleanup. Records usage on the
 * subscription store on success.
 */
export function useAnalystSubmit() {
  const mode = useStockAnalystStore((s) => s.mode);
  const horizon = useStockAnalystStore((s) => s.horizon);
  const appendMessage = useStockAnalystStore((s) => s.appendMessage);
  const removeMessage = useStockAnalystStore((s) => s.removeMessage);
  const setLoading = useStockAnalystStore((s) => s.setLoading);
  const setError = useStockAnalystStore((s) => s.setError);
  const setPendingDeepCard = useStockAnalystStore((s) => s.setPendingDeepCard);

  // Tier gate (Moni Sample Loop, 2026-05-30): Free users get 2 quick
  // analyses per DAY and 1 deep analysis per WEEK; Pro is unlimited. Quotas
  // are enforced by useUsageStore which tracks bucketed counters with their
  // own reset cadences (day vs week). When canUse() is false, useAnalystSubmit
  // returns { ok: false, reason: 'gate' } and the screen surfaces the
  // CapExceededAnalystModal — same UX as the prior hard-blocked behavior.
  const isPro = useIsPro();
  const canUse = useUsageStore((s) => s.canUse);
  const incrementUsage = useUsageStore((s) => s.incrementUsage);
  const canUseAnalystQuick = useCallback(() => canUse('analyst-quick', isPro), [canUse, isPro]);
  const canUseAnalystDeep = useCallback(() => canUse('analyst-deep', isPro), [canUse, isPro]);
  const recordAnalystQuickUsage = useCallback(() => incrementUsage('analyst-quick'), [incrementUsage]);
  const recordAnalystDeepUsage = useCallback(() => incrementUsage('analyst-deep'), [incrementUsage]);
  const addQuickToHistory = useAnalystHistoryStore((s) => s.addQuick);
  const addDeepToHistory = useAnalystHistoryStore((s) => s.addDeep);

  const submit = useCallback(
    async (rawTicker: string): Promise<{ ok: true } | { ok: false; reason: 'gate' | 'error'; message?: string }> => {
      const ticker = rawTicker.trim().toUpperCase();
      if (!ticker) return { ok: false, reason: 'error', message: 'הקלד טיקר' };

      // Gate
      if (mode === 'quick' && !canUseAnalystQuick()) return { ok: false, reason: 'gate' };
      if (mode === 'deep' && !canUseAnalystDeep()) return { ok: false, reason: 'gate' };

      // Energy Sink (Yoav 18/06): using the financial analyst tool costs −1
      // energy. At 0, block and surface the global out-of-energy modal + Pro.
      if (!isPro) {
        const spent = useHeartsStore.getState().useHeart(false);
        if (!spent) {
          useHeartsStore.getState().flagDepleted();
          return { ok: false, reason: 'gate' };
        }
        try { captureEvent('energy_spent', { source: 'tool', tool: 'analyst' }); } catch { /* non-fatal */ }
      }

      const companyName = deriveCompanyName(ticker);

      // 1. user-query bubble
      const userMsg: AnalystMessage = {
        id: nextId('q'),
        kind: 'user-query',
        text: mode === 'deep' ? `נתח לעומק את ${ticker}` : `נתח את ${ticker}`,
        ts: Date.now(),
      };
      appendMessage(userMsg);

      // 2. loading bubble
      const loadingId = nextId('l');
      appendMessage({ id: loadingId, kind: 'loading', mode, ticker, ts: Date.now() });
      setLoading(true);
      setError(null);

      // Deep mode defers the card reveal — we keep `loading` true past the
      // fetch resolution so the input stays locked while the toast waits to
      // be tapped. `revealPendingDeepCard()` (or the auto-reveal timer in
      // StockAnalystScreen) clears loading. Other paths (quick success,
      // any error) clear loading in `finally`.
      let deepPending = false;

      try {
        // 3. Fetch live market data from the deployed Vercel quote endpoint.
        //    Doing this directly (instead of via marketApiService) avoids the
        //    relative-URL fallback to mock data when running on localhost web.
        const quote = await fetchLiveQuote(ticker);
        const price = quote?.price ?? 0;
        const prevClose = quote?.previousClose ?? null;
        const priceChangePct =
          prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
        const spark = (quote?.chart ?? []).slice(-30).map((d) => ({ t: d.timestamp, p: d.price }));

        if (mode === 'quick') {
          const result = await fetchQuickAnalysis({
            ticker,
            companyName,
            exchange: 'NASDAQ',
            horizon,
            priceContext: { price, priceChangePct, currency: 'USD' },
          });

          const card: StockAnalysisQuick = {
            ticker,
            companyName,
            exchange: 'NASDAQ',
            horizon,
            price,
            priceChangePct,
            currency: 'USD',
            spark,
            verdict: result.verdict,
            confidence: result.confidence,
            captainNote: result.captainNote,
            targetNote: result.targetNote,
            commentary: result.commentary,
          };

          // Replace loading with intro + quick card (matches the mockup —
          // a quick captain text bubble before the card).
          removeMessage(loadingId);
          appendMessage({
            id: nextId('intro'),
            kind: 'captain-text',
            pose: 'tablet',
            text: `בדקתי את ${ticker} במים העמוקים 🌊 הנה הסיכום:`,
            ts: Date.now(),
          });
          appendMessage({ id: nextId('qc'), kind: 'quick-card', data: card, ts: Date.now() });
          recordAnalystQuickUsage();
          addQuickToHistory(card);
        } else {
          const deep = await fetchDeepAnalysis({
            ticker,
            companyName,
            exchange: 'NASDAQ',
            horizon,
            marketContext: { price, priceChangePct, currency: 'USD' },
          });
          const safeDeep: StockAnalysisDeep = { ...deep, ticker, companyName, horizon };
          // Deep mode defers the card reveal so the "הניתוח מוכן" toast can
          // surface first — the user might be mid-game in `WaitGameOverlay`.
          // Reveal flow: `revealPendingDeepCard()` removes the loading bubble
          // AND appends the deep card in one atomic store update. The intro
          // captain-text bubble piggybacks on the reveal to feel coherent.
          const deepCardMsg: AnalystMessage = {
            id: nextId('dc'),
            kind: 'deep-card',
            data: safeDeep,
            ts: Date.now(),
          };
          setPendingDeepCard(deepCardMsg, loadingId);
          recordAnalystDeepUsage();
          addDeepToHistory(safeDeep);
          deepPending = true;
        }

        // 4. Optional portfolio context card — appended only for quick mode.
        //    For deep mode the deep-card is still pending behind the toast;
        //    revealing the deep card later is enough surface for context.
        if (!deepPending) {
          const positions = useTradingStore.getState().positions;
          const ctx = buildPortfolioContext(positions);
          if (ctx) {
            appendMessage({ id: nextId('pc'), kind: 'portfolio-context', data: ctx, ts: Date.now() });
          }
        }

        return { ok: true };
      } catch (err) {
        removeMessage(loadingId);
        // Display Captain Shark's voice, never the raw "deep analysis
        // failed (500): {...}" pattern that leaks api-key / SDK details
        // to the user. The raw message still goes to the analytics /
        // console as captured by the original error object below if we
        // ever decide to log it.
        const message = toSharkVoiceError(err);
        appendMessage({ id: nextId('e'), kind: 'error', text: message, ts: Date.now() });
        setError(message);
        return { ok: false, reason: 'error', message };
      } finally {
        // Deep success keeps loading true until the user reveals; everything
        // else (quick success / errors / gate-skips-don't-reach-here) clears.
        if (!deepPending) setLoading(false);
      }
    },
    [
      mode,
      horizon,
      canUseAnalystQuick,
      canUseAnalystDeep,
      recordAnalystQuickUsage,
      recordAnalystDeepUsage,
      appendMessage,
      removeMessage,
      setLoading,
      setError,
      setPendingDeepCard,
      addQuickToHistory,
      addDeepToHistory,
    ],
  );

  return { submit };
}
