/**
 * Sanitize error responses, never leak internal details to the client.
 */

/** Log the real error server-side, return a generic message to the client. */
export function safeErrorResponse(err: unknown, context: string): Response {
  // Log full error server-side (visible in Vercel logs)
  const realMessage = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[${context}] ${realMessage}`, stack ?? '');

  // Return generic message to client, never leak internals
  return Response.json(
    { error: 'An unexpected error occurred. Please try again later.' },
    { status: 500 },
  );
}
