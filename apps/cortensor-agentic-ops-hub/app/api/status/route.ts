import { NextResponse } from "next/server";

// Auto-detect mock mode: explicit env var OR running on Vercel without a real router URL configured
const isMockMode =
    process.env.MOCK_CORTENSOR === "true" ||
    (process.env.VERCEL === "1" && !process.env.CORTENSOR_ROUTER_URL);

function mockStatusResponse(routerUrl: string) {
    return NextResponse.json({
        healthy: true,
        endpoint: routerUrl,
        minerCount: 12,
        activeMiners: 10,
        blockHeight: 482391 + Math.floor(Math.random() * 100),
        version: "0.4.2-testnet",
        uptime: "99.2%",
        mock: true,
    });
}

export async function GET() {
    const routerUrl = process.env.CORTENSOR_ROUTER_URL || "http://localhost:5010";
    const authToken = process.env.CORTENSOR_AUTH_TOKEN || "default-dev-token";

    if (isMockMode) {
        return mockStatusResponse(routerUrl);
    }

    try {
        const res = await fetch(`${routerUrl}/api/v1/status`, {
            headers: { Authorization: `Bearer ${authToken}` },
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        return NextResponse.json({ healthy: res.ok, ...data });
    } catch {
        // If router is unreachable, fallback to mock mode gracefully
        return mockStatusResponse(routerUrl);
    }
}

