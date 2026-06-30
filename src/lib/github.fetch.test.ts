import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards the repo-enumeration bound in fetchCommitEvents. The signed-in
 * activity fetch enumerates every repo the viewer is affiliated with
 * (owner + collaborator + every org). For an account in sizable orgs an
 * unbounded enumeration pulls thousands of repo objects into memory before any
 * cap applies, which crashes/OOMs the function (the browser then reports a bare
 * "Failed to fetch"). Enumeration must stop early — the repos are sorted
 * pushed-desc, so once we have enough recently-pushed repos there is nothing
 * newer left to find.
 */

// Hoisted so both the fake Octokit and the test body observe the same counter.
const oc = vi.hoisted(() => ({
  pagesPulled: 0,
  listCommitsCalls: 0,
  clock: 0,
  pages: [] as Array<Array<Record<string, unknown>>>,
}));

vi.mock("@octokit/rest", () => {
  const paginate = Object.assign(
    // collect-all form: walks EVERY page (the unbounded path)
    async () => {
      const all: unknown[] = [];
      for (const p of oc.pages) {
        oc.pagesPulled++;
        all.push(...p);
      }
      return all;
    },
    {
      // lazy form: yields a page at a time so the caller can stop early
      iterator: () =>
        (async function* () {
          for (const p of oc.pages) {
            oc.pagesPulled++;
            yield { data: p };
          }
        })(),
    },
  );
  return {
    Octokit: vi.fn(function () {
      return {
        rest: {
          repos: {
            listForAuthenticatedUser: () => undefined,
            listCommits: async () => {
              // each commit page "costs" simulated wall-clock time
              oc.listCommitsCalls++;
              oc.clock += 100;
              return { data: [] };
            },
          },
        },
        paginate,
      };
    }),
  };
});

const { fetchCommitEvents } = await import("./github");

function repoPage(count: number, pushedAt: string) {
  return Array.from({ length: count }, (_, i) => ({
    name: `repo${i}`,
    full_name: `me/repo${i}`,
    owner: { login: "me" },
    private: false,
    pushed_at: pushedAt,
  }));
}

describe("fetchCommitEvents — bounded repo enumeration", () => {
  beforeEach(() => {
    oc.pagesPulled = 0;
    oc.listCommitsCalls = 0;
    oc.clock = 0;
    oc.pages = [];
  });

  it("stops paging once it has enough recently-pushed repos", async () => {
    const now = new Date().toISOString();
    // 5 pages × 100 recent repos = 500 affiliated repos; only a few are needed.
    oc.pages = Array.from({ length: 5 }, () => repoPage(100, now));

    await fetchCommitEvents("token", "me", { maxRepos: 2, concurrency: 1 });

    // The first page alone yields far more than maxRepos recent repos, so a
    // bounded enumeration must not sweep all five pages into memory.
    expect(oc.pagesPulled).toBeLessThanOrEqual(2);
  });

  it("stops fetching commits when the wall-clock budget is exhausted", async () => {
    const now = new Date().toISOString();
    oc.pages = [repoPage(10, now)]; // 10 recent repos, all in one page

    // Each commit page advances the simulated clock by 100ms; a 150ms budget is
    // spent after a repo or two, so most repos must go unfetched and the result
    // must report itself truncated rather than running until the platform kills
    // the function (which surfaces as a bare "Failed to fetch" in the browser).
    const result = await fetchCommitEvents("token", "me", {
      concurrency: 1,
      budgetMs: 150,
      now: () => oc.clock,
    });

    expect(oc.listCommitsCalls).toBeLessThan(10);
    expect(result.truncated).toBe(true);
  });
});
