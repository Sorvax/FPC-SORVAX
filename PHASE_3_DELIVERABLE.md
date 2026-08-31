# PHASE 3 — REAL AI INTEGRATION FOR FPC–SORVAX

## Deliverable

---

## 1. Files Created/Modified

### Created
| File | Purpose |
|------|---------|
| `server/services/ai/AIService.js` | Main AI service with provider selection, input fingerprinting, caching, provenance recording |
| `server/services/ai/providers/AIProvider.js` | Abstract AI provider interface |
| `server/services/ai/providers/MockAIProvider.js` | Deterministic mock AI responses without external API calls |
| `server/services/ai/providers/OpenAIProvider.js` | Real AI responses via OpenAI API |
| `server/services/ai/prompts/caseSummary.js` | Prompt template for case summary generation |
| `server/services/ai/prompts/findingExplanation.js` | Prompt template for finding explanation |
| `server/services/ai/prompts/remediation.js` | Prompt template for remediation recommendation |
| `server/services/ai/prompts/handover.js` | Prompt template for handover summary |
| `server/services/ai/prompts/anomaly.js` | Prompt template for anomaly analysis |
| `server/routes/ai.js` | AI API routes (5 POST endpoints + 1 GET) |
| `tests/ai.test.js` | Comprehensive AI test suite (44 tests) |
| `.gitignore` | Protects API keys and build artifacts |
| `.env.example` | Environment variable documentation |

### Modified
| File | Change |
|------|--------|
| `server/db.js` | Added `ai_interactions` table with indexes; migration for existing DBs |
| `server/index.js` | Wired up AI routes at `/api/ai` |
| `src/api/client.js` | Added 6 AI API client methods |
| `src/components/ai/AICard.jsx` | Added provider indicator (REAL AI / SIMULATED AI), model info, cached indicator |
| `src/components/ai/AIInvestigationSummary.jsx` | Fetches real AI summary from backend; loading state; fallback to deterministic data |
| `src/components/ai/AIRecommendation.jsx` | Fetches real AI recommendation from backend; verification steps display; disclaimer |
| `src/components/ai/AIAnomalyAnalysis.jsx` | Fetches real AI anomaly analysis from backend; dynamic steps display |
| `src/components/case/CaseHandover.jsx` | Added AIHandoverSummary component fetching real AI handover |

---

## 2. Architecture Changes

### Before (Phase 2)
```
Investigation Engine → Findings → AI Service (deterministic stub)
                                     ↓
                              Hardcoded responses
```

### After (Phase 3)
```
Investigation Engine → Findings → AIService → AIProvider → Response
                                         ↓              ↓
                                   Provenance     ai_interactions
                                   Event          (cached)
```

The AI layer is now **provider-agnostic**. The investigation engine, provenance system, and case model are completely unchanged.

---

## 3. AI Provider Architecture

```
AIService
    ↓
AIProvider (abstract interface)
    ├── MockAIProvider   (deterministic, no API calls)
    └── OpenAIProvider   (real LLM via OpenAI API)
```

**Provider Selection:**
- `AI_PROVIDER=mock` (default) → MockAIProvider
- `AI_PROVIDER=openai` + `OPENAI_API_KEY=sk-...` → OpenAIProvider
- `AI_PROVIDER=openai` without key → Falls back to MockAIProvider with warning

**Key Design Decisions:**
- Provider is instantiated per-request (no shared state)
- API key is read server-side only, never exposed to frontend
- MockAIProvider generates realistic responses grounded in case data
- OpenAIProvider uses structured prompts with JSON output format

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/provider` | Current AI provider info |
| `POST` | `/api/ai/cases/:caseId/summary` | Generate case summary |
| `POST` | `/api/ai/findings/:findingId/explain` | Explain a finding |
| `POST` | `/api/ai/findings/:findingId/remediation` | Recommend remediation |
| `POST` | `/api/ai/cases/:caseId/handover` | Generate handover summary |
| `POST` | `/api/ai/anomalies/analyze` | Analyze an anomaly |

All endpoints return structured JSON with metadata including `correlationId`, `timestamp`, `aiEnhanced`, `provider`, `model`, and `sourceEvidenceIds`.

---

## 5. Database Changes

### New Table: `ai_interactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | Unique interaction ID (e.g. AI-a1b2c3d4) |
| `case_id` | TEXT FK | Parent case |
| `operation` | TEXT | Operation type (AI_CASE_SUMMARY_GENERATED, etc.) |
| `provider` | TEXT | AI provider type (mock, openai) |
| `model` | TEXT | Model name (MockAI, gpt-4o, etc.) |
| `input_reference` | TEXT | JSON reference to input data |
| `input_fingerprint` | TEXT | Deterministic hash of input for caching |
| `output` | TEXT | Full AI response (JSON) |
| `output_hash` | TEXT | SHA-256 of output for integrity |
| `status` | TEXT | success/error |
| `error_message` | TEXT | Error details if failed |
| `created_at` | TEXT | ISO 8601 timestamp |

**Indexes:** `idx_ai_interactions_case`, `idx_ai_interactions_fingerprint`

**Migration:** Automatically created for existing databases via `migrateSchema()`.

---

## 6. AI Capabilities Implemented

### A. Case Summary
- **Input:** Case info, evidence metadata, timeline, findings, verification status
- **Output:** Situation summary, important evidence, what happened, current status, recommended next step
- **Powers:** Case Handover functionality

### B. Finding Explanation
- **Input:** Finding, supporting evidence, supporting events, timeline, severity, confidence
- **Output:** What was detected, why suspicious, evidence support, likely impact, next investigation step
- **Safety:** Never invents evidence; every claim references specific IDs

