# FPC-SORVAX

**Forensic Provenance Chain — Security Operations, Vulnerability Analysis & eXamination**

A cybersecurity incident response platform that provides end-to-end case management with cryptographic evidence integrity, hash-linked provenance chains, an adapter-based investigation engine, and AI-assisted analysis.

---

## Problem

Cybersecurity incident response teams face a critical trust problem: evidence can be tampered with, investigation records can be altered, and there is no cryptographically verifiable chain connecting evidence to findings to actions. Manual workflows lack auditability, and existing tools don't provide end-to-end provenance from detection through remediation.

## Solution

FPC-SORVAX solves this by establishing **three independent trust boundaries**:

1. **Evidence Trust** — Every evidence item is hashed with SHA-256 at registration time. Any modification is detected by re-hashing and comparing against the stored fingerprint.

2. **Provenance Trust** — Every action creates a hash-linked provenance record. Each record's hash includes the previous record's hash, forming an immutable chain. Breaking any link in the chain is detectable.

3. **AI Assistance (Non-Authoritative)** — AI provides analysis, summaries, and recommendations but never modifies evidence hashes or provenance records. AI outputs are cached, fingerprinted, and stored in an audit trail with their own provenance events.

---

## Key Features

| Feature | Status |
|---------|--------|
| 11-stage incident response workflow | ✅ Implemented |
| SHA-256 evidence hashing & integrity verification | ✅ Implemented |
| Hash-linked provenance chain (tamper-evident audit log) | ✅ Implemented |
| Adapter-based investigation engine | ✅ Implemented |
| OpenAI real AI integration (Responses API) | ✅ Implemented |
| MockAI fallback when OpenAI is unavailable | ✅ Implemented |
| AI audit trail & input fingerprinting | ✅ Implemented |
| Case transfer with handover summaries | ✅ Implemented |
| Initial report before remediation | ✅ Implemented |
| Post-patch final report | ✅ Implemented |
| Monitoring dashboard | ✅ Implemented |
| Evidence tamper simulation & detection | ✅ Implemented |
| File upload with binary SHA-256 hashing | ✅ Implemented |
| Army simulated environment compatibility | ✅ Designed |
| Nmap integration | 🔜 Planned |
| OWASP ZAP integration | 🔜 Planned |
| Real-time Army network connector | 🔜 Planned |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FPC-SORVAX                            │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌────────────┐  │
│  │   React 18   │───▶│  Express 5   │──▶│  SQLite    │  │
│  │  Vite + Tail │    │  Backend     │   │  DB        │  │
│  └─────────────┘    └──────┬───────┘   └────────────┘  │
│                            │                            │
│              ┌─────────────┼─────────────┐              │
│              ▼             ▼             ▼              │
│     ┌──────────────┐ ┌───────────┐ ┌──────────────┐    │
│     │ Investigation│ │    AI     │ │ Provenance   │    │
│     │   Engine     │ │  Service  │ │   Chain      │    │
│     └──────┬───────┘ └─────┬─────┘ └──────────────┘    │
│            │               │                            │
│     ┌──────▼───────┐ ┌─────▼─────┐                     │
│     │   Adapter    │ │  OpenAI   │                     │
│     │   Registry   │ │  MockAI   │                     │
│     └──────────────┘ └───────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 11-Stage Case Workflow

FPC-SORVAX guides each incident through a structured lifecycle:

| # | Stage | Description |
|---|-------|-------------|
| 1 | **Detected** | Security issue identified; case created |
| 2 | **Evidence** | Evidence collected, hashed (SHA-256), and integrity-verified |
| 3 | **Investigated** | Investigation engine normalizes evidence, correlates events, identifies findings |
| 4 | **Issue Found** | Findings documented with severity, confidence, and supporting evidence |
| 5 | **Initial Report** | AI-generated case summary before any remediation is attempted |
| 6 | **Next Action** | Decision point: Continue to remediation, or Transfer case to another officer |
| 7 | **Fix** | AI-assisted remediation recommendation; officer approves before execution |
| 8 | **Verify** | Security tests, regression tests, system checks, independent verification |
| 9 | **Deploy** | Patch deployment with post-deployment verification |
| 10 | **Monitor** | Continuous monitoring: system state, evidence integrity, runtime audit |
| 11 | **Complete** | Final post-patch report generated; case closed |

---

## Evidence Integrity Model

Every evidence item follows this lifecycle:

```
Registration:
  Content → SHA-256 Hash → Stored in DB
  Evidence ID + Hash → First Provenance Event (EVIDENCE_REGISTERED)

Verification:
  Stored Content → Re-hash → Compare with Stored Hash
  Match? → VERIFIED  |  Mismatch? → COMPROMISED

Tamper Detection:
  SimulateTamper modifies content in storage
  Re-verification detects hash mismatch
  Provenance event INTEGRITY_FAILURE recorded
```

