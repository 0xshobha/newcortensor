import { NextRequest, NextResponse } from "next/server";
import { runAgentLoop } from "@/lib/graph";
import { updateTask } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const MAX_GOAL_LENGTH = 1_000;
// Next.js default is 30s on Vercel; give the loop up to 120s on self-hosted
export const maxDuration = 120;

export async function POST(req: NextRequest) {
    let taskId: string | null = null;

    try {
        const body = await req.json();
        const { goal } = body;

        if (!goal || typeof goal !== "string") {
            return NextResponse.json(
                { error: "goal is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        if (goal.trim().length > MAX_GOAL_LENGTH) {
            return NextResponse.json(
                { error: `goal must be ≤ ${MAX_GOAL_LENGTH} characters` },
                { status: 400 }
            );
        }

        taskId = uuidv4();

        const result = await runAgentLoop(taskId, goal.trim());

        // Persist final status (success/fail) back to DB
        updateTask(taskId, {
            status: result.refused ? "failed" : result.error ? "failed" : "completed",
            completed_at: new Date().toISOString(),
            ...(result.error ? { error: result.error } : {}),
        });

        return NextResponse.json({
            taskId,
            status: result.refused ? "refused" : result.error ? "error" : "completed",
            refused: result.refused ?? false,
            error: result.error ?? null,
            logs: result.logs ?? [],
            finalReport: result.finalReport?.markdownReport ?? null,
            evidenceTaskId: result.verifierResult?.evidenceBundle?.taskId ?? taskId,
            routerHealthSummary: result.routerHealth?.summary ?? null,
            routerHealthy: result.routerHealth?.status?.healthy ?? null,
            githubSummary: result.githubSummary?.summary ?? null,
            verificationScore: result.verifierResult?.evidenceBundle?.overallScore ?? null,
            consensusLevel: result.verifierResult?.evidenceBundle?.consensusLevel ?? null,
            agentCount: 5,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[/api/agent/run]", err);

        // Mark task as failed in DB if we have a taskId
        if (taskId) {
            try {
                updateTask(taskId, {
                    status: "failed",
                    completed_at: new Date().toISOString(),
                    error: msg,
                });
            } catch { /* ignore secondary DB failure */ }
        }

        return NextResponse.json({ error: msg, taskId }, { status: 500 });
    }
}
