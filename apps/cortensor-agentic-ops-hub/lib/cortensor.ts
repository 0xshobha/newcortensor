/**
 * CortensorTool – core integration with Cortensor Router
 * Project.md spec: POST /api/v1/completions/:sessionId
 *
 * Improvements:
 *  - Exponential-backoff retry (up to 3 attempts)
 *  - Prompt truncation guard (max 8k chars)
 *  - Richer mock variety (router ok / degraded / incident)
 *  - Structured refusal logging
 *  - Full OpenAI-compat + Cortensor-native response extraction
 */

const MAX_PROMPT_CHARS = 8_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 800;

export interface CortensorEvidence {
    sessionId: number;
    timestamp: string;
    rawResponse: unknown;
    minersUsed?: number;
    confidence?: number;
    aggregateVerdict?: string;
    minerVotes?: unknown[];
    dispersion?: number;
    latencyMs?: number;
}

export interface CortensorResult {
    content: string;
    refused: boolean;
    evidence: CortensorEvidence;
}

// ──────────────────────────────────────────────
// Safety guardrails
// ──────────────────────────────────────────────
const HARMFUL_PATTERNS = [
    /\bhack(ing|er|ed)?\b/i,
    /\bexploit(s|ed|ing)?\b/i,
    /\battack(s|ed|ing)?\b/i,
    /\bddos\b/i,
    /bypass.*(security|auth|firewall)/i,
    /\bsteal\b/i,
    /\bphish(ing)?\b/i,
    /\bmalware\b/i,
    /\bransomware\b/i,
    /how to break (into|past)/i,
    /crypto.*(trade|invest|buy|sell)/i,
    /price prediction/i,
    /financial advice/i,
    /\$cor.*(buy|sell|invest)/i,
] as const;

function isSafePrompt(prompt: string): boolean {
    return !HARMFUL_PATTERNS.some((p) => p.test(prompt));
}

const REFUSAL_MESSAGE =
    "I'm unable to assist with that request. As a Cortensor DevOps agent, " +
    "I'm here to help with infrastructure monitoring, incident analysis, " +
    "GitHub activity summaries, and community support. " +
    "Please keep requests on-topic and constructive.";

// ──────────────────────────────────────────────
// Mock responses – realistic variety
// ──────────────────────────────────────────────
type MockScenario = "healthy" | "degraded" | "incident";

function chooseMockScenario(): MockScenario {
    const r = Math.random();
    if (r < 0.65) return "healthy";
    if (r < 0.85) return "degraded";
    return "incident";
}

function generateMockResponse(prompt: string): CortensorResult {
    const scenario = chooseMockScenario();
    const minersUsed = Math.floor(6 + Math.random() * 6);
    const latencyMs = Math.floor(600 + Math.random() * 1400);

    const confidenceByScenario: Record<MockScenario, number> = {
        healthy: 0.88 + Math.random() * 0.10,
        degraded: 0.62 + Math.random() * 0.15,
        incident: 0.42 + Math.random() * 0.20,
    };
    const confidence = confidenceByScenario[scenario];

    const contentByScenario: Record<MockScenario, string> = {
        healthy: `[MOCK · ${scenario.toUpperCase()}] Analysis of: "${prompt.substring(0, 55)}…"

Cortensor decentralized inference result — ${minersUsed} miners, consensus confidence ${(confidence * 100).toFixed(1)}%:

Network is operating within expected parameters. All ${minersUsed} miners responding normally. Block production steady at expected cadence. No anomalies detected in the last 24-hour window.

PoI Verdict: PASS — evidence bundle attached.`,

        degraded: `[MOCK · ${scenario.toUpperCase()}] Analysis of: "${prompt.substring(0, 55)}…"

Cortensor decentralized inference result — ${minersUsed} miners, consensus confidence ${(confidence * 100).toFixed(1)}%:

⚠️ Partial degradation detected. ${Math.floor(minersUsed * 0.7)} of ${minersUsed} miners responding. Block production slightly delayed (+2.3s above baseline). Possible transient network partition — monitoring recommended.

PoI Verdict: PASS (reduced confidence) — evidence bundle attached.`,

        incident: `[MOCK · ${scenario.toUpperCase()}] Analysis of: "${prompt.substring(0, 55)}…"

Cortensor decentralized inference result — ${minersUsed} miners, consensus confidence ${(confidence * 100).toFixed(1)}%:

🚨 INCIDENT DETECTED: Significant miner dropout (${Math.floor(minersUsed * 0.4)} of ${minersUsed} miners unresponsive). Router health check returning 503 on /api/v1/status. Recommend immediate escalation and fallback to secondary router endpoint.

PoI Verdict: PARTIAL — low consensus, evidence bundle attached for review.`,
    };

    return {
        content: contentByScenario[scenario],
        refused: false,
        evidence: {
            sessionId: parseInt(process.env.SESSION_ID || "1"),
            timestamp: new Date().toISOString(),
            rawResponse: { mock: true, scenario, promptPreview: prompt.substring(0, 40) },
            minersUsed,
            confidence,
            aggregateVerdict: scenario === "incident" ? "PARTIAL" : "PASS",
            minerVotes: Array.from({ length: minersUsed }, (_, i) => ({
                minerId: `miner_${String(i + 1).padStart(3, "0")}`,
                vote: Math.random() > (scenario === "incident" ? 0.5 : 0.1) ? "AGREE" : "DISAGREE",
                weight: +(Math.random().toFixed(3)),
                latencyMs: Math.floor(300 + Math.random() * 700),
            })),
            dispersion: scenario === "healthy" ? Math.random() * 0.12 : Math.random() * 0.4,
            latencyMs,
        },
    };
}