---

## Provenance / Hash-Chain Model

Every action creates a provenance record with:

- **Event ID** — Unique identifier
- **Case ID** — Associated case
- **Evidence ID** — Related evidence (if applicable)
- **Event Type** — What happened (e.g., `EVIDENCE_REGISTERED`, `FINDING_CREATED`, `AI_CASE_SUMMARY_GENERATED`)
- **Actor** — Who/what performed the action (officer, system, AI)
- **Previous Record Hash** — Hash of the preceding record (or `GENESIS` for the first)
- **Record Hash** — SHA-256 of the canonicalized record fields

The chain is verified by:
1. Recalculating each record's hash from its fields
2. Checking that each record's `previous_record_hash` matches the preceding record's `record_hash`
3. Detecting any break in the chain

---

## Investigation Engine

The investigation engine uses an **adapter architecture**:

```
External Source → Adapter → Normalized Events → Correlation → Timeline → Findings
```

**Adapter Registry** supports multiple data sources:

- **MockAdapter** — Built-in adapter for simulated environments (currently active)
- Future: Army network adapter, log aggregator, SIEM connector

The engine:
1. Retrieves all evidence for a case
2. Passes evidence through the selected adapter for normalization
3. Correlates normalized events into a timeline
4. Identifies suspicious patterns and generates findings
5. Stores all results with provenance events

---

## AI Architecture

```
Investigation Data → AIService → AIProvider → Response
                                 ↓
                         Provenance Event
                         Audit Trail Event
```

### Provider Selection

| Config | Result |
|--------|--------|
| `AI_PROVIDER=openai` + `OPENAI_API_KEY` set | Uses OpenAI Responses API |
| `AI_PROVIDER=openai` + no key | Falls back to MockAI (with warning) |
| `AI_PROVIDER=mock` (default) | Uses MockAI |

### Five AI Capabilities

1. **Case Summary** — AI-generated overview of case status, findings, and recommendations
2. **Finding Explanation** — Detailed explanation of why a finding is suspicious
3. **Remediation Recommendation** — Risk-aware fix recommendation with rollback guidance
4. **Case Handover** — Summary for transferring case to another officer
5. **Anomaly Analysis** — Analysis of provenance/integrity anomalies

### OpenAI + MockAI Fallback

When `AI_PROVIDER=openai` and the primary provider fails with a transient error (rate limit, timeout, network), AIService automatically falls back to MockAI:

- Fallback is **never** triggered for application/programming errors
- Fallback metadata is included in every response
- All fallback events are recorded in the audit trail

### AI Audit Trail

Every AI interaction is recorded in the `ai_interactions` table with:
- Input fingerprint (SHA-256 of canonicalized input)
- Output hash (SHA-256 of response)
- Provider used, model, status, error message
- Cached responses for identical inputs (cost optimization)

### Trust Boundary Enforcement

- AI outputs **never** modify evidence hashes
- AI outputs **never** modify provenance record hashes
- AI results are stored separately from evidence and provenance
- All AI outputs include disclaimers requiring officer verification/approval

---

## Optional Case Transfer

Cases can be transferred between officers at the **Decision** stage:

1. Officer selects "Transfer Case"
2. AI generates a handover summary (findings, evidence, completed/pending actions)
3. Receiving officer accepts the handover
4. Provenance events `CASE_TRANSFERRED` and `HANDOVER_ACCEPTED` are recorded
5. Case assignment is updated

---

## Army Simulated Environment Compatibility

FPC-SORVAX is designed for compatibility with Army simulated training environments:

- **Adapter architecture** allows plugging in Army-specific data sources without modifying the core engine
- **AI is adapter-agnostic** — works with any normalized data regardless of source
- **No hardcoded network assumptions** — the platform operates on normalized events, not raw network data
- Future: Army network adapter, Nmap/ZAP integration, real-time network connector

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6, Tailwind CSS, Vite 5 |
| Backend | Express 5, Node.js (ES modules) |
| Database | SQLite (better-sqlite3) |
| AI | OpenAI SDK (Responses API), MockAI fallback |
| Testing | Vitest |
| Integrity | SHA-256 (Node.js crypto), hash-linked provenance chain |
| Build | Vite (frontend), Node.js (backend) |

---

## Repository Structure

