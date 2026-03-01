/**
 * RouterHealthAgent – monitors Cortensor router status and miners
 *
 * Improvements:
 *  - Per-request timeouts on health endpoints
 *  - Miner uptime percentage in output
 *  - Richer incident classification (critical / warning / ok)
 *  - Contextual fallback summary when Cortensor parse fails
 */

import { callCortensor } from "../cortensor";
import { appendLog } from "../db";

export interface RouterStatus {
    healthy: boolean;
    endpoint: string;
    minerCount: number;
    activeMiners: number;
    uptimePercent: number;
    blockHeight?: number;
    version?: string;
    lastChecked: string;
    raw?: unknown;
}

export type IncidentSeverity = "critical" | "warning" | "ok";

export interface RouterHealthOutput {
    status: RouterStatus;
    severity: IncidentSeverity;
    summary: string;
    incidents: string[];
    recommendations: string[];
    cortensorAnalysis: string;
}

// ──────────────────────────────────────────────
// Fetch real router data
// ──────────────────────────────────────────────
async function fetchRouterStatus(): Promise<RouterStatus> {
    const routerUrl = process.env.CORTENSOR_ROUTER_URL || "http://localhost:5010";
    const authToken = process.env.CORTENSOR_AUTH_TOKEN || "default-dev-token";

    // Auto-detect mock mode: explicit env var OR on Vercel without real router
    const isMockMode =
        process.env.MOCK_CORTENSOR === "true" ||
        (process.env.VERCEL === "1" && !process.env.CORTENSOR_ROUTER_URL);

    if (isMockMode) {
        const activeMiners = 10;
        const minerCount = 12;
        return {
            healthy: true,
            endpoint: routerUrl,
            minerCount,
            activeMiners,
            uptimePercent: Math.round((activeMiners / minerCount) * 100),
            blockHeight: 482_391 + Math.floor(Math.random() * 100),
            version: "0.4.2-testnet",
            lastChecked: new Date().toISOString(),
            raw: { mock: true, uptime: "99.2%" },
        };
    }

    const headers = {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
    };
    const signal = AbortSignal.timeout(6_000);

    try {
        const [statusRes, minersRes] = await Promise.allSettled([
            fetch(`${routerUrl}/api/v1/status`, { headers, signal }),
            fetch(`${routerUrl}/api/v1/miners`, { headers, signal }),
        ]);

        const statusData =
            statusRes.status === "fulfilled" && statusRes.value.ok
                ? await statusRes.value.json().catch(() => null)
                : null;

        const minersData =
            minersRes.status === "fulfilled" && minersRes.value.ok
                ? await minersRes.value.json().catch(() => null)
                : null;

        const miners: { active?: boolean; status?: string }[] = Array.isArray(minersData)
            ? minersData
            : (minersData?.miners ?? []);

        const minerCount = miners.length;
        const activeMiners = miners.filter(
            (m) => m.active === true || m.status === "active"
        ).length;

        return {
            healthy: !!statusData,
            endpoint: routerUrl,
            minerCount,
            activeMiners,
            uptimePercent: minerCount > 0 ? Math.round((activeMiners / minerCount) * 100) : 0,
            blockHeight: statusData?.block_height ?? statusData?.blockHeight,
            version: statusData?.version ?? statusData?.node_version,
            lastChecked: new Date().toISOString(),
            raw: { status: statusData, miners: minersData },
        };
    } catch {
        return {
            healthy: false,
            endpoint: routerUrl,
            minerCount: 0,
            activeMiners: 0,
            uptimePercent: 0,
            lastChecked: new Date().toISOString(),
        };
    }
}

function classifySeverity(status: RouterStatus): IncidentSeverity {
    if (!status.healthy) return "critical";
    if (status.uptimePercent < 60) return "critical";
    if (status.uptimePercent < 80) return "warning";
    return "ok";
}

// ──────────────────────────────────────────────
// Agent function
// ──────────────────────────────────────────────
export async function runRouterHealthAgent(
    taskId: string
): Promise<RouterHealthOutput> {
    const log = (msg: string, level: "info" | "warn" | "error" = "info") =>
        appendLog({
            task_id: taskId,
            agent_name: "RouterHealthAgent",
            message: msg,
            timestamp: new Date().toISOString(),
            level,
        });

    log("🌐 RouterHealthAgent activated. Fetching /status and /miners...");

    const routerStatus = await fetchRouterStatus();
    const severity = classifySeverity(routerStatus);

    log(
        `📊 Router: ${routerStatus.healthy ? "HEALTHY" : "UNHEALTHY"} | ` +
        `Miners: ${routerStatus.activeMiners}/${routerStatus.minerCount} (${routerStatus.uptimePercent}%) | ` +
        `Severity: ${severity.toUpperCase()}`
    );

    if (severity === "critical") {
        log("🚨 CRITICAL severity – router or miner dropout detected!", "error");
    } else if (severity === "warning") {
        log("⚠️ WARNING severity – miner count below 80% threshold.", "warn");
    }

    // Build analysis prompt
    const analysisPrompt =
        `Analyze this Cortensor router health report and identify incidents and recommendations:\n\n` +
        `Router Status:\n` +
        `- Endpoint: ${routerStatus.endpoint}\n` +
        `- Healthy: ${routerStatus.healthy}\n` +
        `- Active Miners: ${routerStatus.activeMiners} / ${routerStatus.minerCount} (${routerStatus.uptimePercent}%)\n` +
        `- Block Height: ${routerStatus.blockHeight ?? "N/A"}\n` +
        `- Version: ${routerStatus.version ?? "N/A"}\n` +
        `- Severity: ${severity}\n\n` +
        `Output as JSON: {"summary": "...", "incidents": [], "recommendations": []}`;

    const cortensorResult = await callCortensor(analysisPrompt);
    log(`🤖 Cortensor analysis complete (latency: ${cortensorResult.evidence.latencyMs ?? "?"}ms)`);

    // Parse Cortensor JSON
    let parsed = {
        summary: "",
        incidents: [] as string[],
        recommendations: [] as string[],
    };
    try {
        const jsonMatch = cortensorResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const p = JSON.parse(jsonMatch[0]);
            parsed = {
                summary: typeof p.summary === "string" ? p.summary : "",
                incidents: Array.isArray(p.incidents) ? p.incidents : [],
                recommendations: Array.isArray(p.recommendations) ? p.recommendations : [],
            };
        }
    } catch {
        /* use fallback below */
    }

    // Contextual fallback summary
    if (!parsed.summary) {
        parsed.summary =
            severity === "critical"
                ? `⚠️ Router is ${routerStatus.healthy ? "online but" : "OFFLINE."} Miner participation critical (${routerStatus.uptimePercent}%).`
                : severity === "warning"
                    ? `Router online — ${routerStatus.activeMiners}/${routerStatus.minerCount} miners active. Monitor closely.`
                    : `Router healthy — ${routerStatus.activeMiners}/${routerStatus.minerCount} miners active at block ${routerStatus.blockHeight ?? "N/A"}.`;
    }

    return {
        status: routerStatus,
        severity,
        summary: parsed.summary,
        incidents: parsed.incidents,
        recommendations: parsed.recommendations,
        cortensorAnalysis: cortensorResult.content,
    };
}
