/**
 * Canonical site URL for metadata, sitemap, and JSON-LD.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://velosta.com).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    const withScheme = raw.startsWith("http") ? raw : `https://${raw}`;
    return withScheme.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }
  return "https://velosta.com";
}

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Velosta";
}
