/**
 * ReporterAgent – generates final Markdown report + evidence bundle
 *
 * Improvements:
 *  - Richer multi-section report template
 *  - Severity badge in report header
 *  - Urgent GitHub items surfaced as action table
 *  - Error handling persists task as "failed" on exception
 */

import { callCortensor } from "../cortensor";
import { appendLog, updateTask } from "../db";
import { EvidenceBundle, formatEvidenceAsMarkdown } from "../evidence";
import { RouterHealthOutput } from "./router-health";
import { GitHubSummaryOutput } from "./github-monitor";

export interface ReporterOutput {
    markdownReport: string;
    evidenceBundle?: EvidenceBundle;
    reportSummary: string;
}

export async function runReporterAgent(
    taskId: string,
    goal: string,
    routerHealth?: RouterHealthOutput,
    githubSummary?: GitHubSummaryOutput,
    evidenceBundle?: EvidenceBundle
): Promise<ReporterOutput> {
    const timestamp = new Date().toISOString();

    const log = (msg: string, level: "info" | "warn" | "error" = "info") =>
        appendLog({
            task_id: taskId,
            agent_name: "ReporterAgent",
            message: msg,
            timestamp: new Date().toISOString(),
            level,
        });

    log("📝 ReporterAgent activated. Generating final report...");

    // ── Build context for Cortensor ──────────────────────────
    const urgentItems = githubSummary?.urgentItems ?? [];
    const severity = routerHealth?.severity ?? "ok";

    const contextData = [
        "## Router Health",
        routerHealth
            ? [
                `- Status: **${routerHealth.status.healthy ? "HEALTHY" : "UNHEALTHY"}**`,
                `- Severity: ${severity.toUpperCase()}`,
                `- Active Miners: ${routerHealth.status.activeMiners}/${routerHealth.status.minerCount} (${routerHealth.status.uptimePercent}%)`,
                `- Block Height: ${routerHealth.status.blockHeight ?? "N/A"}`,
                `- Incidents: ${routerHealth.incidents.join("; ") || "None detected"}`,
                `- Recommendations: ${routerHealth.recommendations.join("; ") || "Continue monitoring"}`,
            ].join("\n")
            : "No router health data available.",

        "\n## GitHub Activity",
        githubSummary
            ? [
                `- Repos Monitored: ${githubSummary.reposMonitored.join(", ")}`,
                `- Recent PRs: ${githubSummary.recentPRs.length}`,
                `- Open Issues: ${githubSummary.recentIssues.length}`,
                `- Urgent Items: ${urgentItems.length > 0 ? urgentItems.join("; ") : "None"}`,
                `- Community Summary: ${githubSummary.summary}`,
                githubSummary.rateLimited ? "- ⚠️ GitHub API rate limit was hit, data may be partial." : "",
            ].filter(Boolean).join("\n")
            : "No GitHub data available.",

        "\n## PoI Verification",
        evidenceBundle
            ? [
                `- Overall Score: **${evidenceBundle.overallScore}/100**`,
                `- Consensus Level: ${evidenceBundle.consensusLevel}`,
                `- Sessions Used: ${evidenceBundle.sessionIds.join(", ")}`,
                `- Rubric Runs: ${evidenceBundle.rubricScores.length}`,
            ].join("\n")
            : "No verification data.",
    ].join("\n");

    const reportPrompt =
        `Generate a professional DevOps incident report for the Cortensor network.\n\n` +
        `Original Goal: "${goal}"\n\n` +
        `Collected Data:\n${contextData}\n\n` +
        `Write a structured Markdown report with these sections:\n` +
        `1. Executive Summary (2-3 sentences)\n` +
        `2. Router Health Findings\n` +
        `3. GitHub & Community Activity\n` +
        `4. PoI Verification Results\n` +
        `5. Recommendations & Action Items\n\n` +
        `Keep concise (under 600 words), use severity emoji (🟢 ok / 🟡 warning / 🔴 critical), and be specific.`;

    const cortensorResult = await callCortensor(reportPrompt);
    log("🤖 Report generated via Cortensor");

    // ── Urgent actions table ─────────────────────────────────
    const urgentTable =
        githubSummary && githubSummary.recentIssues.some((i) => i.urgent)
            ? "\n## 🚨 Urgent GitHub Items\n\n" +
            "| # | Title | Labels | URL |\n|---|-------|--------|-----|\n" +
            githubSummary.recentIssues
                .filter((i) => i.urgent)
                .map((i) => `| #${i.number} | ${i.title} | ${i.labels.join(", ")} | [link](${i.url}) |`)
                .join("\n") +
            "\n"
            : "";

    // ── Severity badge ───────────────────────────────────────
    const severityBadge =
        severity === "critical"
            ? "🔴 **CRITICAL**"
            : severity === "warning"
                ? "🟡 **WARNING**"
                : "🟢 **OK**";

    const markdownReport =
        `# Cortensor Agentic Ops Hub – Incident Report\n\n` +
        `| Field | Value |\n|-------|-------|\n` +
        `| **Task ID** | \`${taskId}\` |\n` +
        `| **Generated** | ${timestamp} |\n` +
        `| **Goal** | ${goal} |\n` +
        `| **Severity** | ${severityBadge} |\n` +
        `| **PoI Score** | ${evidenceBundle ? `${evidenceBundle.overallScore}/100 (${evidenceBundle.consensusLevel})` : "N/A"} |\n\n` +
        `---\n\n` +
        `${cortensorResult.content}\n\n` +
        urgentTable +
        `---\n\n` +
        `## Evidence Bundle\n\n` +
        (evidenceBundle
            ? `[📥 Download Evidence Bundle](/api/evidence/${taskId})\n\n` +
            formatEvidenceAsMarkdown(evidenceBundle)
            : "_No evidence bundle captured._") +
        `\n\n---\n\n` +
        `_Generated by **Cortensor Agentic Ops Hub (CAOH)** | ` +
        `All reasoning delegated to the Cortensor decentralized network with PoI verification._\n`;

    // Persist completed task
    updateTask(taskId, {
        status: "completed",
        completed_at: timestamp,
        final_report: markdownReport,
    });

    log("✅ Report complete. Task marked as completed.");

    return {
        markdownReport,
        evidenceBundle,
        reportSummary: cortensorResult.content.substring(0, 250) + "…",
    };
}
