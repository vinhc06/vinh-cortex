const username = "vinhc06";
const githubApi = "https://api.github.com";
const windowDays = 30;
const dayMs = 24 * 60 * 60 * 1000;
export const telemetryCacheMs = 10 * 60 * 1000;

export interface GitHubTelemetry {
  profile: { login: string; name: string | null; url: string; publicRepos: number };
  totalRecentCommits: number;
  commitCountComplete: boolean;
  activeRepos: number;
  lastPushAt: string | null;
  lastActiveRepo: string | null;
  windowDays: number;
}

export interface TelemetrySnapshot {
  github: GitHubTelemetry | null;
  fetchedAt: string | null;
  stale: boolean;
}

export function offlineTelemetry(previous?: TelemetrySnapshot): TelemetrySnapshot {
  return {
    github: previous?.github ?? null,
    fetchedAt: previous?.fetchedAt ?? null,
    stale: Boolean(previous?.github),
  };
}

interface GitHubProfile {
  login: string;
  name: string | null;
  html_url: string;
  public_repos: number;
}

interface GitHubEvent {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: { before?: string; head?: string; size?: number; commits?: unknown[] };
}

interface PublicRepository {
  name: string;
  pushedAt: string | null;
}

interface ContributionQuery {
  errors?: unknown[];
  data?: {
    user: {
      login: string;
      name: string | null;
      url: string;
      contributionsCollection: {
        totalCommitContributions: number;
        restrictedContributionsCount: number;
      };
      repositories: { totalCount: number; nodes: Array<PublicRepository | null> | null };
    } | null;
  };
}

const sha = /^[a-f0-9]{40}$/i;
const zeroSha = "0".repeat(40);
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "vinh-cortex-telemetry",
  "X-GitHub-Api-Version": "2026-03-10",
};

function publicRepoActivity(repositories: Array<PublicRepository | null>, cutoff: number) {
  let activeRepos = 0;
  let latest: PublicRepository | undefined;
  let latestTime = -Infinity;
  for (const repo of repositories) {
    if (!repo?.pushedAt) continue;
    const pushed = Date.parse(repo.pushedAt);
    if (pushed >= cutoff) activeRepos++;
    if (pushed > latestTime) {
      latest = repo;
      latestTime = pushed;
    }
  }
  return {
    activeRepos,
    lastPushAt: latest?.pushedAt ?? null,
    lastActiveRepo: latest?.name ?? null,
  };
}

async function authenticatedActivity(token: string, now: Date, cutoff: number, signal: AbortSignal): Promise<GitHubTelemetry> {
  const response = await fetch(githubApi + "/graphql", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: `query CortexTelemetry($thirtyDaysAgoIso: DateTime!, $nowIso: DateTime!) {
        user(login: "vinhc06") {
          login
          name
          url
          contributionsCollection(from: $thirtyDaysAgoIso, to: $nowIso) {
            totalCommitContributions
            totalPullRequestContributions
            restrictedContributionsCount
            contributionCalendar { totalContributions }
          }
          repositories(first: 10, orderBy: { field: PUSHED_AT, direction: DESC }, privacy: PUBLIC) {
            totalCount
            nodes { name pushedAt }
          }
        }
      }`,
      variables: { thirtyDaysAgoIso: new Date(cutoff).toISOString(), nowIso: now.toISOString() },
    }),
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub GraphQL request failed (${response.status})`);
  const { data, errors } = await response.json() as ContributionQuery;
  const user = data?.user;
  if (errors?.length || !user) throw new Error("GitHub GraphQL returned no usable contribution data");

  const { totalCommitContributions, restrictedContributionsCount } = user.contributionsCollection;
  return {
    profile: { login: user.login, name: user.name, url: user.url, publicRepos: user.repositories.totalCount },
    totalRecentCommits: totalCommitContributions + restrictedContributionsCount,
    commitCountComplete: true,
    ...publicRepoActivity(user.repositories.nodes ?? [], cutoff),
    windowDays,
  };
}

async function publicActivity(cutoff: number, signal: AbortSignal): Promise<GitHubTelemetry> {
  async function github<T>(path: string): Promise<T> {
    const response = await fetch(githubApi + path, { headers, signal, cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
    return response.json() as Promise<T>;
  }

  async function recentPushes() {
    const pushes: GitHubEvent[] = [];
    let eventWindowComplete = false;
    // GitHub caps the public event timeline at 300 events.
    for (let page = 1; page <= 3; page++) {
      const events = await github<GitHubEvent[]>(`/users/${username}/events/public?per_page=100&page=${page}`);
      pushes.push(...events.filter((event) => event.type === "PushEvent" && Date.parse(event.created_at) >= cutoff));
      if (events.length < 100 || events.some((event) => Date.parse(event.created_at) < cutoff)) {
        eventWindowComplete = true;
        break;
      }
    }
    return { pushes, eventWindowComplete };
  }

  async function countPush({ payload, repo }: GitHubEvent): Promise<number | null> {
    if (typeof payload.size === "number" && Number.isSafeInteger(payload.size) && payload.size >= 0) return payload.size;
    const { before, head } = payload;
    if (head === zeroSha || (head && before === head)) return 0;

    if (before && head && before !== zeroSha && sha.test(before) && sha.test(head)) {
      const repository = repo.name.split("/").map(encodeURIComponent).join("/");
      try {
        const comparison = await github<{ total_commits: number }>(`/repos/${repository}/compare/${before}...${head}?per_page=1`);
        if (Number.isSafeInteger(comparison.total_commits) && comparison.total_commits >= 0) return comparison.total_commits;
      } catch {
        // Some ref comparisons become unavailable after a force-push or due to rate limits.
      }
    }
    return payload.commits?.length ?? null;
  }

  const [profile, { pushes, eventWindowComplete }, repositories] = await Promise.all([
    github<GitHubProfile>(`/users/${username}`),
    recentPushes(),
    github<Array<{ name: string; pushed_at: string | null }>>(`/users/${username}/repos?sort=pushed&per_page=10`),
  ]);
  let totalRecentCommits = 0;
  let commitCountComplete = eventWindowComplete;
  for (let index = 0; index < pushes.length; index += 5) {
    const counts = await Promise.all(pushes.slice(index, index + 5).map(countPush));
    for (const count of counts) {
      if (count === null) commitCountComplete = false;
      else totalRecentCommits += count;
    }
  }

  return {
    profile: { login: profile.login, name: profile.name, url: profile.html_url, publicRepos: profile.public_repos },
    totalRecentCommits,
    commitCountComplete,
    ...publicRepoActivity(repositories.map(({ name, pushed_at }) => ({ name, pushedAt: pushed_at })), cutoff),
    windowDays,
  };
}

export async function fetchTelemetry(token?: string): Promise<TelemetrySnapshot> {
  const fetchedAt = new Date();
  const cutoff = fetchedAt.getTime() - windowDays * dayMs;
  const signal = AbortSignal.timeout(8000);
  const github = token
    ? await authenticatedActivity(token, fetchedAt, cutoff, signal)
    : await publicActivity(cutoff, signal);
  return {
    github,
    fetchedAt: fetchedAt.toISOString(),
    stale: false,
  };
}
