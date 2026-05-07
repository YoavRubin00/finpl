import type { ChartDataPoint, ChartMode, Timeframe } from './tradingHubTypes';

export interface ChartHtmlTheme {
  background: string;
  grid: string;
  text: string;
  upColor: string;
  downColor: string;
  lineColor: string;
  lineArea: string;
  ma: string;
  rsi: string;
  volumeUp: string;
  volumeDown: string;
}

// Soft, calm palette, pastel greens / corals / cyan to keep the trading screen
// feeling unhurried rather than aggressive. Saturation lowered vs. typical broker UIs.
export const DEFAULT_CHART_THEME: ChartHtmlTheme = {
  background: '#fbfdfe',
  grid: 'rgba(148,163,184,0.12)',
  text: '#7b8794',
  upColor: '#34d399',          // soft mint instead of saturated green
  downColor: '#fb7185',        // coral instead of harsh red
  lineColor: '#22d3ee',        // cyan-400, soft
  lineArea: 'rgba(34,211,238,0.16)',
  ma: '#2563eb',               // blue-600, clearly visible on light background
  rsi: '#c4b5fd',              // lilac, soft
  volumeUp: 'rgba(52,211,153,0.28)',
  volumeDown: 'rgba(251,113,133,0.28)',
};

interface BuildChartHtmlArgs {
  mode: ChartMode;
  data: ChartDataPoint[];
  timeframe: Timeframe;
  /** Period used for the moving-average line in advanced mode. */
  maPeriod: number;
  theme?: Partial<ChartHtmlTheme>;
}

/**
 * Builds the HTML document that runs inside the WebView (TradingView Lightweight Charts v4).
 * Data is serialized to JSON and injected, no postMessage bridge for the MVP.
 *
 * Modes:
 *  - simple   → area / line on close prices. Volume histogram at bottom. No overlay indicators.
 *  - advanced → candlesticks + volume + moving average (configurable period) + RSI sub-chart.
 */
export function buildChartHtml({ mode, data, timeframe, maPeriod, theme }: BuildChartHtmlArgs): string {
  const t = { ...DEFAULT_CHART_THEME, ...(theme ?? {}) };

  const filtered = data.filter(
    (d) =>
      typeof d.open === 'number' &&
      typeof d.high === 'number' &&
      typeof d.low === 'number' &&
      typeof d.close === 'number',
  );

  const candles = filtered.map((d) => ({
    time: Math.floor(d.timestamp / 1000),
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  }));

  const line = filtered.map((d) => ({
    time: Math.floor(d.timestamp / 1000),
    value: d.close as number,
  }));

  const volumes = data
    .filter((d) => typeof d.volume === 'number' && typeof d.close === 'number' && typeof d.open === 'number')
    .map((d) => ({
      time: Math.floor(d.timestamp / 1000),
      value: d.volume,
      color: (d.close as number) >= (d.open as number) ? t.volumeUp : t.volumeDown,
    }));

  // Indicators only render in advanced mode, on weekly data, when enough points exist.
  const showIndicators = mode === 'advanced' && timeframe === '1W' && candles.length >= Math.max(maPeriod, 15);

  let ma: Array<{ time: number; value: number }> = [];
  if (showIndicators) {
    const closes = candles.map((c) => c.close as number);
    for (let i = maPeriod - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = i - (maPeriod - 1); j <= i; j++) sum += closes[j];
      ma.push({ time: candles[i].time, value: sum / maPeriod });
    }
  }

  // RSI (14-period), Wilder's smoothing.
  let rsi: Array<{ time: number; value: number }> = [];
  if (showIndicators) {
    const closes = candles.map((c) => c.close as number);
    const period = 14;
    if (closes.length > period) {
      let gainSum = 0;
      let lossSum = 0;
      for (let i = 1; i <= period; i++) {
        const delta = closes[i] - closes[i - 1];
        if (delta >= 0) gainSum += delta;
        else lossSum -= delta;
      }
      let avgGain = gainSum / period;
      let avgLoss = lossSum / period;
      const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push({ time: candles[period].time, value: 100 - 100 / (1 + rs0) });
      for (let i = period + 1; i < closes.length; i++) {
        const delta = closes[i] - closes[i - 1];
        const gain = delta >= 0 ? delta : 0;
        const loss = delta < 0 ? -delta : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
      }
    }
  }

  const payload = {
    mode,
    candles,
    line,
    volumes,
    ma,
    rsi,
    showIndicators,
    theme: t,
  };

  const payloadJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<style>
  html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; background: ${t.background}; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; overflow: hidden; }
  #root { display: flex; flex-direction: column; }
  .pane-main { flex: 1 1 auto; min-height: 0; }
  .pane-rsi { flex: 0 0 88px; border-top: 1px solid ${t.grid}; }