```
fpc-sorvax/
├── server/                    # Express 5 backend
│   ├── index.js               # Server entry point
│   ├── db.js                  # SQLite database & schema
│   ├── seed.js                # Demo data seeder
│   ├── routes/                # API routes
│   │   ├── cases.js           # Case CRUD & workflow
│   │   ├── evidence.js        # Evidence registration & verification
│   │   ├── provenance.js      # Provenance chain queries
│   │   ├── investigation.js   # Investigation engine
│   │   └── ai.js              # AI endpoints
│   ├── services/              # Business logic
│   │   ├── case.js            # Case management
│   │   ├── evidence.js        # Evidence service
│   │   ├── integrity.js       # SHA-256 hashing & chain verification
│   │   ├── provenance.js      # Provenance event recording
│   │   ├── investigation.js   # Investigation engine
│   │   └── ai/                # AI integration
│   │       ├── AIService.js   # Provider-agnostic orchestration
│   │       ├── auditTrail.js  # AI audit trail
│   │       ├── errors.js      # Error classification & fallback logic
│   │       ├── prompts/       # LLM prompt templates
│   │       └── providers/     # AI provider implementations
│   │           ├── AIProvider.js       # Abstract base class
│   │           ├── MockAIProvider.js   # Deterministic mock responses
│   │           └── OpenAIProvider.js   # Real OpenAI integration
│   └── integrations/          # Adapter architecture
│       ├── index.js           # Adapter registry
│       ├── adapters/          # Base adapter interface
│       └── mock/              # Mock adapter for demo
├── src/                       # React frontend
│   ├── App.jsx                # Router
│   ├── main.jsx               # Entry point
│   ├── api/                   # API client
│   ├── components/            # UI components
│   │   ├── ai/                # AI cards & analysis
│   │   ├── case/              # 11-stage workflow components
│   │   ├── layout/            # App shell, header, sidebar
│   │   ├── reports/           # Final case report
│   │   ├── ui/                # Reusable UI elements
│   │   └── alerts/            # Tamper alerts
│   ├── context/               # React context providers
│   ├── data/                  # Seed data & constants
│   └── pages/                 # Route pages
├── tests/                     # Vitest test suite
├── data/                      # Runtime SQLite database (gitignored)
├── dist/                      # Build output (gitignored)
├── .env.example               # Environment template
├── package.json               # Dependencies & scripts
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
└── vitest.config.js           # Test configuration
```

---

## Installation

```bash
# Clone the repository
git clone https://github.com/sorvax/fpc-sorvax.git
cd fpc-sorvax

# Install dependencies
npm install
```

## Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and configure your settings
# At minimum, AI_PROVIDER=mock works out of the box with no API key
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | No | `mock` | `mock` or `openai` |
| `OPENAI_API_KEY` | Only if openai | — | OpenAI API key (server-side only) |
| `OPENAI_MODEL` | No | `gpt-4.1-nano` | OpenAI model to use |
| `AI_FALLBACK_ENABLED` | No | `true` | Auto-fallback to MockAI on transient errors |
| `AI_FALLBACK_PROVIDER` | No | `mock` | Fallback provider type |
| `PORT` | No | `3001` | Backend server port |

---

## Running the Application

### Development Mode

```bash
# Start backend and frontend simultaneously
npm run dev:all

# Or start them separately:
npm run dev:server    # Backend on http://localhost:3001
npm run dev           # Frontend on http://localhost:5173
```

### Production Build

```bash
npm run build         # Build frontend to dist/
npm run preview       # Preview production build
```

---

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

### Test Status

```
Test Files  9 passed (9)
Tests       256 passed | 3 skipped (259)
```

The 3 skipped tests are manual integration tests that require interactive input or external services.

---

## Security Notice

> **⚠️ Never commit `.env` files, API keys, credentials, tokens, or other secrets to this repository.**

- OpenAI API keys are read **server-side only** — they never reach the frontend, browser, or React code.
- The `.env` file is listed in `.gitignore` and will not be tracked by Git.
- Always use `.env.example` as a template and fill in your actual values locally.
- If you accidentally commit a secret, rotate it immediately and remove it from Git history.

---

## Current Limitations

- SQLite is used for development/demo purposes; production deployment would benefit from a persistent database server
- The investigation engine currently ships with a MockAdapter; real-world adapters (Army network, SIEM, etc.) are planned
- AI responses depend on OpenAI API availability; MockAI provides deterministic fallback but not real analysis
- No authentication/authorization layer — designed for single-user demo/training environments
- The platform operates on simulated data; no live network monitoring is implemented yet

---

## Future Roadmap

| Feature | Status | Description |
|---------|--------|-------------|
| Nmap integration | 🔜 Planned | Network scanning and vulnerability discovery |
| OWASP ZAP integration | 🔜 Planned | Dynamic application security testing |
| Army network adapter | 🔜 Planned | Real-time Army network data connector |
| Authentication layer | 🔜 Planned | Role-based access control |
| PostgreSQL support | 🔜 Planned | Production database backend |
| WebSocket real-time updates | 🔜 Planned | Live monitoring and case updates |
| Evidence file storage | 🔜 Planned | S3-compatible object storage for large evidence files |
| Multi-case correlation | 🔜 Planned | Cross-case pattern detection |

---

## License

This project was developed for the Sorvax Hackathon.

---

**Built for the Sorvax GitHub Organization — FPC-SORVAX v1.0.0**
