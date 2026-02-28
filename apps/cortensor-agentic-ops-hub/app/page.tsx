"use client";

import { AgentChat } from "@/components/AgentChat";
import { EvidenceExplorer } from "@/components/EvidenceExplorer";
import { ObservabilityTable } from "@/components/ObservabilityTable";
import { NetworkStatus } from "@/components/NetworkStatus";
import { useState } from "react";

export default function Home() {
    const [activeTab, setActiveTab] = useState<"chat" | "evidence" | "observability">("chat");

    const tabs = [
        { id: "chat", label: "Agent Chat" },
        { id: "evidence", label: "Evidence Explorer" },
        { id: "observability", label: "Observability" },
    ] as const;

    return (
        <div className="flex flex-col h-full">
            {/* Tab Bar */}
            <div className="flex border-b border-border bg-surface">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-mono transition-all duration-200 border-b-2 ${activeTab === tab.id
                                ? "text-primary border-primary bg-primary-glow"
                                : "text-muted border-transparent hover:text-text-secondary hover:border-border-bright"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
                <div className="flex-1" />
                <div className="flex items-center px-4">
                    <NetworkStatus compact />
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "chat" && <AgentChat />}
                {activeTab === "evidence" && <EvidenceExplorer />}
                {activeTab === "observability" && <ObservabilityTable />}
            </div>
        </div>
    );
}
