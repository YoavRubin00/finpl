/**
 * Sanitize error responses — never leak internal details to the client,
 * but log enough server-side (with a short request id) that an operator
 * can grep the Vercel logs for it.
 */

/** Short request id — base36 timestamp + 4 random chars. Not crypto-grade,
 *  just enough for log correlation. Example: "lwgr8x9p-a7c4". */
function shortRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${ts}-${rand}`;
}

/** Log the real error server-side, return a generic message to the client.
 *  The reqId is returned in both the JSON body and the log line so the
 *  operator can paste it into Vercel's log search and find the offending
 *  stack trace within seconds. */
export function safeErrorResponse(err: unknown, context: string): Response {
  const reqId = shortRequestId();
  const realMessage = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  // Structured single-line log so it's greppable by reqId or context.
  console.error(`[${context}] reqId=${reqId} message=${JSON.stringify(realMessage)} stack=${stack ?? 'n/a'}`);

  return Response.json(
    {
      error: 'An unexpected error occurred. Please try again later.',
      reqId,
    },
    { status: 500 },
  );
}
