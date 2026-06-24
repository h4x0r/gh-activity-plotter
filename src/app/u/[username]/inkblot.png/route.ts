import {
  binCommitsHourly,
  decodeRepoMask,
  defaultRepoSelection,
  detectOnsetWindow,
  parseChartParams,
} from "@/lib/activity";
import { audit } from "@/lib/audit";
import { fetchPublicActivity, isValidGitHubUsername } from "@/lib/github";
import { classifyPersona } from "@/lib/persona";

export const maxDuration = 60;

// On-demand render; cache hard at the edge so repeat/profile-README hits are
// instant and only the cold render is slow. Regenerable — never stored.
const CACHE = "public, s-maxage=21600, stale-while-revalidate=86400";
const HOUR_MS = 3_600_000;

function appOrigin(req: Request): string {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/+$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

type Params = { params: Promise<{ username: string }> };

export async function GET(req: Request, { params }: Params) {
  const { username } = await params;
  if (!isValidGitHubUsername(username)) {
    return new Response("invalid username", { status: 400 });
  }

  let act;
  try {
    act = await fetchPublicActivity(username);
  } catch {
    return new Response("user not found", { status: 404 });
  }

  let payload: Record<string, unknown>;
  let personaName = "none";
  if (act.events.length === 0) {
    // never break a README image — render a clear placeholder
    payload = {
      start: Date.now() - 7 * 24 * HOUR_MS,
      step_hours: 24,
      series: { " ": [1, 1, 1, 1, 1, 1, 1] },
      title: `${act.viewer.login} — no public commits in the last year`,
      subtitle: "sign in at the app to include private repos",
      avatar_url: act.viewer.avatarUrl ?? undefined,
    };
  } else {
    const s = binCommitsHourly(act.events);
    const w = detectOnsetWindow(s);
    const total = new Array<number>(s.hours).fill(0);
    for (const arr of Object.values(s.series)) {
      for (let i = 0; i < s.hours; i++) total[i] += arr[i];
    }
    const persona = classifyPersona({ start: s.start, stepHours: s.stepHours, total });
    personaName = persona.persona;

    // URL state: from/to window + repo bitmask; default-select when omitted
    const { from, to, reposMask } = parseChartParams(new URL(req.url).searchParams);
    const sortedNames = Object.keys(s.totals).sort();
    const selected = reposMask
      ? decodeRepoMask(sortedNames, reposMask)
      : defaultRepoSelection(
          Object.entries(s.totals).map(([name, t]) => ({ name, total: t })),
        );

    payload = {
      start: s.start,
      step_hours: s.stepHours,
      series: s.series,
      selected,
      window: [from ?? w.from, to ?? w.to],
      title: `${act.viewer.login}'s GitHub Activity History`,
      subtitle: `${persona.persona} · ${persona.superlative}`,
      persona_emoji: persona.emoji,
      avatar_url: act.viewer.avatarUrl ?? undefined,
    };
  }

  audit({
    event: "public_render",
    username,
    commits: act.events.length,
    persona: personaName,
    truncated: act.truncated,
  });

  const res = await fetch(`${appOrigin(req)}/api/render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`u/${username}/inkblot.png: render failed (${res.status})`);
    return new Response("render failed", { status: 502 });
  }

  return new Response(await res.arrayBuffer(), {
    headers: { "content-type": "image/png", "cache-control": CACHE },
  });
}
