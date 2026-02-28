"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    Send,
    Download,
    AlertTriangle,
    CheckCircle,
    Loader2,
    Terminal,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
    text: string;
    type: "user" | "agent" | "system" | "error" | "success";
    timestamp: string;
}

interface RunResult {
    taskId?: string;
    status: string;
    logs?: string[];
    finalReport?: string;
    refused?: boolean;
    error?: string;
    verificationScore?: number | null;
    consensusLevel?: string | null;
    evidenceTaskId?: string | null;
    routerHealthy?: boolean | null;
    agentCount?: number;
}

const EXAMPLE_GOALS = [
    "Run full incident detection on Cortensor network",
    "Summarize recent Cortensor GitHub PRs and open issues",
    "Check router miner health and generate a status report",
];

export function AgentChat() {
    const [input, setInput] = useState("");
    const [logs, setLogs] = useState<LogEntry[]>([
        {
            text: "CAOH initialized. Type a goal or press 'Run Full Loop' to start.",
            type: "system",
            // Use an empty string on initial render — useEffect will never re-run this entry
            timestamp: "00:00:00",
        },
    ]);
    const [isRunning, setIsRunning] = useState(false);
    const [lastResult, setLastResult] = useState<RunResult | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [logs]);

    const addLog = useCallback((text: string, type: LogEntry["type"] = "agent") => {
        setLogs((prev) => [
            ...prev,
            { text, type, timestamp: new Date().toISOString() },
        ]);
    }, []);

    const clearLogs = () => {
        setLogs([{
            text: "Log cleared. Ready for new goal.",
            type: "system",
            timestamp: new Date().toISOString(),
        }]);
        setLastResult(null);
    };

    const runLoop = useCallback(
        async (goal: string) => {
            if (isRunning) return;
            setIsRunning(true);
            setLastResult(null);

            addLog(`> ${goal}`, "user");
            addLog("🚀 Initiating Cortensor Agentic Loop…", "system");

            const AGENTS = [
                "CoordinatorAgent",
                "RouterHealthAgent",
                "GitHubMonitorAgent",
                "VerifierAgent",
                "ReporterAgent",
            ];
            AGENTS.forEach((a) =>
                window.dispatchEvent(new CustomEvent("agent-active", { detail: { agent: a } }))
            );

            try {
                const res = await fetch("/api/agent/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ goal }),
                });

                const data: RunResult = await res.json();
                setLastResult(data);

                if (!res.ok) {
                    addLog(`❌ Server error (${res.status}): ${data.error ?? "Unknown"}`, "error");
                    toast.error(`Server error: ${data.error ?? res.statusText}`);
                } else if (data.refused) {
                    addLog("🚫 " + (data.error || "Request refused by safety guardrail."), "error");
                    toast.error("Request refused by safety guardrail");
                } else if (data.error) {
                    addLog("❌ Error: " + data.error, "error");
                    toast.error(data.error);
                } else {
                    (data.logs ?? []).forEach((log) => {
                        const type: LogEntry["type"] = log.startsWith("✅")
                            ? "success"
                            : log.startsWith("❌") || log.startsWith("🚨")
                                ? "error"
                                : log.startsWith("⚠️")
                                    ? "error"
                                    : "agent";
                        addLog(log, type);
                    });

                    if (data.verificationScore !== undefined && data.verificationScore !== null) {
                        addLog(
                            `📊 PoI Score: ${data.verificationScore}/100 | Consensus: ${data.consensusLevel} | Router: ${data.routerHealthy ? "✅ Healthy" : "❌ Down"}`,
                            "success"
                        );
                    }

                    if (data.evidenceTaskId) {
                        window.dispatchEvent(
                            new CustomEvent("evidence-logged", {
                                detail: {
                                    taskId: data.evidenceTaskId,
                                    score: data.verificationScore ?? 0,
                                    consensus: data.consensusLevel ?? "UNKNOWN",
                                    time: new Date().toLocaleTimeString(),
                                },
                            })
                        );
                    }

                    addLog("✅ Agent loop complete. Report ready below.", "success");
                    toast.success("Agent loop completed successfully!");
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                addLog("❌ Network error: " + msg, "error");
                toast.error("Network error: " + msg);
            } finally {
                setIsRunning(false);
                AGENTS.forEach((a) =>
                    window.dispatchEvent(new CustomEvent("agent-done", { detail: { agent: a } }))
                );
            }
        },
        [isRunning, addLog]
    );

    // Listen for global "Run Full Loop" button
    useEffect(() => {
        const handler = () => {
            if (!isRunning) runLoop(EXAMPLE_GOALS[0]);
        };
        window.addEventListener("run-full-loop", handler);
        return () => window.removeEventListener("run-full-loop", handler);
    }, [isRunning, runLoop]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isRunning) return;
        const goal = input.trim();
        setInput("");
        runLoop(goal);
    };

    const getLogStyle = (type: LogEntry["type"]) => {
        switch (type) {
            case "user": return "text-accent font-semibold";
            case "success": return "text-primary";
            case "error": return "text-danger";
            case "system": return "text-muted italic";
            default: return "text-text-secondary";
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Transcript */}
            <div className="flex-1 overflow-y-auto p-6 space-y-1.5 font-mono text-sm">
                {logs.map((log, i) => (
                    <div key={i} className={`flex gap-3 animate-fade-in ${getLogStyle(log.type)}`}>
                        <span className="text-muted text-[10px] shrink-0 mt-0.5 tabular-nums w-16">
                            {log.timestamp.split("T")[1].split(".")[0]}
                        </span>
                        <span className="leading-relaxed whitespace-pre-wrap break-words flex-1">
                            {log.text}
                        </span>
                    </div>
                ))}
                {isRunning && (
                    <div className="flex items-center gap-2 text-primary mt-2">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span className="font-mono text-sm cursor-blink">
                            Agents running on Cortensor decentralized network
                        </span>
                    </div>
                )}
                <div ref={logsEndRef} />
            </div>

            {/* Result bar */}
            {lastResult?.finalReport && !lastResult.refused && (
                <div className="mx-6 mb-3 p-3 border border-primary/30 rounded bg-primary-glow flex flex-wrap items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-mono text-primary">Report ready</span>
                    {lastResult.verificationScore !== null && lastResult.verificationScore !== undefined && (
                        <span className="text-muted text-xs font-mono">
                            PoI {lastResult.verificationScore}/100 · {lastResult.consensusLevel}
                        </span>
                    )}
                    <div className="ml-auto flex gap-2">
                        <button
                            onClick={() => {
                                const blob = new Blob([lastResult.finalReport!], { type: "text/markdown" });
                                const url = URL.createObjectURL(blob);
                                const a = Object.assign(document.createElement("a"), {
                                    href: url,
                                    download: `caoh-report-${Date.now()}.md`,
                                });
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border border-primary/40 text-primary rounded hover:bg-primary hover:text-background transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            Report
                        </button>
                        {lastResult.evidenceTaskId && (
                            <a
                                href={`/api/evidence/${lastResult.evidenceTaskId}`}
                                download
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border border-accent/40 text-accent rounded hover:bg-accent hover:text-white transition-colors"
                            >
                                <Download className="w-3 h-3" />
                                Evidence
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Quick examples (show only if log is pristine) */}
            {logs.length === 1 && (
                <div className="mx-6 mb-3 flex gap-2 flex-wrap">
                    {EXAMPLE_GOALS.map((g) => (
                        <button
                            key={g}
                            onClick={() => runLoop(g)}
                            className="px-3 py-1.5 text-[11px] font-mono border border-border rounded text-muted hover:border-primary hover:text-primary transition-colors"
                        >
                            {g}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="flex-1 relative">
                        <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            maxLength={1000}
                            placeholder={
                                isRunning
                                    ? "Agents running…"
                                    : "Enter a goal, e.g. 'Run full incident detection on Cortensor network'"
                            }
                            disabled={isRunning}
                            className="w-full bg-surface-2 border border-border rounded pl-9 pr-4 py-2.5 text-sm font-mono text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                        />
                        {input.length > 800 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-warning">
                                {1000 - input.length}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={clearLogs}
                        disabled={isRunning || logs.length <= 1}
                        title="Clear log"
                        className="p-2.5 border border-border rounded text-muted hover:border-danger hover:text-danger transition-colors disabled:opacity-30"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        type="submit"
                        disabled={isRunning || !input.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background text-sm font-mono font-bold rounded hover:bg-primary-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {isRunning ? "Running" : "Send"}
                    </button>
                </form>
                <p className="mt-2 text-[10px] font-mono text-muted">
                    <AlertTriangle className="w-3 h-3 inline mr-1 text-warning" />
                    Safety guardrails active · Harmful or off-topic requests will be refused · Max 1,000 chars
                </p>
            </div>
        </div>
    );
}