// ──────────────────────────────────────────────
// Retry helper with exponential back-off
// ──────────────────────────────────────────────
async function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, init);
            if (res.ok) return res;
            // 5xx → retry; 4xx → bail immediately
            if (res.status < 500) {
                throw new Error(`Router ${res.status}: ${res.statusText}`);
            }
            if (attempt === retries) throw new Error(`Router ${res.status} after ${retries} retries`);
        } catch (err) {
            if (attempt === retries) throw err;
        }
        await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
    }
    throw new Error("fetchWithRetry: exhausted retries");
}

// ──────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────
export async function callCortensor(
    prompt: string,
    sessionId?: number,
    stream = false
): Promise<CortensorResult> {
    const sid = sessionId ?? (process.env.SESSION_ID ? parseInt(process.env.SESSION_ID) : 1);
    const startTime = Date.now();

    // Truncate oversized prompts
    const safePrompt =
        prompt.length > MAX_PROMPT_CHARS
            ? prompt.slice(0, MAX_PROMPT_CHARS) + "\n\n[...prompt truncated for router safety]"
            : prompt;

    // Safety guardrails
    if (!isSafePrompt(safePrompt)) {
        console.warn("[Cortensor] Safety guardrail triggered for prompt:", safePrompt.substring(0, 80));
        return {
            content: REFUSAL_MESSAGE,
            refused: true,
            evidence: {
                sessionId: sid,
                timestamp: new Date().toISOString(),
                rawResponse: { refused: true, reason: "safety_guardrail" },
                latencyMs: 0,
            },
        };
    }

    // Mock mode: explicit env var OR on Vercel without a real router
    const isMockMode =
        process.env.MOCK_CORTENSOR === "true" ||
        (process.env.VERCEL === "1" && !process.env.CORTENSOR_ROUTER_URL);

    if (isMockMode) {
        const delay = 400 + Math.random() * 900;
        await sleep(delay);
        return generateMockResponse(safePrompt);
    }

    // Real Cortensor Router call
    const routerUrl = process.env.CORTENSOR_ROUTER_URL || "http://localhost:5010";
    const authToken = process.env.CORTENSOR_AUTH_TOKEN || "default-dev-token";

    const systemPrompt =
        "You are a helpful Cortensor DevOps agent. " +
        "Refuse any harmful, off-topic, or crypto-trading advice. " +
        "Always respond in structured JSON when asked. " +
        "You monitor Cortensor infrastructure, GitHub activity, and community health.";

    const fullPrompt = `${systemPrompt}\n\nUser request: ${safePrompt}`;

    try {
        const res = await fetchWithRetry(
            `${routerUrl}/api/v1/completions/${sid}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt: fullPrompt, stream, timeout: 90 }),
                signal: AbortSignal.timeout(100_000),
            }
        );

        const data = await res.json();
        const latencyMs = Date.now() - startTime;

        // Extract content: support OpenAI-compat and Cortensor-native formats
        const content: string =
            data?.choices?.[0]?.text ||
            data?.choices?.[0]?.message?.content ||
            data?.output ||
            data?.result ||
            data?.content ||
            JSON.stringify(data);

        return {
            content,
            refused: false,
            evidence: {
                sessionId: sid,
                timestamp: new Date().toISOString(),
                rawResponse: data,
                minersUsed: data?.miner_scores?.length ?? data?.miners_used ?? data?.miner_count,
                confidence: data?.confidence ?? data?.aggregate_confidence ?? data?.score,
                aggregateVerdict: data?.aggregate_verdict ?? data?.verdict,
                minerVotes: data?.miner_scores ?? data?.miner_votes ?? data?.votes,
                dispersion: data?.dispersion ?? data?.variance,
                latencyMs,
            },
        };
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn("[Cortensor] Router call failed, falling back to mock mode:", errMsg);
        // Gracefully fallback to mock mode instead of crashing
        const delay = 400 + Math.random() * 900;
        await sleep(delay);
        return generateMockResponse(safePrompt);
    }
}
