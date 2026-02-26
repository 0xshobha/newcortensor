import { NextRequest, NextResponse } from "next/server";
import { getEvidenceBundle } from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    const { taskId } = await params;
    const bundle = getEvidenceBundle(taskId);

    if (!bundle) {
        return NextResponse.json({ error: "Evidence bundle not found" }, { status: 404 });
    }

    return NextResponse.json(bundle, {
        headers: {
            "Content-Disposition": `attachment; filename="evidence-${taskId}.json"`,
            "Content-Type": "application/json",
        },
    });
}
