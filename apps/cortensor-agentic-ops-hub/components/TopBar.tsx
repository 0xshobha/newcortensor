"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, Globe, Play, RefreshCw } from "lucide-react";

export function TopBar() {
    const sessionId = process.env.NEXT_PUBLIC_SESSION_ID || "—";
    const routerUrl = process.env.NEXT_PUBLIC_ROUTER_URL || "localhost:5010";
    const [time, setTime] = useState("");

    useEffect(() => {
        // Set initial time client-side only to avoid SSR hydration mismatch
        setTime(new Date().toISOString());
        const t = setInterval(() => setTime(new Date().toISOString()), 1000);
        return () => clearInterval(t);
    }, []);

    return (
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface z-50 shrink-0">
            {/* Brand */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Activity className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
                <div>
                    <h1 className="text-sm font-bold font-mono text-primary text-glow-green tracking-widest uppercase">
                        CAOH
                    </h1>
                    <p className="text-[10px] text-muted font-mono">
                        Cortensor Agentic Ops Hub
                    </p>
                </div>
            </div>

            {/* Center: config pills */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded bg-surface-2">
                    <Cpu className="w-3 h-3 text-muted" />
                    <span className="text-[11px] font-mono text-text-secondary">
                        Session:{" "}
                        <span className="text-primary">{sessionId}</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded bg-surface-2">
                    <Globe className="w-3 h-3 text-muted" />
                    <span className="text-[11px] font-mono text-text-secondary">
                        Router:{" "}
                        <span className="text-accent">{routerUrl}</span>
                    </span>
                </div>
            </div>

            {/* Right: clock + actions */}
            <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-muted tabular-nums" suppressHydrationWarning>
                    {time ? time.replace("T", " ").split(".")[0] + "Z" : ""}
                </span>
                <button
                    onClick={() => window.location.reload()}
                    className="p-1.5 border border-border rounded hover:border-primary hover:text-primary text-muted transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => {
                        const event = new CustomEvent("run-full-loop");
                        window.dispatchEvent(event);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary text-background text-[11px] font-mono font-bold rounded hover:bg-primary-dim transition-colors"
                >
                    <Play className="w-3 h-3" />
                    Run Full Loop
                </button>
            </div>
        </header>
    );
}
