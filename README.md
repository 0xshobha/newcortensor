<p align="center">
  <img src="https://img.shields.io/badge/Cortensor-Hackathon%20%234-00ff88?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6TTIgMTdsMTAgNSAxMC01TTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="Hackathon #4"/>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15"/>
  <img src="https://img.shields.io/badge/LangGraph.js-Multi--Agent-blue?style=for-the-badge" alt="LangGraph.js"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

# 🧠 CAOH – Cortensor Agentic Ops Hub

> **A verifiable multi-agent DevOps & community orchestrator built on Cortensor's decentralized inference protocol.**

CAOH is a production-ready dashboard that orchestrates 5 specialized AI agents to monitor Cortensor network health, analyze GitHub community activity, verify outputs via Proof-of-Inference (PoI), and generate comprehensive status reports — all powered by Cortensor's decentralized miner network.

---

## 🏆 Hackathon #4 Submission

| Category | Details |
|----------|---------|
| **Hackathon** | [Cortensor Hackathon #4](https://dorahacks.io/hackathon/1905/detail) |
| **Theme** | Agent Apps: Delegate, Execute, Verify |
| **Team** | [@0xshobha](https://github.com/0xshobha) |
| **Live Demo** | [localhost:3000](http://localhost:3000) (local) |
| **License** | MIT |

---

## ✨ Key Features

### 🤖 Multi-Agent Orchestration
Five specialized agents work together via a LangGraph.js state machine:

```
┌──────────────────────────────────────────────────────────┐
│                    User Goal Input                        │
│                         │                                 │
│                  ┌──────▼──────┐                          │
│                  │ Coordinator │  ← Plans & delegates     │
│                  │   Agent     │    via Cortensor          │
│                  └──────┬──────┘                          │
│                         │                                 │
│              ┌──────────┴──────────┐                      │
│              │                     │   ← Parallel          │
│       ┌──────▼──────┐       ┌──────▼──────┐               │
│       │RouterHealth │       │  GitHub     │               │
│       │   Agent     │       │  Monitor   │               │
│       └──────┬──────┘       └──────┬──────┘               │
│              └──────────┬──────────┘                      │
│                         │                                 │
│                  ┌──────▼──────┐                          │
│                  │  Verifier   │  ← 3x redundant PoI      │
│                  │   Agent     │    with rubric scoring    │
│                  └──────┬──────┘                          │
│                         │                                 │
│                  ┌──────▼──────┐                          │
│                  │  Reporter   │  ← Final Markdown report │
│                  │   Agent     │    via Cortensor          │
│                  └──────┴──────┘                          │
└──────────────────────────────────────────────────────────┘
```

### 🔐 Proof-of-Inference (PoI) Verification
- **3x redundant Cortensor calls** with varied prompts
- **Rubric scoring** (correctness, consistency, usefulness)
- **Consensus levels** (HIGH / MEDIUM / LOW)
- **Downloadable evidence bundles** as JSON

### 📊 Observability Dashboard
- Real-time agent performance metrics
- Per-agent success rates, latency, and Cortensor call counts
- Task history with status tracking
- Network health monitoring (miners, block height, version)

### 🛡️ Safety Guardrails
- Harmful/off-topic request detection and refusal
- Prompt length limits (8K chars max)
- Structured refusal logging with evidence

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **Agent Orchestration** | LangGraph.js (state machine) |
| **AI Inference** | Cortensor Router API (`POST /api/v1/completions/:sessionId`) |
| **Database** | SQLite via better-sqlite3 (with Vercel fallback) |
| **GitHub API** | Octokit (PRs, issues, community metrics) |
| **Deployment** | Vercel (frontend + API routes) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/0xshobha/newcortensor.git
cd newcortensor/apps/cortensor-agentic-ops-hub
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Cortensor Router (local or remote)
CORTENSOR_ROUTER_URL=http://localhost:5010
SESSION_ID=1
CORTENSOR_AUTH_TOKEN=default-dev-token

# Mock mode for demo (no real router needed)
MOCK_CORTENSOR=true

# GitHub monitoring (optional)
GITHUB_TOKEN=your_github_pat_here
GITHUB_ORG=cortensor
```

### 3. Run

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Try It

1. Go to **Agent Chat** tab
2. Type a goal like: `"Run full incident detection on Cortensor network"`
3. Watch the 5 agents execute in sequence
4. Check **Evidence Explorer** for PoI verification bundles
5. Check **Observability** for performance metrics

---

## 📁 Project Structure

```
apps/cortensor-agentic-ops-hub/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main dashboard (tabs)
│   ├── layout.tsx                # Root layout with sidebar/topbar
│   └── api/                      # API routes
│       ├── agent/run/route.ts    # POST – run agent loop
│       ├── agent/replay/route.ts # POST – replay past tasks
│       ├── cortensor/route.ts    # POST – proxy to Cortensor router
│       ├── evidence/[taskId]/    # GET – download evidence bundle
│       ├── observability/        # GET – metrics & stats
│       └── status/route.ts      # GET – router health check
│
├── components/                   # React UI components
│   ├── AgentChat.tsx             # Chat interface with agent loop
│   ├── EvidenceExplorer.tsx      # PoI evidence browser
│   ├── ObservabilityTable.tsx    # Performance dashboard
│   ├── NetworkStatus.tsx         # Router health display
│   ├── Sidebar.tsx               # Agent status & evidence log
│   └── TopBar.tsx                # Session info & controls
│
├── lib/                          # Core logic
│   ├── cortensor.ts              # Cortensor Router integration
│   ├── graph.ts                  # LangGraph state machine
│   ├── db.ts                     # SQLite persistence layer
│   ├── evidence.ts               # Evidence bundle builder
│   ├── rubric.ts                 # Rubric scoring agent
│   ├── verify-poi.ts             # 3x PoI verification
│   └── agents/                   # Specialized agents
│       ├── coordinator.ts        # Goal → subtask planner
│       ├── router-health.ts      # Network health monitor
│       ├── github-monitor.ts     # GitHub PR/issue analyzer
│       ├── verifier.ts           # PoI verification orchestrator
│       └── reporter.ts           # Final report generator
│
├── scripts/
│   └── replay.ts                 # CLI: replay past task transcripts
│
├── .env.example                  # Environment template
├── .env.production               # Production env template
├── vercel.json                   # Vercel deployment config
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind + custom theme
└── package.json                  # Dependencies & scripts
```

---

## 🔗 Cortensor Integration Details

Every agent delegates reasoning to Cortensor's decentralized inference network:

| Agent | Cortensor Usage | Calls per Run |
|-------|----------------|---------------|
| **CoordinatorAgent** | Goal decomposition → subtask plan | 1 |
| **RouterHealthAgent** | Analyze health data → incidents & recommendations | 1 |
| **GitHubMonitorAgent** | Analyze PR/issue data → community summary | 1 |
| **VerifierAgent** | 3x redundant inference + rubric scoring | 3 + 3 |
| **ReporterAgent** | Generate final Markdown report | 1 |
| **Total** | | **~10 per loop** |

### API Endpoint
```
POST {CORTENSOR_ROUTER_URL}/api/v1/completions/{SESSION_ID}
Authorization: Bearer {CORTENSOR_AUTH_TOKEN}
Content-Type: application/json

{
  "prompt": "...",
  "stream": false,
  "timeout": 90
}
```

### Evidence Bundle Format
```json
{
  "taskId": "uuid",
  "timestamp": "2026-02-28T...",
  "originalPrompt": "...",
  "threeRawResponses": ["run1", "run2", "run3"],
  "rubricScores": [
    { "runIndex": 0, "score": 85, "consensusLevel": "HIGH", "reasoning": "..." }
  ],
  "overallScore": 85,
  "consensusLevel": "HIGH",
  "evidenceList": [
    { "sessionId": 1, "minersUsed": 10, "confidence": 0.92, "latencyMs": 840 }
  ]
}
```

---

## 🖥️ Dashboard Screenshots

### Agent Chat
Interactive chat interface where users type goals and watch agents execute in real-time.

### Evidence Explorer
Browse PoI verification bundles with scores, consensus levels, and downloadable evidence.

### Observability Dashboard
Full metrics: task counts, success rates, Cortensor calls, per-agent performance table.

---

## 🧪 Mock Mode

For demos and development without a live Cortensor router:

```env
MOCK_CORTENSOR=true
```

Mock mode provides:
- Realistic response variety (healthy / degraded / incident scenarios)
- Simulated miner data with configurable confidence levels
- Proper evidence bundles with mock PoI metadata
- Randomized latency (600–2000ms) for realistic feel

---

## 🚢 Deployment (Vercel)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com) → select `apps/cortensor-agentic-ops-hub`
3. Add environment variables:
   - `CORTENSOR_ROUTER_URL`
   - `CORTENSOR_AUTH_TOKEN`
   - `SESSION_ID`
   - `MOCK_CORTENSOR=true`
   - `NEXT_PUBLIC_SESSION_ID`
   - `NEXT_PUBLIC_ROUTER_URL`
4. Deploy

> **Note**: SQLite is not available on Vercel serverless. The app gracefully falls back to stateless mode — agents still run, but task history isn't persisted between requests.

---

## 📜 Scripts

```bash
# Development
npm run dev          # Start dev server with Turbopack

# Build
npm run build        # Production build
npm start            # Start production server

# Utilities
npm run replay       # Replay past agent transcripts from SQLite
npm run lint         # Run ESLint
```

---

## 🏗️ Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **LangGraph.js** | Type-safe state machine with conditional edges, better than ad-hoc chains |
| **Parallel fan-out** | RouterHealth + GitHub run concurrently to reduce total latency |
| **3x PoI verification** | Redundant inferences catch outliers, consensus scoring builds trust |
| **SQLite + graceful fallback** | Works locally for replay; degrades gracefully on Vercel |
| **Safety guardrails** | Regex-based harmful pattern detection prevents misuse |
| **Mock mode** | Essential for development, demos, and CI without a live router |

---

## 🔒 Safety & Ethics

- **Prompt filtering**: Rejects hacking, phishing, financial advice requests
- **Structured refusals**: Logged with evidence for auditability
- **On-topic enforcement**: Only DevOps, monitoring, and community queries accepted
- **No sensitive data storage**: Auth tokens never logged; `.env` files gitignored

---

## 📝 License

This project is licensed under the **MIT License** – see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- [Cortensor](https://cortensor.network) – Decentralized AI inference protocol
- [LangGraph.js](https://github.com/langchain-ai/langgraphjs) – Multi-agent orchestration
- [Next.js](https://nextjs.org) – React framework
- [shadcn/ui](https://ui.shadcn.com) – UI components

---

<p align="center">
  Built with 💚 for <a href="https://dorahacks.io/hackathon/1905/detail">Cortensor Hackathon #4</a>
</p>
