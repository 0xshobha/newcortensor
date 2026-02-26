import { NextResponse } from "next/server";

export async function GET() {
    const routerUrl = process.env.CORTENSOR_ROUTER_URL || "http://localhost:5010";
    const authToken = process.env.CORTENSOR_AUTH_TOKEN || "default-dev-token";

    if (process.env.MOCK_CORTENSOR === "true") {
        return NextResponse.json({
            healthy: true,
            endpoint: routerUrl,
            minerCount: 12,
            activeMiners: 10,
            blockHeight: 482391,
            version: "0.4.2-testnet",
            uptime: "99.2%",
            mock: true,
        });
    }

    try {
        const res = await fetch(`${routerUrl}/api/v1/status`, {
            headers: { Authorization: `Bearer ${authToken}` },
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        return NextResponse.json({ healthy: res.ok, ...data });
    } catch {
        return NextResponse.json({ healthy: false, endpoint: routerUrl });
    }
}
