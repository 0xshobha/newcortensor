import { NextRequest, NextResponse } from "next/server";
import { callCortensor } from "@/lib/cortensor";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, sessionId, stream } = body;

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "prompt is required" },
                { status: 400 }
            );
        }

        const result = await callCortensor(prompt, sessionId, stream);
        return NextResponse.json(result);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
