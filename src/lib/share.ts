/**
 * Share-token codec for the /s/<token> page.
 *
 * A token packs the public Blob image URL + chart title so the share page can
 * set its Open Graph / Twitter card image without any database. decodeShare
 * hard-validates that the URL is an https Vercel Blob URL, so a crafted token
 * can't coerce the page into advertising an arbitrary og:image.
 */
export interface ShareData {
  /** Public Vercel Blob URL of the rendered chart PNG. */
  u: string;
  /** Chart title (used as the OG title). */
  t: string;
}

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;
const MAX_TITLE = 200;

export function encodeShare(d: ShareData): string {
  return Buffer.from(JSON.stringify(d)).toString("base64url");
}

export function decodeShare(token: string): ShareData | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    );
    if (typeof parsed !== "object" || parsed === null) return null;
    const { u, t } = parsed as Record<string, unknown>;
    if (typeof u !== "string" || typeof t !== "string") return null;
    const url = new URL(u);
    if (url.protocol !== "https:" || !BLOB_HOST.test(url.hostname)) return null;
    return { u, t: t.slice(0, MAX_TITLE) };
  } catch {
    return null;
  }
}
