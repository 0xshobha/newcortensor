"use client";

import { useEffect, useState } from "react";
import { BarChart3, CheckCircle, XCircle, Clock, RefreshCw, TrendingUp } from "lucide-react";

interface ObsRecord {
    id: number;
    task_id: string;
    agent_name: string;
    latency_ms: number;
    success: number;
    cortensor_calls: number;
    avg_confidence: number;
    created_at: string;
}

interface TaskRecord {
    id: string;
    goal: string;
    status: string;
    started_at: string;
    completed_at?: string;
}

interface Summary {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    totalAgentRuns: number;
    successRatePercent: number;
    totalCortensorCalls: number;
    avgLatencyMs: number;
    avgConfidence: number;
}

interface StatsData {
    tasks: TaskRecord[];
    stats: ObsRecord[];
    summary: Summary;
}

export function ObservabilityTable() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const load = () => {
        setLoading(true);
        fetch("/api/observability")
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                setLastRefresh(new Date());
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        const t = setInterval(load, 15_000);
        return () => clearInterval(t);
    }, []);

    if (loading && !data) {
        return (
            <div className="p-8 text-center font-mono text-muted animate-pulse">
                Loading observability data…
            </div>
        );
    }

    if (!data || data.stats.length === 0) {
        return (
            <div className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-muted mx-auto mb-4 opacity-30" />
                <p className="font-mono text-muted text-sm">No observability data yet.</p>
                <p className="font-mono text-muted text-xs mt-1">
                    Run agent loops to populate metrics.
                </p>
            </div>
        );
    }

    const { summary } = data;

    // Aggregate per-agent stats
    const agentStats: Record<
        string,
        { calls: number; successes: number; totalLatency: number; cortensorCalls: number; confSum: number; confCount: number }
    > = {};

    data.stats.forEach((r) => {
        if (!agentStats[r.agent_name]) {
            agentStats[r.agent_name] = { calls: 0, successes: 0, totalLatency: 0, cortensorCalls: 0, confSum: 0, confCount: 0 };
        }
        const s = agentStats[r.agent_name];
        s.calls += 1;
        s.successes += r.success;
        s.totalLatency += r.latency_ms;
        s.cortensorCalls += r.cortensor_calls;
        if (r.avg_confidence > 0) { s.confSum += r.avg_confidence; s.confCount += 1; }
    });

    const summaryCards = [
        { label: "Total Tasks", value: summary.totalTasks, icon: BarChart3, color: "text-primary" },
        { label: "Completed", value: summary.completedTasks, icon: CheckCircle, color: "text-primary" },
        { label: "Failed", value: summary.failedTasks, icon: XCircle, color: summary.failedTasks > 0 ? "text-danger" : "text-muted" },
        { label: "Success Rate", value: `${summary.successRatePercent}%`, icon: TrendingUp, color: summary.successRatePercent >= 80 ? "text-primary" : "text-warning" },
        { label: "Cortensor Calls", value: summary.totalCortensorCalls, icon: Clock, color: "text-accent" },
        { label: "Avg Latency", value: `${summary.avgLatencyMs.toLocaleString()}ms`, icon: Clock, color: "text-text-secondary" },
        { label: "Avg Confidence", value: summary.avgConfidence > 0 ? `${(summary.avgConfidence * 100).toFixed(1)}%` : "—", icon: TrendingUp, color: summary.avgConfidence > 0.8 ? "text-primary" : "text-warning" },
        { label: "Running", value: summary.runningTasks, icon: Clock, color: summary.runningTasks > 0 ? "text-warning" : "text-muted" },
    ] as const;

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-mono text-sm font-bold text-text-primary">Observability Dashboard</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted" suppressHydrationWarning>
                        Last refresh: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="p-1.5 border border-border rounded hover:border-primary hover:text-primary text-muted transition-colors disabled:animate-spin"
                        title="Refresh"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
                {summaryCards.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="cyber-card rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-mono text-muted uppercase tracking-widest">{label}</span>
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <p className={`text-xl font-mono font-bold tabular-nums ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Per-Agent Stats */}
            <div>
                <h3 className="font-mono text-xs font-bold text-text-primary mb-3 uppercase tracking-widest">
                    Agent Performance
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px] font-mono">
                        <thead>
                            <tr className="border-b border-border text-left">
                                {["Agent", "Runs", "Success %", "Avg Latency", "Cortensor Calls", "Avg Confidence"].map((h) => (
                                    <th key={h} className="py-2 pr-4 text-muted font-normal uppercase text-[10px] tracking-widest">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(agentStats).map(([agent, s]) => {
                                const successRate = s.calls > 0 ? Math.round((s.successes / s.calls) * 100) : 0;
                                const avgLatency = s.calls > 0 ? Math.round(s.totalLatency / s.calls) : 0;
                                const avgConf = s.confCount > 0 ? s.confSum / s.confCount : 0;
                                return (
                                    <tr key={agent} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                                        <td className="py-2 pr-4 text-text-secondary font-medium">{agent}</td>
                                        <td className="py-2 pr-4 text-text-secondary">{s.calls}</td>
                                        <td className={`py-2 pr-4 font-bold ${successRate >= 80 ? "text-primary" : successRate >= 50 ? "text-warning" : "text-danger"}`}>
                                            {successRate}%
                                        </td>
                                        <td className="py-2 pr-4 text-text-secondary tabular-nums">{avgLatency.toLocaleString()} ms</td>
                                        <td className="py-2 pr-4 text-accent">{s.cortensorCalls}</td>
                                        <td className={`py-2 pr-4 tabular-nums ${avgConf > 0.8 ? "text-primary" : avgConf > 0.6 ? "text-warning" : "text-muted"}`}>
                                            {avgConf > 0 ? `${(avgConf * 100).toFixed(1)}%` : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Tasks */}
            <div>
                <h3 className="font-mono text-xs font-bold text-text-primary mb-3 uppercase tracking-widest">
                    Recent Tasks
                </h3>
                <div className="space-y-2">
                    {data.tasks.slice(0, 10).map((task) => (
                        <div key={task.id} className="cyber-card rounded flex items-center gap-4 p-3">
                            {task.status === "completed" ? (
                                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                            ) : task.status === "failed" ? (
                                <XCircle className="w-4 h-4 text-danger shrink-0" />
                            ) : (
                                <Clock className="w-4 h-4 text-warning shrink-0 animate-pulse" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-mono text-xs text-text-secondary truncate">{task.goal}</p>
                                <p className="font-mono text-[10px] text-muted mt-0.5">
                                    {task.id.substring(0, 8)}… · {new Date(task.started_at).toLocaleTimeString()}
                                </p>
                            </div>
                            <span className={`poi-badge shrink-0 ${task.status === "completed"
                                ? "text-primary border-primary/40"
                                : task.status === "failed"
                                    ? "text-danger border-danger/40"
                                    : "text-warning border-warning/40"
                                }`}>
                                {task.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
