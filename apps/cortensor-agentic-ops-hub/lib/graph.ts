/**
 * LangGraph.js stateful multi-agent graph
 * Orchestrates: Coordinator → RouterHealth + GitHub (parallel) → Verifier → Reporter
 *
 * Improvements:
 *  - Fixed conditional edges: use named routing strings, not array return
 *  - Parallel fan-out via two edges from routerHealth + githubMonitor joining at verifier
 *  - Confidence recorded in observability for all agents
 *  - Better error surfacing in logs
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { runCoordinatorAgent, CoordinatorOutput } from "./agents/coordinator";
import { runRouterHealthAgent, RouterHealthOutput } from "./agents/router-health";
import { runGitHubMonitorAgent, GitHubSummaryOutput } from "./agents/github-monitor";
import { runVerifierAgent, VerifierOutput } from "./agents/verifier";
import { runReporterAgent, ReporterOutput } from "./agents/reporter";
import { saveTask, recordObservability } from "./db";
import { EvidenceBundle } from "./evidence";

// ──────────────────────────────────────────────
// State schema
// ──────────────────────────────────────────────
const GraphState = Annotation.Root({
    taskId: Annotation<string>({ reducer: (_: string, b: string) => b }),
    goal: Annotation<string>({ reducer: (_: string, b: string) => b }),
    logs: Annotation<string[]>({ reducer: (a: string[], b: string[]) => [...a, ...b], default: () => [] }),
    plan: Annotation<CoordinatorOutput | null>({ reducer: (_: CoordinatorOutput | null, b: CoordinatorOutput | null) => b, default: () => null }),
    routerHealth: Annotation<RouterHealthOutput | null>({ reducer: (_: RouterHealthOutput | null, b: RouterHealthOutput | null) => b, default: () => null }),
    githubSummary: Annotation<GitHubSummaryOutput | null>({ reducer: (_: GitHubSummaryOutput | null, b: GitHubSummaryOutput | null) => b, default: () => null }),
    verifierResult: Annotation<VerifierOutput | null>({ reducer: (_: VerifierOutput | null, b: VerifierOutput | null) => b, default: () => null }),
    finalReport: Annotation<ReporterOutput | null>({ reducer: (_: ReporterOutput | null, b: ReporterOutput | null) => b, default: () => null }),
    error: Annotation<string | null>({ reducer: (_: string | null, b: string | null) => b, default: () => null }),
    refused: Annotation<boolean>({ reducer: (_: boolean, b: boolean) => b, default: () => false }),
});

type GraphStateType = typeof GraphState.State;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function obs(
    taskId: string,
    agent: string,
    latencyMs: number,
    success: boolean,
    cortensorCalls: number,
    avgConfidence?: number
) {
    recordObservability({ task_id: taskId, agent_name: agent, latency_ms: latencyMs, success, cortensor_calls: cortensorCalls, avg_confidence: avgConfidence });
}

// ──────────────────────────────────────────────
// Nodes
// ──────────────────────────────────────────────
async function coordinatorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    const t = Date.now();
    try {
        const plan = await runCoordinatorAgent(state.taskId, state.goal);
        obs(state.taskId, "CoordinatorAgent", Date.now() - t, true, 1);
        return { plan, logs: [`✅ Coordinator: Plan created with ${plan.subtasks.length} subtasks`] };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        obs(state.taskId, "CoordinatorAgent", Date.now() - t, false, 1);
        if (msg.startsWith("Refused:") || msg.toLowerCase().includes("refused")) {
            return { refused: true, error: msg, logs: [`🚫 Coordinator refused: ${msg}`] };
        }
        return { error: msg, logs: [`❌ Coordinator error: ${msg}`] };
    }
}

async function routerHealthNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    const t = Date.now();
    try {
        const routerHealth = await runRouterHealthAgent(state.taskId);
        obs(state.taskId, "RouterHealthAgent", Date.now() - t, true, 1);
        return {
            routerHealth,
            logs: [`✅ RouterHealth [${routerHealth.severity.toUpperCase()}]: ${routerHealth.summary}`],
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        obs(state.taskId, "RouterHealthAgent", Date.now() - t, false, 1);
        return { logs: [`⚠️ RouterHealth error (non-fatal): ${msg}`] };
    }
}

async function githubMonitorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    const t = Date.now();
    try {
        const githubSummary = await runGitHubMonitorAgent(state.taskId);
        obs(state.taskId, "GitHubMonitorAgent", Date.now() - t, true, 1);
        const rateLimitNote = githubSummary.rateLimited ? " ⚠️ rate-limited" : "";
        return {
            githubSummary,
            logs: [`✅ GitHub: ${githubSummary.summary.substring(0, 100)}${rateLimitNote}`],
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        obs(state.taskId, "GitHubMonitorAgent", Date.now() - t, false, 0);
        return { logs: [`⚠️ GitHub error (non-fatal): ${msg}`] };
    }
}

async function verifierNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    const t = Date.now();
    const contentToVerify = [
        `Goal: ${state.goal}`,
        state.routerHealth ? `Network Status: ${state.routerHealth.summary} (severity: ${state.routerHealth.severity})` : "",
        state.githubSummary ? `GitHub Activity: ${state.githubSummary.summary}` : "",
    ].filter(Boolean).join("\n");

    try {
        const verifierResult = await runVerifierAgent(
            state.taskId,
            contentToVerify,
            (step) => console.log("[Verifier]", step)
        );
        const confidence = verifierResult.evidenceBundle.overallScore / 100;
        obs(state.taskId, "VerifierAgent", Date.now() - t, true, 3, confidence);
        return {
            verifierResult,
            logs: [
                `✅ Verifier: ${verifierResult.summary} ` +
                `(score: ${verifierResult.evidenceBundle.overallScore}/100, consensus: ${verifierResult.evidenceBundle.consensusLevel})`,
            ],
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        obs(state.taskId, "VerifierAgent", Date.now() - t, false, 3);
        return { logs: [`⚠️ Verifier error (non-fatal): ${msg}`] };
    }
}

async function reporterNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    const t = Date.now();
    try {
        const evidenceBundle: EvidenceBundle | undefined = state.verifierResult?.evidenceBundle;
        const finalReport = await runReporterAgent(
            state.taskId,
            state.goal,
            state.routerHealth ?? undefined,
            state.githubSummary ?? undefined,
            evidenceBundle
        );
        obs(state.taskId, "ReporterAgent", Date.now() - t, true, 1);
        return {
            finalReport,
            logs: [`✅ Reporter: Final report generated (${finalReport.markdownReport.length} chars)`],
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        obs(state.taskId, "ReporterAgent", Date.now() - t, false, 1);
        return { error: msg, logs: [`❌ Reporter error: ${msg}`] };
    }
}

// ──────────────────────────────────────────────
// Build graph
// ──────────────────────────────────────────────
function buildGraph() {
    const graph = new StateGraph(GraphState);

    // Fan-out node: dispatches to both routerHealth and githubMonitor in parallel
    async function fanOutNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
        const [rh, gh] = await Promise.allSettled([
            routerHealthNode(state),
            githubMonitorNode(state),
        ]);
        const rhResult = rh.status === "fulfilled" ? rh.value : { logs: [`⚠️ RouterHealth failed: ${(rh as PromiseRejectedResult).reason}`] };
        const ghResult = gh.status === "fulfilled" ? gh.value : { logs: [`⚠️ GitHub failed: ${(gh as PromiseRejectedResult).reason}`] };
        return {
            routerHealth: (rhResult as Partial<GraphStateType>).routerHealth ?? null,
            githubSummary: (ghResult as Partial<GraphStateType>).githubSummary ?? null,
            logs: [
                ...((rhResult as Partial<GraphStateType>).logs ?? []),
                ...((ghResult as Partial<GraphStateType>).logs ?? []),
            ],
        };
    }

    graph.addNode("coordinator", coordinatorNode);
    graph.addNode("fanOut", fanOutNode);
    graph.addNode("verifier", verifierNode);
    graph.addNode("reporter", reporterNode);

    // START → coordinator
    graph.addEdge(START, "coordinator");

    // coordinator → either END (if refused/error) or fan-out
    graph.addConditionalEdges(
        "coordinator",
        (state: GraphStateType): string => (state.refused || state.error ? "end" : "fanOut"),
        { end: END, fanOut: "fanOut" }
    );

    // fanOut → verifier → reporter → END
    graph.addEdge("fanOut", "verifier");
    graph.addEdge("verifier", "reporter");
    graph.addEdge("reporter", END as unknown as string);

    return graph.compile();
}

export const agentGraph = buildGraph();

// ──────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────
export async function runAgentLoop(taskId: string, goal: string): Promise<GraphStateType> {
    saveTask({ id: taskId, goal, status: "running", agent_count: 5 });

    const result = await agentGraph.invoke({
        taskId,
        goal,
        logs: [`🚀 CAOH Agent Loop started | Task: ${taskId} | Goal: "${goal.substring(0, 60)}"`],
    });

    return result;
}
