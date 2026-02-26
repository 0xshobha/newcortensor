# Cortensor Agentic Ops Hub (CAOH)

> **Verifiable Multi-Agent DevOps & Community Orchestrator for Cortensor Network**

[![MIT License](https://img.shields.io/badge/license-MIT-green)](#)
[![Cortensor](https://img.shields.io/badge/powered%20by-Cortensor-7c3aed)](#)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](#)

**One-liner:** "The agent that watches Cortensor infra + GitHub, delegates every reasoning step to the decentralized router with PoI verification, surfaces verifiable evidence bundles, and ships incident reports and community summaries."

---

## 🏗️ Architecture

```mermaid
graph TD
    U[User Goal] --> C[CoordinatorAgent]
    C --> RH[RouterHealthAgent]
    C --> GM[GitHubMonitorAgent]
    RH --> V[VerifierAgent\n3x PoI Loops]
    GM --> V
    V --> R[ReporterAgent]
    R --> EB[Evidence Bundle\nJSON + Markdown]

    subgraph Cortensor Router
        CR[/api/v1/completions/:sessionId]
        CM[/api/v1/miners]
        CS[/api/v1/status]
    end

    C -->|callCortensor| CR
    RH -->|GET| CS
    RH -->|GET| CM
    RH -->|callCortensor| CR
    GM -->|callCortensor| CR
    V -->|3x callCortensor| CR
    V -->|RubricAgent| CR
    R -->|callCortensor| CR
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js 20+
- Local Cortensor Router at `http://localhost:5010` OR set `MOCK_CORTENSOR=true` for demo mode

### 1. Clone & Install

```bash
git clone https://github.com/0xshobha/community-projects.git
cd community-projects/apps/cortensor-agentic-ops-hub
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local:
# SESSION_ID=your_session_id  (from dashboard-alpha.cortensor.network/session)
# CORTENSOR_AUTH_TOKEN=your_token
# MOCK_CORTENSOR=true          # set false when real router is running
# GITHUB_TOKEN=ghp_...         # optional, for GitHub monitoring
```

### 3. Run

```bash
npm run dev
# Open http://localhost:3000
```

### With Docker (optional)

```bash
docker run -p 5010:5010 -e AUTH_TOKEN=default-dev-token cortensor/router:latest
```

---

## 🤖 Cortensor Integration

### Session Management
- Create sessions at [dashboard-alpha.cortensor.network/session](https://dashboard-alpha.cortensor.network/session)
- Store Session ID in `SESSION_ID` env var
- All agent calls use `POST /api/v1/completions/:sessionId`

### Router Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/completions/:sessionId` | POST | All agent inferences |
| `/api/v1/status` | GET | RouterHealthAgent |
| `/api/v1/miners` | GET | Miner count & activity |

### Main call (exact spec from project.md):

```typescript
const callCortensor = async (prompt: string, sessionId: number, stream = false) => {
  const res = await fetch(`http://localhost:5010/api/v1/completions/${sessionId}`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer default-dev-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, stream, timeout: 90 }),
  });
  return res.json();
};
```

---

## 🔬 PoI Verification (verifyWithPoI)

Every critical output is verified with 3x redundant Cortensor calls:

```typescript
// lib/verify-poi.ts
const [r1, r2, r3] = await Promise.all([
  callCortensor(prompt),
  callCortensor(prompt + "\n(Be concise.)"),
  callCortensor("Analyze: " + prompt),
]);

// RubricAgent scores all 3
const rubricScores = await Promise.all(
  [r1, r2, r3].map((r, i) => scoreWithRubric(prompt, r.content, i))
);

// Evidence bundle: { taskId, timestamp, threeRawResponses, rubricScores, overallScore, ... }
```

---

## 📦 Evidence Bundle Schema

```json
{
  "taskId": "uuid",
  "timestamp": "2026-02-21T19:00:00Z",
  "originalPrompt": "Run full incident detection...",
  "threeRawResponses": ["...", "...", "..."],
  "rubricScores": [
    { "score": 87, "reasoning": "Coherent and helpful", "consensusLevel": "HIGH", "runIndex": 0 }
  ],
  "finalAggregatedOutput": "...",
  "sessionIds": [1],
  "evidenceList": [
    {
      "sessionId": 1,
      "minersUsed": 10,
      "confidence": 0.91,
      "aggregateVerdict": "PASS",
      "latencyMs": 1240,
      "dispersion": 0.08
    }
  ],
  "overallScore": 85,
  "consensusLevel": "HIGH"
}
```

---

## 🛡️ Safety Constraints

All prompts pass through `isSafePrompt()` before reaching the router:

- ❌ Blocked: hacking, exploits, DDoS, phishing, malware
- ❌ Blocked: crypto trading advice, price predictions
- ❌ Blocked: harmful off-topic requests
- ✅ Allowed: DevOps monitoring, incident analysis, GitHub summaries, community health

Example refusal:
```
User: "How to hack the Cortensor network?"
Agent: "I'm unable to assist with that request. As a Cortensor DevOps agent, 
        I'm here to help with infrastructure monitoring..."
```

---

## 🔁 Replay Script

```bash
npm run replay -- taskId=<uuid>
```

Outputs full agent transcript + evidence bundle summary from SQLite.

---

## 📊 Agent Architecture

| Agent | Cortensor Calls | Purpose |
|---|---|---|
| CoordinatorAgent | 1 | Break goal into subtasks |
| RouterHealthAgent | 1 + direct API | Router/miner health |
| GitHubMonitorAgent | 1 + GitHub REST | PR/issue summaries |
| VerifierAgent | 3 + 3 (rubric) | PoI verification |
| ReporterAgent | 1 | Final report generation |

**Total per full loop: ~10 Cortensor calls**

---

## 🌍 Public Good Value

- **Reusable templates:** Every agent is a standalone module others can fork for their own Cortensor apps
- **Observability dashboard:** Cortensor team can use this to monitor their own network
- **Replay scripts:** Any task can be replayed for auditing
- **Evidence bundles:** Downloadable proof of every AI decision

---

## 📹 Demo Flow (2-min video script)

1. `npm run dev` → open `http://localhost:3000`
2. Top bar shows Session ID + Router endpoint + green "ROUTER OK"
3. Type: **"Run full incident detection on Cortensor network"** or click **Run Full Loop**
4. Watch live transcript: Coordinator → Router + GitHub (parallel) → Verifier (3x PoI) → Reporter
5. Evidence Explorer tab: expand any row → see raw miner votes, confidence, dispersion
6. Click **Download Evidence** → get JSON bundle
7. Safety demo: type "How to hack the network?" → polite refusal inline
8. `npm run replay -- taskId=<from logs>` in terminal

---

## License

MIT © 2026 [0xshobha](https://github.com/0xshobha)
