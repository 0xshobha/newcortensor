"use client";

import { useEffect, useState } from "react";
import {
    Activity,
    FileText,
    GitBranch,
    Shield,
    Zap,
    Cpu,
} from "lucide-react";
import { NetworkStatus } from "./NetworkStatus";

interface EvidenceLogEntry {
    taskId: string;
    score: number;
    consensus: string;
    time: string;
}

const AGENTS = [
    { name: "CoordinatorAgent", icon: Zap, color: "text-primary" },
    { name: "RouterHealthAgent", icon: Activity, color: "text-accent" },
    { name: "GitHubMonitorAgent", icon: GitBranch, color: "text-warning" },
    { name: "VerifierAgent", icon: Shield, color: "text-danger" },
    { name: "ReporterAgent", icon: FileText, color: "text-primary" },
] as const;

function consensusColor(consensus: string): string {
    if (consensus === "HIGH") return "text-primary border-primary/40";
    if (consensus === "MEDIUM") return "text-warning border-warning/40";
    return "text-danger border-danger/40";
}

function scoreBar(score: number) {
    const pct = Math.min(100, Math.max(0, score));
    const color =
        pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-warning" : "bg-danger";
    return (
        <div className="mt-1.5 h-0.5 w-full bg-surface-2 rounded-full overflow-hidden">
            <div
                className={`h-full ${color} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export function Sidebar() {
    const [evidenceLogs, setEvidenceLogs] = useState<EvidenceLogEntry[]>([]);
    const [activeAgents, setActiveAgents] = useState<string[]>([]);
    const [totalRuns, setTotalRuns] = useState(0);

    useEffect(() => {
        const handleAgentActive = (e: Event) => {
            const ce = e as CustomEvent<{ agent: string }>;
            setActiveAgents((prev) =>
                prev.includes(ce.detail.agent) ? prev : [...prev, ce.detail.agent]
            );
        };
        const handleAgentDone = (e: Event) => {
            const ce = e as CustomEvent<{ agent: string }>;
            setActiveAgents((prev) => prev.filter((a) => a !== ce.detail.agent));
        };
        const handleEvidence = (e: Event) => {
            const ce = e as CustomEvent<EvidenceLogEntry>;
            setEvidenceLogs((prev) => [ce.detail, ...prev].slice(0, 20));
            setTotalRuns((n) => n + 1);
        };

        window.addEventListener("agent-active", handleAgentActive);
        window.addEventListener("agent-done", handleAgentDone);
        window.addEventListener("evidence-logged", handleEvidence);
        return () => {
            window.removeEventListener("agent-active", handleAgentActive);
            window.removeEventListener("agent-done", handleAgentDone);
            window.removeEventListener("evidence-logged", handleEvidence);
        };
    }, []);

    return (
        <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
            {/* Network Status */}
            <div className="p-4 border-b border-border">
                <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-3">
                    Network Status
                </p>
                <NetworkStatus />
            </div>

            {/* Active Agents */}
            <div className="p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-mono text-muted uppercase tracking-widest">
                        Agents
                    </p>
                    {activeAgents.length > 0 && (
                        <span className="text-[9px] font-mono text-primary animate-pulse">
                            {activeAgents.length} active
                        </span>
                    )}
                </div>
                <div className="space-y-1.5">
                    {AGENTS.map(({ name, icon: Icon, color }) => {
                        const isActive = activeAgents.includes(name);
                        return (
                            <div
                                key={name}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-mono transition-all duration-300 ${isActive
                                        ? "bg-primary-glow border border-primary/30 text-primary"
                                        : "text-muted"
                                    }`}
                            >
                                <Icon
                                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary animate-pulse" : color
                                        }`}
                                />
                                <span className="truncate flex-1">{name}</span>
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Evidence Log */}
            <div className="p-4 flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-mono text-muted uppercase tracking-widest">
                        Evidence Log
                    </p>
                    {totalRuns > 0 && (
                        <span className="text-[9px] font-mono text-muted">
                            {totalRuns} run{totalRuns > 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {evidenceLogs.length === 0 ? (
                        <div className="text-center py-6">
                            <Cpu className="w-6 h-6 text-muted opacity-30 mx-auto mb-2" />
                            <p className="text-[11px] font-mono text-muted italic">
                                Evidence bundles appear here after each agent run.
                            </p>
                        </div>
                    ) : (
                        evidenceLogs.map((entry, i) => (
                            <div
                                key={i}
                                className="cyber-card p-2.5 rounded text-[10px] font-mono animate-fade-in"
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`poi-badge ${consensusColor(entry.consensus)}`}>
                                        {entry.consensus}
                                    </span>
                                    <span
                                        className={`font-bold tabular-nums ${entry.score >= 80
                                                ? "text-primary"
                                                : entry.score >= 50
                                                    ? "text-warning"
                                                    : "text-danger"
                                            }`}
                                    >
                                        {entry.score}/100
                                    </span>
                                </div>
                                {scoreBar(entry.score)}
                                <div className="flex justify-between mt-1.5">
                                    <span className="text-text-secondary">
                                        {entry.taskId.substring(0, 10)}…
                                    </span>
                                    <span className="text-muted">{entry.time}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
}
