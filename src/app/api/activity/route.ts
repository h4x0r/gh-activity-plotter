import { auth } from "@/auth";
import { binCommitsHourly, detectOnsetWindow } from "@/lib/activity";
import { audit } from "@/lib/audit";
import { fetchCommitEvents, getViewer } from "@/lib/github";
import { classifyPersona } from "@/lib/persona";

// Fetching a developer's commit history can take a few seconds; Fluid Compute
// gives us the headroom.
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let viewer, events, truncated, sinceDays, privateRepos;
  try {
    viewer = await getViewer(token);
    ({ events, truncated, sinceDays, privateRepos } = await fetchCommitEvents(
      token,
      viewer.login,
    ));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("activity: github fetch failed:", message);
    return Response.json(
      { error: "github_fetch_failed", detail: message },
      { status: 502 },
    );
  }

  if (events.length === 0) {
    return Response.json({
      viewer,
      empty: true,
      truncated: false,
      lookbackDays: sinceDays,
      start: 0,
      stepHours: 1,
      hours: 0,
      series: {},
      repos: [],
      window: { from: 0, to: 0 },
    });
  }

  const s = binCommitsHourly(events);
  const w = detectOnsetWindow(s);
  const totals = new Array<number>(s.hours).fill(0);
  for (const arr of Object.values(s.series)) {
    for (let i = 0; i < s.hours; i++) totals[i] += arr[i];
  }
  const persona = classifyPersona({
    start: s.start,
    stepHours: s.stepHours,
    total: totals,
  });
  audit({
    event: "activity",
    login: viewer.login,
    repos: Object.keys(s.series).length,
    commits: events.length,
    lookbackDays: sinceDays,
    truncated,
    persona: persona.persona,
  });
  const privateSet = new Set(privateRepos);
  const repos = Object.entries(s.totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total, private: privateSet.has(name) }));

  return Response.json({
    viewer,
    truncated,
    empty: false,
    persona,
    lookbackDays: sinceDays,
    start: s.start,
    stepHours: s.stepHours,
    hours: s.hours,
    series: s.series,
    repos,
    window: { from: w.from, to: w.to },
  });
}
