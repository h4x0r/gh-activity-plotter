/**
 * The render route renders by POSTing to the Python /api/render function. That
 * call must be SAME-ORIGIN as the incoming request — never the externally-facing
 * AUTH_URL. Coupling it to AUTH_URL once took down every server-side render: a
 * domain rename left AUTH_URL pointing at dead DNS, so the internal fetch hit a
 * host that no longer resolved and the route 500'd for every user. The request's
 * own origin is always reachable (the function lives on the same deployment) and
 * is immune to AUTH_URL / custom-domain drift.
 */
export function internalRenderUrl(requestUrl: string): string {
  return `${new URL(requestUrl).origin}/api/render`;
}
