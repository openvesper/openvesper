// ============================================================
// 🛸 Terminal of UFO — GitHub Automation Tool (v2)
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

const BASE = "https://api.github.com";

function h(): Record<string, string> {
  const t = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "TerminalOfUFO/2.0",
    ...(t ? { Authorization: `token ${t}` } : {}),
  };
}

// ── User ──────────────────────────────────────────────────────────────────────

export async function getUserProfile(username: string): Promise<ToolResult> {
  try {
    const [uR, evR, repoR] = await Promise.allSettled([
      axios.get(`${BASE}/users/${username}`, { headers: h(), timeout: 10000 }),
      axios.get(`${BASE}/users/${username}/events/public`, { headers: h(), params: { per_page: 30 }, timeout: 10000 }),
      axios.get(`${BASE}/users/${username}/repos`, { headers: h(), params: { sort: "updated", per_page: 6, type: "public" }, timeout: 10000 }),
    ]);

    if (uR.status === "rejected") return { success: false, error: "User not found" };
    const u = uR.value.data;

    const events = evR.status === "fulfilled"
      ? evR.value.data.slice(0, 10).map((e: { type: string; repo: { name: string }; created_at: string }) => ({
          type: e.type?.replace("Event", ""),
          repo: e.repo.name,
          date: new Date(e.created_at).toLocaleDateString(),
        }))
      : [];

    const topRepos = repoR.status === "fulfilled"
      ? repoR.value.data.slice(0, 5).map((r: { name: string; stargazers_count: number; language: string; description: string }) => ({
          name: r.name,
          stars: r.stargazers_count,
          language: r.language,
          description: r.description?.slice(0, 80),
        }))
      : [];

    // Estimate commit streak from events
    const pushEvents = evR.status === "fulfilled"
      ? evR.value.data.filter((e: { type: string }) => e.type === "PushEvent").length
      : 0;

    return {
      success: true,
      data: {
        login: u.login, name: u.name, bio: u.bio,
        company: u.company, location: u.location,
        blog: u.blog, email: u.email,
        publicRepos: u.public_repos,
        followers: u.followers, following: u.following,
        createdAt: u.created_at?.split("T")[0],
        avatarUrl: u.avatar_url, profileUrl: u.html_url,
        hireable: u.hireable,
        recentActivity: events,
        topRepos,
        recentPushes: pushEvents,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Profile: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getUserRepos(username: string, sort: "updated" | "stars" | "created" = "updated", limit = 10): Promise<ToolResult> {
  try {
    const r = await axios.get(`${BASE}/users/${username}/repos`, {
      headers: h(),
      params: { sort, direction: "desc", per_page: limit, type: "public" },
      timeout: 10000,
    });
    return {
      success: true,
      data: r.data.map((repo: {
        name: string; full_name: string; description: string | null;
        html_url: string; stargazers_count: number; forks_count: number;
        language: string | null; updated_at: string; open_issues_count: number;
        topics: string[]; license: { name: string } | null; size: number;
      }) => ({
        name: repo.name, fullName: repo.full_name,
        description: repo.description, url: repo.html_url,
        stars: repo.stargazers_count, forks: repo.forks_count,
        language: repo.language, updatedAt: repo.updated_at?.split("T")[0],
        openIssues: repo.open_issues_count, topics: repo.topics?.slice(0, 5),
        license: repo.license?.name, size: `${(repo.size / 1024).toFixed(1)}MB`,
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: `Repos: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Repo ──────────────────────────────────────────────────────────────────────

export async function getRepoDetails(owner: string, repo: string): Promise<ToolResult> {
  try {
    const [rR, cR, lR, relR, commitR] = await Promise.allSettled([
      axios.get(`${BASE}/repos/${owner}/${repo}`, { headers: h(), timeout: 10000 }),
      axios.get(`${BASE}/repos/${owner}/${repo}/contributors`, { headers: h(), params: { per_page: 8 }, timeout: 10000 }),
      axios.get(`${BASE}/repos/${owner}/${repo}/languages`, { headers: h(), timeout: 10000 }),
      axios.get(`${BASE}/repos/${owner}/${repo}/releases`, { headers: h(), params: { per_page: 5 }, timeout: 10000 }),
      axios.get(`${BASE}/repos/${owner}/${repo}/commits`, { headers: h(), params: { per_page: 5 }, timeout: 10000 }),
    ]);

    if (rR.status === "rejected") return { success: false, error: "Repository not found" };
    const rd = rR.value.data;

    const contributors = cR.status === "fulfilled"
      ? cR.value.data.map((c: { login: string; contributions: number }) => ({
          login: c.login, contributions: c.contributions,
        }))
      : [];

    const languages = lR.status === "fulfilled" ? lR.value.data : {};
    const totalBytes = Object.values(languages).reduce((a: number, b) => a + (b as number), 0);
    const langPct: Record<string, string> = {};
    Object.entries(languages).forEach(([lang, bytes]) => {
      langPct[lang] = ((bytes as number / totalBytes) * 100).toFixed(1) + "%";
    });

    const releases = relR.status === "fulfilled"
      ? relR.value.data.map((r: { tag_name: string; name: string; published_at: string; html_url: string; prerelease: boolean }) => ({
          tag: r.tag_name, name: r.name,
          publishedAt: r.published_at?.split("T")[0],
          url: r.html_url, prerelease: r.prerelease,
        }))
      : [];

    const recentCommits = commitR.status === "fulfilled"
      ? commitR.value.data.map((c: { sha: string; commit: { message: string; author: { name: string; date: string } }; author: { login: string } | null }) => ({
          sha: c.sha?.slice(0, 7),
          message: c.commit.message?.split("\n")[0]?.slice(0, 72),
          author: c.author?.login || c.commit.author?.name,
          date: c.commit.author?.date?.split("T")[0],
        }))
      : [];

    return {
      success: true,
      data: {
        name: rd.name, fullName: rd.full_name,
        description: rd.description, url: rd.html_url,
        stars: rd.stargazers_count, forks: rd.forks_count,
        watchers: rd.watchers_count, openIssues: rd.open_issues_count,
        language: rd.language, license: rd.license?.name || "None",
        createdAt: rd.created_at?.split("T")[0],
        updatedAt: rd.updated_at?.split("T")[0],
        pushedAt: rd.pushed_at?.split("T")[0],
        size: `${(rd.size / 1024).toFixed(1)}MB`,
        defaultBranch: rd.default_branch,
        topics: rd.topics,
        isArchived: rd.archived, isFork: rd.fork,
        hasWiki: rd.has_wiki, hasDiscussions: rd.has_discussions,
        contributors, languages: langPct, releases, recentCommits,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Repo details: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getRepoIssues(owner: string, repo: string, state: "open" | "closed" | "all" = "open", limit = 10): Promise<ToolResult> {
  try {
    const r = await axios.get(`${BASE}/repos/${owner}/${repo}/issues`, {
      headers: h(),
      params: { state, per_page: limit, direction: "desc" },
      timeout: 10000,
    });

    return {
      success: true,
      data: r.data.filter((i: { pull_request?: unknown }) => !i.pull_request).map((i: {
        number: number; title: string; state: string; html_url: string;
        created_at: string; user: { login: string };
        labels: Array<{ name: string }>; comments: number; body: string | null;
      }) => ({
        number: i.number, title: i.title, state: i.state,
        url: i.html_url, createdAt: i.created_at?.split("T")[0],
        author: i.user.login,
        labels: i.labels.map((l) => l.name),
        comments: i.comments,
        body: i.body?.slice(0, 200),
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: `Issues: ${e instanceof Error ? e.message : e}` };
  }
}

export async function createIssue(owner: string, repo: string, title: string, body: string, labels: string[] = []): Promise<ToolResult> {
  if (!process.env.GITHUB_TOKEN) return { success: false, error: "GITHUB_TOKEN required to create issues" };
  try {
    const r = await axios.post(`${BASE}/repos/${owner}/${repo}/issues`, { title, body, labels }, { headers: h(), timeout: 10000 });
    return {
      success: true,
      data: { number: r.data.number, title: r.data.title, url: r.data.html_url, state: r.data.state },
    };
  } catch (e: unknown) {
    return { success: false, error: `Create issue: ${e instanceof Error ? e.message : e}` };
  }
}

export async function searchGitHubRepos(query: string, language?: string, sortBy: "stars" | "updated" | "forks" = "stars", limit = 10): Promise<ToolResult> {
  try {
    const q = language ? `${query} language:${language}` : query;
    const r = await axios.get(`${BASE}/search/repositories`, {
      headers: h(),
      params: { q, sort: sortBy, order: "desc", per_page: limit },
      timeout: 10000,
    });
    return {
      success: true,
      data: {
        total: r.data.total_count,
        repos: r.data.items.map((repo: {
          name: string; full_name: string; description: string | null;
          html_url: string; stargazers_count: number; forks_count: number;
          language: string | null; updated_at: string; topics: string[];
          license: { name: string } | null;
        }) => ({
          name: repo.name, fullName: repo.full_name,
          description: repo.description?.slice(0, 100),
          url: repo.html_url, stars: repo.stargazers_count,
          forks: repo.forks_count, language: repo.language,
          updatedAt: repo.updated_at?.split("T")[0],
          topics: repo.topics?.slice(0, 4),
          license: repo.license?.name,
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Search: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getRepoPRs(owner: string, repo: string, state: "open" | "closed" | "all" = "open", limit = 10): Promise<ToolResult> {
  try {
    const r = await axios.get(`${BASE}/repos/${owner}/${repo}/pulls`, {
      headers: h(),
      params: { state, per_page: limit, direction: "desc" },
      timeout: 10000,
    });
    return {
      success: true,
      data: r.data.map((p: {
        number: number; title: string; state: string; html_url: string;
        user: { login: string }; created_at: string; merged_at: string | null;
        labels: Array<{ name: string }>; draft: boolean;
      }) => ({
        number: p.number, title: p.title, state: p.state,
        url: p.html_url, author: p.user.login,
        createdAt: p.created_at?.split("T")[0],
        mergedAt: p.merged_at?.split("T")[0],
        labels: p.labels.map((l) => l.name),
        draft: p.draft,
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: `PRs: ${e instanceof Error ? e.message : e}` };
  }
}

export async function compareRepos(repoList: string[]): Promise<ToolResult> {
  try {
    const results = await Promise.allSettled(
      repoList.map((r) => {
        const [owner, repo] = r.split("/");
        return getRepoDetails(owner, repo);
      })
    );
    const data = results
      .filter((r) => r.status === "fulfilled" && r.value.success)
      .map((r) => (r as PromiseFulfilledResult<ToolResult>).value.data);
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: `Compare: ${e instanceof Error ? e.message : e}` };
  }
}
