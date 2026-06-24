import { del, list } from "@vercel/blob";

export const maxDuration = 60;

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Daily cleanup: delete shared chart blobs older than the TTL so shares expire
 * and storage doesn't grow unbounded. Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`; reject anything else.
 */
export async function GET(req: Request) {
  if (
    process.env.CRON_SECRET &&
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("unauthorized", { status: 401 });
  }

  const cutoff = Date.now() - TTL_MS;
  let cursor: string | undefined;
  let deleted = 0;
  do {
    const res = await list({ prefix: "charts/", cursor, limit: 1000 });
    const stale = res.blobs
      .filter((b) => new Date(b.uploadedAt).getTime() < cutoff)
      .map((b) => b.url);
    if (stale.length) {
      await del(stale);
      deleted += stale.length;
    }
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);

  // eslint-disable-next-line no-console -- cron observability
  console.log(`cleanup-shares: deleted ${deleted} expired chart(s)`);
  return Response.json({ deleted });
}
