/**
 * Typed JSON response helper. `Response.json` resolves to the undici-typed
 * `Response` under this project's tsconfig (undici-types leaks into the ambient
 * lib), which doesn't structurally match the global `Response` the handlers are
 * annotated with — the same clash behind ~239 of the repo's baseline tsc errors.
 * Normalizing the type here once keeps every call site contributing ZERO tsc
 * errors; the response is byte-identical to `Response.json(...)`.
 */
export function json(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init) as unknown as Response;
}
