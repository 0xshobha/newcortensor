/**
 * GitHubMonitorAgent – watches Cortensor repos and summarizes with Cortensor
 *
 * Improvements:
 *  - Deduplication of issues vs PRs (GitHub returns PRs in issues endpoint)
 *  - GitHub rate limit detection + warning log
 *  - Urgency classification: bug/critical labels → urgent flag
 *  - Labels and PR merge status exposed
 *  - Repo fetch cap to avoid GitHub rate-limit burn
 */

import { callCortensor } from "../cortensor";
import { appendLog } from "../db";

export interface GitHubSummaryOutput {
    recentPRs: PRItem[];
    recentIssues: IssueItem[];
    summary: string;
    urgentItems: string[];
    cortensorAnalysis: string;
    reposMonitored: string[];
    rateLimited: boolean;
}

export interface PRItem {
    number: number;
    title: string;
    state: "open" | "closed" | "merged";
    author: string;
    url: string;
    updatedAt: string;
    draft?: boolean;
}

export interface IssueItem {
    number: number;
    title: string;
    state: "open" | "closed";
    author: string;
    url: string;
    labels: string[];
    updatedAt: string;
    urgent: boolean;
}

const REPOS = ["community-projects", "cortensor-node", "docs"];
const URGENT_LABELS = new Set(["bug", "critical", "blocker", "P0", "P1", "security"]);

// ──────────────────────────────────────────────
// GitHub API helpers
// ──────────────────────────────────────────────
interface RawGHPR {
    number: number;
    title: string;
    state: string;
    draft?: boolean;
    merged_at?: string | null;
    user: { login: string };
    html_url: string;
    updated_at: string;
}

interface RawGHIssue {
    number: number;
    title: string;
    state: string;
    user: { login: string };
    html_url: string;
    labels: { name: string }[];
    updated_at: string;
    pull_request?: unknown;
}

function mapPR(pr: RawGHPR): PRItem {
    return {
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? "merged" : pr.state === "open" ? "open" : "closed",
        author: pr.user?.login ?? "unknown",
        url: pr.html_url,
        updatedAt: pr.updated_at,
        draft: pr.draft ?? false,
    };
}

function mapIssue(issue: RawGHIssue): IssueItem {
    const labels = issue.labels?.map((l) => l.name) ?? [];
    return {
        number: issue.number,
        title: issue.title,
        state: issue.state === "open" ? "open" : "closed",
        author: issue.user?.login ?? "unknown",
        url: issue.html_url,
        labels,
        updatedAt: issue.updated_at,
        urgent: labels.some((l) => URGENT_LABELS.has(l)),
    };
}

async function fetchGitHubData(org: string): Promise<{
    prs: PRItem[];
    issues: IssueItem[];
    rateLimited: boolean;
}> {
    const token = process.env.GITHUB_TOKEN;

    // Mock mode: explicit env var, on Vercel without real router, or no token
    const isMockMode =
        process.env.MOCK_CORTENSOR === "true" ||
        (process.env.VERCEL === "1" && !process.env.CORTENSOR_ROUTER_URL) ||
        !token;

    if (isMockMode) {
        return {
            prs: [
                {
                    number: 47,
                    title: "feat: add CAOH multi-agent orchestrator",
                    state: "open",
                    author: "0xshobha",
                    url: `https://github.com/${org}/community-projects/pull/47`,
                    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
                    draft: false,
                },
                {
                    number: 46,
                    title: "fix: router timeout handling in v0.4.2",
                    state: "merged",
                    author: "cortensor-dev",
                    url: `https://github.com/${org}/cortensor-node/pull/46`,
                    updatedAt: new Date(Date.now() - 7_200_000).toISOString(),
                },
                {
                    number: 45,
                    title: "chore: update dependencies & lockfile",
                    state: "closed",
                    author: "bot-ci",
                    url: `https://github.com/${org}/cortensor-node/pull/45`,
                    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
                },
            ],
            issues: [
                {
                    number: 123,
                    title: "Session ID validation fails on testnet restart",
                    state: "open",
                    author: "builder_xyz",
                    url: `https://github.com/${org}/community-projects/issues/123`,
                    labels: ["bug", "testnet"],
                    updatedAt: new Date(Date.now() - 1_800_000).toISOString(),
                    urgent: true,
                },
                {
                    number: 122,
                    title: "Add PoI metadata to API response docs",
                    state: "open",
                    author: "community-member",
                    url: `https://github.com/${org}/docs/issues/122`,
                    labels: ["documentation", "enhancement"],
                    updatedAt: new Date(Date.now() - 5_400_000).toISOString(),
                    urgent: false,
                },
            ],
            rateLimited: false,
        };
    }

    const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "caoh-agent/1.0",
    };

    const allPRs: PRItem[] = [];
    const allIssues: IssueItem[] = [];
    let rateLimited = false;

    for (const repo of REPOS) {
        const [prsRes, issuesRes] = await Promise.allSettled([
            fetch(
                `https://api.github.com/repos/${org}/${repo}/pulls?state=all&per_page=5&sort=updated`,
                { headers, signal: AbortSignal.timeout(8_000) }
            ),
            fetch(
                `https://api.github.com/repos/${org}/${repo}/issues?state=open&per_page=5&sort=updated`,
                { headers, signal: AbortSignal.timeout(8_000) }
            ),
        ]);

        for (const settled of [prsRes, issuesRes]) {
            if (settled.status === "fulfilled" && settled.value.status === 429) {
                rateLimited = true;
            }
        }

        if (prsRes.status === "fulfilled" && prsRes.value.ok) {
            const prs: RawGHPR[] = await prsRes.value.json().catch(() => []);
            allPRs.push(...prs.map(mapPR));
        }

        if (issuesRes.status === "fulfilled" && issuesRes.value.ok) {
            const issues: RawGHIssue[] = await issuesRes.value.json().catch(() => []);
            // Filter out PRs (GitHub returns PRs in the issues endpoint)
            allIssues.push(...issues.filter((i) => !i.pull_request).map(mapIssue));
        }
    }

    return {
        prs: allPRs.slice(0, 10),
        issues: allIssues.slice(0, 10),
        rateLimited,
    };
}

