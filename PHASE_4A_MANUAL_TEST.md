# Phase 4A — Manual Real AI Test Procedure

## Prerequisites

1. OpenAI API key with access to the configured model
2. Node.js 18+ installed
3. Project dependencies installed (`npm install`)

## Test Steps

### Step 1: Configure Environment

```bash
# Create .env file (if not exists)
cp .env.example .env

# Edit .env and set:
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4.1-nano
```

**Verify:** `.env` is in `.gitignore` and will NOT be committed.

### Step 2: Start the Backend

```bash
npm run dev:server
```

**Verify:** Server starts on port 3001 without errors. No API key appears in logs.

### Step 3: Check Provider Status

```bash
curl http://localhost:3001/api/ai/provider
```

**Expected response:**
```json
{
  "name": "OpenAI",
  "type": "openai",
  "model": "gpt-4.1-nano",
  "available": true,
  "apiKeyConfigured": true
}
```

**Verify:** No API key appears in the response.

### Step 4: Open FPC–SORVAX Frontend

```bash
npm run dev
```

Open `http://localhost:5173` in browser.

### Step 5: Open an Existing Demo Case

Navigate to Cases → CASE-0241 (Suspicious Activity Investigation).

### Step 6: Test Case Summary

1. Trigger a case summary (navigate to case detail or handover view)
2. Look for the AI card indicator

**Verify:**
- Badge shows **REAL AI ASSISTANCE** (green)
- Provider shows: `Provider: openai / gpt-4.1-nano`
- "AI ASSISTANCE — Human approval required" notice is visible
- Summary content is substantive and references evidence IDs

### Step 7: Test Finding Explanation

1. Navigate to CASE-0243 (Suspicious Data Access)
2. Run the investigation if not already run
3. Trigger a finding explanation

**Verify:**
- Badge shows **REAL AI ASSISTANCE**
- Explanation references specific evidence IDs (E-050, E-051, E-052)
- "AI inference — requires officer verification" disclaimer is present
- Content distinguishes facts from inferences

### Step 8: Test Remediation Recommendation

1. From the same finding, trigger a remediation recommendation

**Verify:**
- Badge shows **REAL AI ASSISTANCE**
- Recommendation is specific and actionable
- "AI recommendation — requires officer approval" disclaimer is present
- Verification steps are provided
- Recommendation does NOT include automatic execution

### Step 9: Verify AI Interaction Records

```bash
curl http://localhost:3001/api/ai/provider
```

Check the `ai_interactions` table in the database:

```bash
sqlite3 data/fpc-sorvax.db "SELECT id, operation, provider, model, status FROM ai_interactions ORDER BY created_at DESC LIMIT 5;"
```

**Verify:**
- Records exist with `provider = 'openai'`
- `status = 'success'`
- `output_hash` is a valid SHA-256 hash

### Step 10: Verify Evidence Integrity

```bash
# Get evidence hashes before AI operations
sqlite3 data/fpc-sorvax.db "SELECT evidence_id, evidence_hash FROM evidence WHERE case_id = 'CASE-0241';"
```

**Verify:** All evidence hashes are unchanged from their original values.

### Step 11: Verify Provenance Chain

```bash
curl -X POST http://localhost:3001/api/provenance/case/CASE-0241/verify
```

**Verify:** `chain_valid: true` — AI operations did not break the provenance chain.

### Step 12: Test Mock Fallback

1. Stop the backend
2. Update `.env`:
   ```
   AI_PROVIDER=mock
   ```
3. Restart the backend

**Verify:**
- Badge shows **SIMULATED AI ASSISTANCE** (indigo)
- All AI features still work
- No errors in the console

### Step 13: Test Missing API Key Fallback

1. Stop the backend
2. Update `.env`:
   ```
   AI_PROVIDER=openai
   # OPENAI_API_KEY is commented out or empty
   ```
3. Restart the backend

**Verify:**
- Console shows warning: `AI_PROVIDER=openai but OPENAI_API_KEY not set. Falling back to MockAIProvider.`
- Badge shows **SIMULATED AI ASSISTANCE**
- All features work normally

### Step 14: Clean Up

1. Stop the backend
2. Restore `.env` to desired configuration
3. Optionally delete the test database: `rm data/fpc-sorvax.db`

## Checklist

- [ ] API key only exists server-side
- [ ] .env is ignored by Git
- [ ] No key appears in frontend bundle
- [ ] No key appears in API responses
- [ ] No key appears in logs
- [ ] REAL AI badge shows when OpenAI is configured
- [ ] SIMULATED AI badge shows when mock is active
- [ ] Human approval notice is always visible
- [ ] AI cannot directly execute remediation
- [ ] AI cannot alter evidence
- [ ] AI cannot alter provenance
- [ ] Evidence hashes remain unchanged
- [ ] Provenance chain remains valid
- [ ] AI interaction records are stored
- [ ] Mock fallback works correctly
- [ ] Missing key fallback works correctly
