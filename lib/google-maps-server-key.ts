/**
 * Google Maps / Places key for Next.js Route Handlers (server-only).
 *
 * Prefer `GOOGLE_MAPS_KEY` — never prefixed with NEXT_PUBLIC_* in production so
 * the key stays off the client bundle.
 *
 * Local dev historically used only `NEXT_PUBLIC_GOOGLE_MAPS_KEY`; without a
 * server key, `/api/places/*` routes return empty and autocomplete “breaks”.
 */
export function getGoogleMapsServerKey(): string {
  const server = process.env.GOOGLE_MAPS_KEY?.trim();
  if (server) return server;
  if (process.env.NODE_ENV === "development") {
    const legacy = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim();
    if (legacy) return legacy;
  }
  return "";
}
