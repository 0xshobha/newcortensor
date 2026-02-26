import { NextResponse } from "next/server";
import { listTasks, getObservabilityStats } from "@/lib/db";

export async function GET() {
    try {
        const tasks = listTasks(50);
        const stats = getObservabilityStats();

        // Compute aggregated summary on the server so the client doesn't have to
        const totalCortensorCalls = stats.reduce((s, r) => s + r.cortensor_calls, 0);
        const successCount = stats.filter((r) => r.success === 1).length;
        const avgLatencyMs =
            stats.length > 0
                ? Math.round(stats.reduce((s, r) => s + r.latency_ms, 0) / stats.length)
                : 0;
        const avgConfidence =
            stats.length > 0
                ? +(stats.reduce((s, r) => s + (r.avg_confidence || 0), 0) / stats.length).toFixed(3)
                : 0;

        const summary = {
            totalTasks: tasks.length,
            completedTasks: tasks.filter((t) => t.status === "completed").length,
            failedTasks: tasks.filter((t) => t.status === "failed").length,
            runningTasks: tasks.filter((t) => t.status === "running").length,
            totalAgentRuns: stats.length,
            successRatePercent:
                stats.length > 0 ? +(successCount / stats.length * 100).toFixed(1) : 0,
            totalCortensorCalls,
            avgLatencyMs,
            avgConfidence,
        };

        return NextResponse.json({ tasks, stats, summary });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[/api/observability]", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
