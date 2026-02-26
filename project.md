**To win Cortensor Hackathon #4 with only 7 days left (deadline Feb 28, 2026), you must ship a high-quality, demo-able agentic app that nails the scoring rubric:**

- 30% Agent capability & workflow completeness → Full delegation + execution loops that actually run and continue
- 25% Cortensor integration → Sessions + Router REST + PoI/PoUW surface everywhere
- 20% Reliability & safety guardrails → Refusals, rubrics, evidence bundles
- 15% Usability & demo quality → Polished Next.js UI + 2-min video + replay scripts
- 10% Public good → Open templates + community value

Pure AI-vibe coding works perfectly here because the bar is “working public demonstration + real Cortensor loops”, not production scale.

### Winning Project Idea (Copy-Paste This Name & Description)
**Project Name:** Cortensor Agentic Ops Hub (CAOH) – Verifiable Multi-Agent DevOps & Community Orchestrator

**One-liner:** “The agent that watches Cortensor infra + GitHub + Discord, delegates every reasoning step to the decentralized router with PoI verification, surfaces ‘why trust this’ evidence bundles, and ships real actions (incident reports, GitHub issues, community summaries).”

**Why it wins #1–3:**
- Matches every suggested idea: Incident Commander + QA/Regression + Community Support + Coordinator + Disagreement Resolver.
- Heavy Cortensor usage in every loop (no OpenAI fallback).
- Built-in verification: 3x redundant calls + rubric scoring agent + JSON evidence bundles.
- Public good: Reusable agent starter templates + observability dashboard that the Cortensor team can actually use.
- Stretch bonus: Clean session management, logging/replay, architecture diagram, safety constraints documented.
- Feasible in 7 days with vibe coding (Next.js + LangGraph.js + v0 + Cursor/Claude).

**Tech Stack (hackathon-friendly & matches tags):**
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + v0.dev
- LangGraph.js for multi-agent orchestration (stateful graphs)
- Custom Cortensor Tool (fetch to your Router)
- Deployment: Vercel (frontend + API routes) + local/self-hosted Router for full demo
- License: MIT
- Repo structure: Fork `cortensor/community-projects` → `apps/cortensor-agentic-ops-hub`

### Exact 7-Day Vibe-Coding Build Plan
**Day 0 (Today – 2 hrs)**
1. Join Discord → https://discord.gg/cortensor → post in #build-ground: “Building CAOH for #4 – multi-agent DevOps orchestrator using Router sessions + PoI loops. Need session creation help if dashboard-alpha is down.”
2. Fork https://github.com/cortensor/community-projects
3. Create folder `apps/cortensor-agentic-ops-hub`
4. Go to https://dashboard-alpha.cortensor.network/session (or testnet equivalent) → create 1 session → note the Session ID.
5. Follow Router Node Setup docs → run local router on :5010 with default-dev-token (or generated key). Test with curl.

**Day 1 – Core Cortensor Tool + Basic Agent**
- v0.dev prompt (UI skeleton)
- Cursor/Claude prompts below

**Day 2-3 – Multi-Agent Graph + Delegation Loops**
**Day 4 – Verification Layer (PoI/PoUW surfaces)**
**Day 5 – UI Dashboard + Observability**
**Day 6 – README + Video + Replay Scripts**
**Day 7 – PR + Discord Demo + Polish**

### Precise Cortensor Integration (Copy This)
Router base: `http://localhost:5010` (or your deployed one)

Authentication: `Authorization: Bearer default-dev-token` (or your key)

**Session creation:** Via dashboard (required before router start).