// ──────────────────────────────────────────────
// Agent function
// ──────────────────────────────────────────────
export async function runGitHubMonitorAgent(
    taskId: string
): Promise<GitHubSummaryOutput> {
    const org = process.env.GITHUB_ORG || "cortensor";

    const log = (msg: string, level: "info" | "warn" | "error" = "info") =>
        appendLog({
            task_id: taskId,
            agent_name: "GitHubMonitorAgent",
            message: msg,
            timestamp: new Date().toISOString(),
            level,
        });

    log(`📦 GitHubMonitorAgent activated. Monitoring org: ${org}`);

    const { prs, issues, rateLimited } = await fetchGitHubData(org);

    if (rateLimited) {
        log("⚠️ GitHub API rate limit hit. Results may be incomplete.", "warn");
    }

    const urgentIssues = issues.filter((i) => i.urgent);
    log(
        `🔍 Found ${prs.length} PRs, ${issues.length} issues (${urgentIssues.length} urgent) across ${REPOS.join(", ")}`
    );

    // Summarize with Cortensor
    const summaryPrompt =
        `You are monitoring the Cortensor GitHub organization (${org}). ` +
        `Analyze this activity and provide community insights:\n\n` +
        `Recent PRs (${prs.length}):\n` +
        prs.map((p) => `- #${p.number}: "${p.title}" by @${p.author} [${p.state}]`).join("\n") +
        `\n\nOpen Issues (${issues.length}; ${urgentIssues.length} urgent):\n` +
        issues
            .map((i) => `- #${i.number}: "${i.title}" by @${i.author} [${i.labels.join(", ") || "no labels"}]${i.urgent ? " ⚠️URGENT" : ""}`)
            .join("\n") +
        `\n\nProvide a 2-3 sentence community health summary. List any urgent action items.` +
        `\nOutput JSON: {"summary": "...", "urgentItems": ["..."]}`;

    const cortensorResult = await callCortensor(summaryPrompt);
    log(`🤖 Cortensor GitHub analysis complete`);

    let parsed: { summary: string; urgentItems: string[] } = { summary: "", urgentItems: [] };
    try {
        const jsonMatch = cortensorResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const p = JSON.parse(jsonMatch[0]);
            parsed = {
                summary: typeof p.summary === "string" ? p.summary : "",
                urgentItems: Array.isArray(p.urgentItems) ? p.urgentItems : [],
            };
        }
    } catch {
        parsed.summary = cortensorResult.content.substring(0, 300);
    }

    const fallbackSummary = `Monitoring ${REPOS.length} Cortensor repos: ${prs.length} recent PRs, ${issues.length} open issues${urgentIssues.length > 0 ? `, ${urgentIssues.length} urgent` : ""}.`;

    return {
        recentPRs: prs,
        recentIssues: issues,
        summary: parsed.summary || fallbackSummary,
        urgentItems: parsed.urgentItems,
        cortensorAnalysis: cortensorResult.content,
        reposMonitored: REPOS.map((r) => `${org}/${r}`),
        rateLimited,
    };
}