### C. Remediation Recommendation
- **Input:** Finding, evidence, timeline, affected system
- **Output:** Recommended action, rationale, expected improvement, risks, verification steps
- **Safety:** Recommends only; never executes; human approval required

### D. Handover Summary
- **Input:** Case data, findings, timeline, evidence, completed/pending actions
- **Output:** Officer-friendly brief in plain language
- **Style:** Avoids unnecessary jargon; suitable for non-technical officers

### E. Anomaly Explanation
- **Input:** Anomaly, provenance records, evidence integrity state, timeline
- **Output:** What happened, why unusual, evidence support, next steps for officer
- **Safety:** Never invents facts; grounded in supplied data

---

## 7. Security Considerations

- **API Key Protection:** `OPENAI_API_KEY` is read server-side only; never sent to frontend; never in React code, Vite env vars, git, or browser storage
- **Server-Side Only:** All LLM calls happen in Express routes; frontend receives only the results
- **Evidence Separation:** AI output never overwrites evidence hashes or provenance records
- **Human Approval:** AI recommends; officers approve; no automatic execution
- **Disclaimers:** AI responses include "AI inference — requires officer verification" or "requires officer approval" messages
- **Output Integrity:** AI responses are SHA-256 hashed and stored in `ai_interactions` table
- **.gitignore:** `.env` files are excluded from version control

---

## 8. Army Simulated Environment Compatibility

The AI layer is **completely independent** of the MockAdapter or any future Army adapter:

```
Current:  MockAdapter → Normalized Events → Investigation → AI
Future:   ArmyAdapter → Normalized Events → Investigation → AI
                                    ↑               ↑           ↑
                              Same model      Same engine   Same AI
```

**What the AI layer depends on:**
- Normalized case data (id, title, severity, etc.)
- Normalized evidence (evidence_id, name, type, verification_status)
- Normalized findings (title, description, severity, confidence)
- Normalized events (eventType, actor, target, timestamp)

**What it does NOT depend on:**
- MockAdapter internals
- Any specific data source
- Army API endpoints, log formats, authentication, or device identifiers

---

## 9. Test Results

```
✓ tests/ai.test.js (44 tests)
✓ tests/investigation.test.js (32 tests)
✓ tests/hash-audit.test.js (36 tests)
✓ tests/case-evidence-flow.test.js (14 tests)
✓ tests/evidence.test.js (6 tests)
✓ tests/integrity.test.js (13 tests)

Test Files  6 passed (6)
     Tests  145 passed (145)
```

### Test Coverage by Area

| Area | Tests | Covers |
|------|-------|--------|
| MockAIProvider | 7 | All 5 capabilities, provider info, AIProvider inheritance |
| Provider Selection | 3 | Default provider, OpenAI instantiation, env var config |
| Missing API Key | 2 | OpenAI without key throws, falls back to mock |
| OpenAI Config | 3 | Config storage, env var defaults, timeout |
| AI Output Structure | 5 | All 5 capabilities return required metadata fields |
| Evidence References | 2 | Case summary and finding explanation reference real IDs |
| AI Provenance Events | 5 | All 5 operations create provenance events |
| AI Output Hashing | 2 | Interactions stored in DB, output hash is deterministic |
| Error Handling | 3 | Non-existent case, timeout, error status storage |
| Input Fingerprinting | 2 | Same input = cached result, different inputs = different results |
| No Evidence Invention | 4 | Only references supplied IDs, disclaimers present |
| Army Adapter Independence | 3 | No adapter dependency, custom data works, interface is generic |
| Trust Boundaries | 3 | Evidence hashes unchanged, provenance unchanged, three boundaries separate |

---

## 10. Known Limitations

1. **No real AI responses in tests** — All tests use MockAIProvider; OpenAI integration is tested via configuration only (no live API calls in test suite)
2. **Prompt quality** — Prompt templates are basic; real-world use would benefit from iterative refinement
3. **No retry logic** — OpenAI provider doesn't retry on transient failures
4. **No rate limiting** — Multiple rapid requests could hit OpenAI rate limits
5. **Cache invalidation** — Cache is based on input fingerprint; if underlying data changes but input hash doesn't (unlikely), stale results may be served
6. **Single-model support** — OpenAI provider targets GPT-4o; other models may need prompt adjustments
7. **No streaming** — AI responses are returned as complete objects, not streamed

---

## 11. Environment Variables Required

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | No | `mock` | AI provider: `mock` or `openai` |
| `OPENAI_API_KEY` | Only for openai | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model to use |
| `PORT` | No | `3001` | Server port |

---

## 12. How to Run the System

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure AI provider
cp .env.example .env
# Edit .env to set AI_PROVIDER and OPENAI_API_KEY

# 3. Start the backend
npm run dev:server

# 4. Start the frontend (in another terminal)
npm run dev

# 5. Or start both
npm run dev:all

# 6. Run tests
npm test
```

---

## 13. How to Switch Between MockAI and Real AI

### Using MockAI (default — no API key needed)
```bash
# Either don't set AI_PROVIDER, or:
AI_PROVIDER=mock npm run dev:server
```

### Using Real AI (OpenAI)
```bash
AI_PROVIDER=openai OPENAI_API_KEY=sk-your-key-here npm run dev:server
```

### Environment File (.env)
```
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
```

### UI Indicators
- **SIMULATED AI ASSISTANCE** (indigo badge) — MockAIProvider is active
- **REAL AI ASSISTANCE** (green badge) — OpenAIProvider is active with real LLM responses
- Provider and model name are shown next to the badge
- Cached results show `(cached)` indicator
