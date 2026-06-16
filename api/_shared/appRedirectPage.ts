/**
 * Email → app "smart redirect" interstitial.
 *
 * A raw HTTP 302 to a custom scheme (finpl://…) does NOT reliably open the app
 * when tapped from an email: browsers — especially Android / Gmail / webmail —
 * refuse to follow a server redirect to a non-http scheme, so the old
 * `res.redirect(302, 'finpl://learn')` left most tappers stuck (the "play" CTA
 * never opened the app). This tiny HTML page is served with 200 and, once
 * loaded in the browser, triggers the deep link via JS (which browsers DO allow
 * from a user-initiated page load) and falls back to the web/store after a short
 * delay if the app didn't take over.
 *
 * The proper long-term fix is Universal Links (iOS) + App Links (Android) so the
 * CTA can be a plain https link — that needs a native rebuild + AASA/assetlinks
 * hosting. This interstitial fixes the open-rate now, without a rebuild.
 */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function appRedirectHtml(deepLink: string, fallbackUrl: string): string {
  const deep = JSON.stringify(deepLink);
  const fb = JSON.stringify(fallbackUrl);
  return `<!DOCTYPE html>
<html dir="rtl" lang="he"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>פותחים את FinPlay…</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f0f9ff;color:#374151;text-align:center;padding:64px 20px;direction:rtl;">
  <h2 style="color:#0ea5e9;margin:0 0 12px;">פותחים את FinPlay…</h2>
  <p style="margin:0;font-size:15px;">אם האפליקציה לא נפתחת תוך רגע,
    <a href="${escapeAttr(fallbackUrl)}" style="color:#0ea5e9;font-weight:700;text-decoration:underline;">לחצו כאן</a>.</p>
  <script>
    (function () {
      var deep = ${deep}, fb = ${fb};
      // Trigger the app open from a real page load (browsers allow this).
      window.location.href = deep;
      // If we're still here ~1.5s later, the app didn't take over → fall back.
      setTimeout(function () { window.location.href = fb; }, 1500);
    })();
  </script>
</body></html>`;
}