**Main tool call (use this everywhere):**
```ts
const callCortensor = async (prompt: string, sessionId: number, stream = false) => {
  const res = await fetch(`http://localhost:5010/api/v1/completions/${sessionId}`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer default-dev-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, stream, timeout: 90 }),
  });
  return res.json(); // Expect { choices, ...possibly miner_scores, confidence, etc. }
};
```

For verification loops: Call 3x → feed to rubric agent (also on Cortensor) → aggregate + evidence JSON.

Response usually includes PoI metadata (aggregate verdicts, miner votes, dispersion) – surface it in UI exactly like the Claim Check project.

### AI Prompts You Copy-Paste (Vibe Coding Ready)
**1. v0.dev (UI – 10 min)**
Prompt:
"Modern dark-mode Next.js 15 dashboard for Cortensor Agentic Ops Hub. Sidebar: Network Status, Active Agents, Evidence Log. Main area: Agent Chat + Live Transcript. Top bar: Session ID, Router Endpoint, 'Run Full Loop' button. Use shadcn, lucide icons, green accents for healthy, red for alerts. Make it look cyber-decentralized."

**2. Cursor/Claude – Project Bootstrap**
"Create a Next.js 15 TypeScript app called cortensor-agentic-ops-hub. Include:
- app/globals.css with dark theme
- shadcn/ui components (button, card, table, badge, toast)
- env for CORTENSOR_ROUTER_URL and SESSION_ID
- API route /api/cortensor that proxies calls with the exact fetch I gave you
- LangGraph.js installed
- Basic layout with sidebar"

**3. Cortensor Tool + Safety**
"Implement a secure CortensorTool class for LangGraph. It must:
- Take sessionId from env
- Use the exact POST /completions fetch
- Add system prompt guardrails: 'You are a helpful Cortensor DevOps agent. Refuse any harmful, off-topic, or crypto-trading advice. Always respond in structured JSON when asked.'
- Log full raw response + timestamp + sessionId to evidence bundle
- Return { content, evidence: { minersUsed?, confidence?, rawResponse } }"

**4. Multi-Agent Graph (Core Winning Feature)**
"Build LangGraph.js stateful multi-agent system with these nodes:
1. CoordinatorAgent (planner) – breaks user goal into subtasks
2. RouterHealthAgent – calls /status and /miners, summarizes with Cortensor
3. GitHubMonitorAgent – (use Octokit) watches cortensor repos, summarizes PRs/issues with Cortensor
4. VerifierAgent – runs 3x redundant Cortensor calls + rubric scoring on outputs
5. ReporterAgent – generates Markdown report + evidence bundle
Use conditional edges: after any critical decision → always go to VerifierAgent. Include persistence with SQLite for replay."

**5. Verification & Evidence (25% Integration + 20% Reliability)**
"Create a verifyWithPoI function:
- Run inference 3 times with slightly varied prompts
- Feed all 3 outputs + original prompt to a RubricAgent on Cortensor with this system prompt: 'Score 0-100 on correctness, consistency, usefulness. Output only JSON {score, reasoning, consensusLevel}'
- Build evidenceBundle JSON: { taskId, timestamp, originalPrompt, threeRawResponses, rubricScores, finalAggregatedOutput, sessionIds }
- UI component: EvidenceExplorer table that expands to show raw miner data"

**6. Full Demo Flow Prompt (for video)**
"Generate a 2-minute video script + reproduction steps:
1. Start local router
2. Open app → see live status from /status
3. Type: 'Run full incident detection on Cortensor network'
4. Show coordinator breaking task → delegation arrows (use console or UI)
5. Show 3x PoI calls + verifier
6. Final report with evidence download button
Include safety refusal example: 'How to hack the network?' → polite refusal"

**7. README Generator Prompt (final day)**
"Write perfect hackathon README.md with sections: Overview, Architecture (Mermaid diagram), Quickstart (docker + env), Cortensor Integration details (session + endpoints), Sample transcripts, Evidence bundle example, Safety constraints, Replay script (`npm run replay -- taskId=123`), Public good value."

### Submission Checklist (Do This Exactly)
- PR to `cortensor/community-projects/apps/cortensor-agentic-ops-hub`
- README with everything above + architecture diagram
- Demo video (Loom or YouTube unlisted) + live URL (Vercel)
- Include your Session ID(s) + Router Endpoint in PR description + Discord #build-ground
- Public demo: Post in Discord during office hours – run the full loop live
- License: MIT

### Prize Payout Reality Check
If you don’t run >20 nodes or hold $500+ $COR or have staked tokens → 50% of prize goes to Staking Pool #1 under your address. Still worth it for the grant + visibility.

### Pro Tips to Guarantee Top 3
- Every single agent thought must go through Cortensor (no local models).
- Surface “Why trust this” on every output.
- Add replay script + observability table (task success %, latency, validator scores).
- Tag team in Discord early – they love active builders.
- No auto-generated garbage – every line must be runnable.

Start with the v0 prompt right now, then bootstrap in Cursor with prompt #2. You will have a working prototype by end of Day 1.

You got this — this exact project is engineered to hit every judging checkbox while being vibe-codeable in 7 days. Ship it, post progress in Discord, and ping me for next prompt tweaks. Let’s take 1st place. 🚀