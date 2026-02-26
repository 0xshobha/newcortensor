"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface RouterStatusData {
    healthy: boolean;
    minerCount?: number;
    activeMiners?: number;
    uptimePercent?: number;
    blockHeight?: number;
    version?: string;
    mock?: boolean;
    endpoint?: string;
}

export function NetworkStatus({ compact = false }: { compact?: boolean }) {
    const [status, setStatus] = useState<RouterStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    const fetch_ = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/status");
            const data: RouterStatusData = await res.json();
            setStatus(data);
        } catch {
            setStatus({ healthy: false });
        } finally {
            setLoading(false);
            setLastFetch(new Date());
        }
    };

    useEffect(() => {
        fetch_();
        const t = setInterval(fetch_, 30_000);
        return () => clearInterval(t);
    }, []);

    // ── Compact badge (for tab bar) ───────────────────────────────
    if (compact) {
        if (loading) {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                    <span className="text-[11px] font-mono text-muted">Checking…</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5">
                <span className={`status-dot ${status?.healthy ? "healthy" : "error"}`} />
                <span className={`text-[11px] font-mono ${status?.healthy ? "text-primary" : "text-danger"}`}>
                    {status?.healthy
                        ? `ROUTER OK${status.activeMiners !== undefined ? ` · ${status.activeMiners} miners` : ""}`
                        : "ROUTER DOWN"}
                    {status?.mock ? " (mock)" : ""}
                </span>
            </div>
        );
    }

    // ── Full panel (sidebar) ──────────────────────────────────────
    if (loading && !status) {
        return (
            <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-surface-2 rounded w-3/4" />
                <div className="h-3 bg-surface-2 rounded w-1/2" />
                <div className="h-3 bg-surface-2 rounded w-2/3" />
            </div>
        );
    }

    const rows = [
        status?.activeMiners !== undefined && status.minerCount !== undefined
            ? { label: "Miners", value: `${status.activeMiners}/${status.minerCount}` }
            : null,
        status?.uptimePercent !== undefined
            ? { label: "Uptime", value: `${status.uptimePercent}%` }
            : null,
        status?.blockHeight !== undefined
            ? { label: "Block", value: status.blockHeight.toLocaleString() }
            : null,
        status?.version
            ? { label: "Version", value: status.version }
            : null,
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <div className="space-y-2">
            {/* Status row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`status-dot ${status?.healthy ? "healthy" : "error"}`} />
                    <span className={`text-xs font-mono font-bold ${status?.healthy ? "text-primary" : "text-danger"}`}>
                        {status?.healthy ? "HEALTHY" : "OFFLINE"}
                        {status?.mock ? " (mock)" : ""}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {status?.healthy
                        ? <CheckCircle className="w-3 h-3 text-primary" />
                        : <XCircle className="w-3 h-3 text-danger" />}
                    <button
                        onClick={fetch_}
                        disabled={loading}
                        className="p-0.5 text-muted hover:text-primary transition-colors disabled:animate-spin"
                        title="Refresh"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Metrics */}
            {rows.length > 0 && (
                <div className="space-y-1">
                    {rows.map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-[10px] font-mono">
                            <span className="text-muted">{label}</span>
                            <span className="text-text-secondary">{value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Last checked */}
            {lastFetch && (
                <p className="text-[9px] font-mono text-muted" suppressHydrationWarning>
                    Last checked {lastFetch.toLocaleTimeString()}
                </p>
            )}

            {/* Warning */}
            {!status?.healthy && (
                <div className="flex items-start gap-1.5 mt-1 text-[10px] font-mono text-warning">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>Start router on :5010 or set MOCK_CORTENSOR=true</span>
                </div>
            )}
        </div>
    );
}
