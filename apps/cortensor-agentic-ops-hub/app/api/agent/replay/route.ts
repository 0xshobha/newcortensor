import { NextRequest, NextResponse } from "next/server";
import { getTask, getTaskLogs, getEvidenceBundle } from "@/lib/db";

export async function GET(req: NextRequest) {
    const taskId = req.nextUrl.searchParams.get("taskId");

    if (!taskId) {
        return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const task = getTask(taskId);
    if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const logs = getTaskLogs(taskId);
    const evidenceBundle = getEvidenceBundle(taskId);

    return NextResponse.json({
        task,
        logs,
        evidenceBundle,
    });
}
