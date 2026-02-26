/**
 * CoordinatorAgent – breaks user goal into subtasks and dispatches agents
 */

import { callCortensor } from "../cortensor";
import { appendLog } from "../db";

export interface CoordinatorOutput {
    subtasks: Subtask[];
    planSummary: string;
    agentsNeeded: string[];
}

export interface Subtask {
    id: string;
    description: string;
    agent: "RouterHealthAgent" | "GitHubMonitorAgent" | "VerifierAgent" | "ReporterAgent";
    priority: "high" | "medium" | "low";
}

const COORDINATOR_PROMPT = `You are the CoordinatorAgent for Cortensor Agentic Ops Hub.
Your job is to break down a user goal into specific subtasks and assign them to specialized agents.

Available agents:
- RouterHealthAgent: checks Cortensor router status, miners, network health
- GitHubMonitorAgent: monitors cortensor GitHub repos, PRs, issues
- VerifierAgent: runs 3x PoI verification on critical outputs
- ReporterAgent: generates final markdown report and evidence bundle

ALWAYS output valid JSON matching this schema:
{
  "planSummary": "...",
  "agentsNeeded": ["Agent1", "Agent2"],
  "subtasks": [
    { "id": "1", "description": "...", "agent": "RouterHealthAgent", "priority": "high" }
  ]
}`;

export async function runCoordinatorAgent(
    taskId: string,
    goal: string
): Promise<CoordinatorOutput> {
    const log = (msg: string) =>
        appendLog({
            task_id: taskId,
            agent_name: "CoordinatorAgent",
            message: msg,
            timestamp: new Date().toISOString(),
            level: "info",
        });

    log(`🎯 CoordinatorAgent activated. Goal: "${goal}"`);
    log("📋 Breaking goal into subtasks...");

    const prompt = `${COORDINATOR_PROMPT}\n\nUser goal: "${goal}"\n\nOutput only JSON:`;

    const result = await callCortensor(prompt);

    if (result.refused) {
        log("🚫 Goal refused by safety guardrail.");
        throw new Error(`Refused: ${result.content}`);
    }

    log(`📡 Cortensor responded (confidence: ${((result.evidence.confidence ?? 0) * 100).toFixed(0)}%)`);

    try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            log(`✅ Plan created: ${parsed.subtasks?.length ?? 0} subtasks, agents: ${parsed.agentsNeeded?.join(", ")}`);
            return parsed as CoordinatorOutput;
        }
    } catch {
        // fallback
    }

    // Fallback plan
    log("⚠️ JSON parse failed. Using fallback plan.");
    return {
        planSummary: `Executing incident detection for: ${goal}`,
        agentsNeeded: ["RouterHealthAgent", "GitHubMonitorAgent", "VerifierAgent", "ReporterAgent"],
        subtasks: [
            { id: "1", description: "Check Cortensor router and miner health", agent: "RouterHealthAgent", priority: "high" },
            { id: "2", description: "Monitor GitHub for recent activity", agent: "GitHubMonitorAgent", priority: "medium" },
            { id: "3", description: "Verify all outputs with PoI", agent: "VerifierAgent", priority: "high" },
            { id: "4", description: "Generate final report", agent: "ReporterAgent", priority: "high" },
        ],
    };
}