</style>
</head>
<body>
<div id="root">
  <div id="main" class="pane-main"></div>
  <div id="rsi" class="pane-rsi" style="display:none;"></div>
</div>
<script src="https://unpkg.com/lightweight-charts@4.2.2/dist/lightweight-charts.standalone.production.js"></script>
<script>
(function() {
  var payload = ${payloadJson};
  var t = payload.theme;

  var commonOptions = {
    // attributionLogo: false hides the "TV" watermark that Lightweight Charts v4 renders
    // by default. Since our data comes from Yahoo (not TradingView), keeping the logo
    // would be misleading branding.
    layout: { background: { color: t.background }, textColor: t.text, fontSize: 11, attributionLogo: false },
    grid: { vertLines: { color: t.grid }, horzLines: { color: t.grid } },
    rightPriceScale: { borderColor: t.grid },
    // 1D timeframe = daily candles (over a month), 1W timeframe = weekly candles (over 6 months).
    // Both deal in date-level granularity, showing time-of-day on the axis is misleading
    // (every candle's timestamp is just midnight UTC of its day).
    timeScale: { borderColor: t.grid, timeVisible: false, secondsVisible: false },
    crosshair: { mode: 1 },
    handleScroll: false,
    handleScale: false,
  };

  var mainEl = document.getElementById('main');
  var rsiEl = document.getElementById('rsi');

  // Defer initial sizing to after the browser has done its first layout pass —
  // otherwise mainEl.clientHeight can be 0 inside a freshly-mounted WebView,
  // which makes Lightweight Charts render into a tiny strip on one side.
  function start() {
    var mainChart = LightweightCharts.createChart(mainEl, Object.assign({}, commonOptions, {
      width: mainEl.clientWidth || 320,
      height: mainEl.clientHeight || 280,
    }));

    if (payload.mode === 'simple') {
      var areaSeries = mainChart.addAreaSeries({
        lineColor: t.lineColor,
        topColor: t.lineArea,
        bottomColor: 'rgba(2,132,199,0)',
        lineWidth: 2,
        priceLineVisible: false,
      });
      areaSeries.setData(payload.line);
    } else {
      var candleSeries = mainChart.addCandlestickSeries({
        upColor: t.upColor,
        downColor: t.downColor,
        // Slightly darker borders give the soft pastel candles enough edge contrast
        // to read on the near-white background without looking aggressive.
        borderUpColor: '#059669',
        borderDownColor: '#e11d48',
        wickUpColor: '#059669',
        wickDownColor: '#e11d48',
      });
      candleSeries.setData(payload.candles);
    }

    // Make room at the bottom for the volume histogram so candles aren't
    // squeezed against the time axis.
    mainChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.08, bottom: 0.22 } });

    var volumeSeries = mainChart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    mainChart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volumeSeries.setData(payload.volumes);

    var rsiChart = null;
    if (payload.showIndicators) {
      var maSeries = mainChart.addLineSeries({
        color: t.ma,
        lineWidth: 3,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      maSeries.setData(payload.ma);

      rsiEl.style.display = 'block';
      rsiChart = LightweightCharts.createChart(rsiEl, Object.assign({}, commonOptions, {
        width: rsiEl.clientWidth || 320,
        height: rsiEl.clientHeight || 88,
        timeScale: Object.assign({}, commonOptions.timeScale, { visible: false }),
      }));
      var rsiSeries = rsiChart.addLineSeries({
        color: t.rsi,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      rsiSeries.setData(payload.rsi);
      rsiSeries.createPriceLine({ price: 70, color: t.downColor, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: '70' });
      rsiSeries.createPriceLine({ price: 30, color: t.upColor, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: '30' });
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(function(range) {
        if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    function fit() {
      mainChart.applyOptions({ width: mainEl.clientWidth, height: mainEl.clientHeight });
      if (rsiChart) {
        rsiChart.applyOptions({ width: rsiEl.clientWidth, height: rsiEl.clientHeight });
      }
      mainChart.timeScale().fitContent();
    }

    fit();
    // A second pass on the next frame catches the case where the body's height
    // grew between createChart() and now (common in WebViews on Android).
    requestAnimationFrame(fit);
    setTimeout(fit, 120);

    // ResizeObserver covers all later layout changes (rotation, keyboard, etc).
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function() { fit(); });
      ro.observe(mainEl);
      if (rsiEl) ro.observe(rsiEl);
    } else {
      window.addEventListener('resize', fit);
    }

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }
  }

  if (document.readyState === 'complete') {
    requestAnimationFrame(start);
  } else {
    window.addEventListener('load', function() { requestAnimationFrame(start); });
  }
})();
</script>
</body>
</html>`;
}
