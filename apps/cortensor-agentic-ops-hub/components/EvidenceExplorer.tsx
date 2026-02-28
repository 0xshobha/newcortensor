"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, Shield } from "lucide-react";
import { EvidenceBundle } from "@/lib/evidence";

interface EvidenceBundleWithId extends EvidenceBundle {
    taskId: string;
}

export function EvidenceExplorer() {
    const [bundles, setBundles] = useState<EvidenceBundleWithId[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load from observability data / tasks
        fetch("/api/observability")
            .then((r) => r.json())
            .then((data) => {
                // Fetch evidence for each task
                const taskIds = [
                    ...new Set((data.tasks || []).map((t: { id: string }) => t.id)),
                ].slice(0, 10);
                return Promise.all(
                    taskIds.map((id: string) =>
                        fetch(`/api/evidence/${id}`)
                            .then((r) => r.ok ? r.json() : null)
                            .catch(() => null)
                    )
                );
            })
            .then((results) => {
                setBundles(results.filter(Boolean) as EvidenceBundleWithId[]);
            })
            .catch(() => { })
            .finally(() => setLoading(false));

        // Also listen for live evidence events
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ taskId: string }>;
            fetch(`/api/evidence/${ce.detail.taskId}`)
                .then((r) => r.ok ? r.json() : null)
                .then((bundle) => {
                    if (bundle) setBundles((prev) => [bundle, ...prev]);
                })
                .catch(() => { });
        };
        window.addEventListener("evidence-logged", handler);
        return () => window.removeEventListener("evidence-logged", handler);
    }, []);

    const consensusColor = (level: string) => {
        if (level === "HIGH") return "text-primary border-primary/40";
        if (level === "MEDIUM") return "text-warning border-warning/40";
        return "text-danger border-danger/40";
    };

    if (loading) {
        return (
            <div className="p-8 text-center font-mono text-muted animate-pulse">
                Loading evidence bundles...
            </div>
        );
    }

    if (bundles.length === 0) {
        return (
            <div className="p-8 text-center">
                <Shield className="w-12 h-12 text-muted mx-auto mb-4 opacity-30" />
                <p className="font-mono text-muted text-sm">No evidence bundles yet.</p>
                <p className="font-mono text-muted text-xs mt-1">
                    Run an agent loop to generate verifiable PoI evidence.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono text-sm font-bold text-text-primary">
                    Evidence Bundles ({bundles.length})
                </h2>
                <p className="text-[11px] font-mono text-muted">
                    Click to expand · PoI verification data from Cortensor miners
                </p>
            </div>

            {bundles.map((bundle) => (
                <div key={bundle.taskId} className="cyber-card rounded border">
                    {/* Header row */}
                    <button
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2 transition-colors"
                        onClick={() =>
                            setExpanded(expanded === bundle.taskId ? null : bundle.taskId)
                        }
                    >
                        {expanded === bundle.taskId ? (
                            <ChevronDown className="w-4 h-4 text-muted shrink-0" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs text-text-secondary truncate">
                                {bundle.originalPrompt?.substring(0, 80) || "Agent task"}
                            </p>
                            <p className="font-mono text-[10px] text-muted mt-0.5">
                                {bundle.timestamp} · Task: {bundle.taskId?.substring(0, 12)}...
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <span
                                className={`poi-badge ${consensusColor(bundle.consensusLevel)}`}
                            >
                                {bundle.consensusLevel}
                            </span>
                            <span
                                className={`text-sm font-mono font-bold ${bundle.overallScore >= 80
                                        ? "text-primary"
                                        : bundle.overallScore >= 60
                                            ? "text-warning"
                                            : "text-danger"
                                    }`}
                            >
                                {bundle.overallScore}/100
                            </span>
                            <a
                                href={`/api/evidence/${bundle.taskId}`}
                                download
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 border border-border rounded hover:border-primary hover:text-primary text-muted transition-colors"
                                title="Download evidence JSON"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </button>

                    {/* Expanded content */}
                    {expanded === bundle.taskId && (
                        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
                            {/* Rubric Scores */}
                            <div>
                                <h3 className="font-mono text-[11px] font-bold text-muted uppercase tracking-widest mb-2">
                                    Rubric Scores (3 runs)
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] font-mono">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left text-muted pr-4 pb-2">Run</th>
                                                <th className="text-left text-muted pr-4 pb-2">Score</th>
                                                <th className="text-left text-muted pr-4 pb-2">Consensus</th>
                                                <th className="text-left text-muted pb-2">Reasoning</th>
                                            </tr>
                                        </thead>
                                        <tbody className="space-y-1">
                                            {(bundle.rubricScores || []).map((r, i) => (
                                                <tr key={i} className="border-b border-border/50">
                                                    <td className="pr-4 py-1.5 text-muted">#{r.runIndex + 1}</td>
                                                    <td className={`pr-4 py-1.5 font-bold ${r.score >= 80 ? "text-primary" : r.score >= 60 ? "text-warning" : "text-danger"}`}>
                                                        {r.score}/100
                                                    </td>
                                                    <td className="pr-4 py-1.5">
                                                        <span className={`poi-badge ${consensusColor(r.consensusLevel)}`}>
                                                            {r.consensusLevel}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 text-text-secondary">{r.reasoning}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* PoI Metadata */}
                            {bundle.evidenceList && bundle.evidenceList.length > 0 && (
                                <div>
                                    <h3 className="font-mono text-[11px] font-bold text-muted uppercase tracking-widest mb-2">
                                        PoI Metadata (Miner Data)
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {bundle.evidenceList.map((e, i) => (
                                            <div key={i} className="bg-surface-2 border border-border rounded p-2 text-[10px] font-mono space-y-1">
                                                <p className="text-muted">Run {i + 1}</p>
                                                <p>Session: <span className="text-accent">{e.sessionId}</span></p>
                                                <p>Miners: <span className="text-text-secondary">{e.minersUsed ?? "N/A"}</span></p>
                                                <p>Confidence: <span className={e.confidence && e.confidence > 0.8 ? "text-primary" : "text-warning"}>
                                                    {e.confidence ? (e.confidence * 100).toFixed(1) + "%" : "N/A"}
                                                </span></p>
                                                <p>Verdict: <span className={e.aggregateVerdict === "PASS" ? "text-primary" : "text-danger"}>{e.aggregateVerdict ?? "N/A"}</span></p>
                                                <p>Latency: <span className="text-text-secondary">{e.latencyMs ?? "N/A"}ms</span></p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Final Output */}
                            <div>
                                <h3 className="font-mono text-[11px] font-bold text-muted uppercase tracking-widest mb-2">
                                    Final Aggregated Output
                                </h3>
                                <pre className="agent-thought p-3 rounded text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {bundle.finalAggregatedOutput || "—"}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
