# FPC–SORVAX — Phase 1 Architecture

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Vite)                    │
│  AppContext + DemoContext → API Client → fetch('/api/...')   │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP (Vite proxy)
┌────────────────────────────▼────────────────────────────────┐
│                 Backend (Express.js on port 3001)            │
│  Routes: /api/cases, /api/evidence, /api/provenance         │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    SQLite Database                            │
│  File: data/fpc-sorvax.db (via better-sqlite3)              │
│  Tables: cases, evidence, provenance_events,                 │
│          integrity_verifications, actions                     │
└─────────────────────────────────────────────────────────────┘
```

**Why this architecture:**
- **Zero external dependencies** — SQLite is file-based, no database server needed
- **Synchronous API** — `better-sqlite3` is synchronous, simpler than async drivers
- **Vite proxy** — Frontend dev server proxies `/api` to Express, no CORS issues in dev
- **Easy to replace** — Swap SQLite for PostgreSQL, Express for Fastify, etc.

## 2. Database Schema

### cases
| Column | Type | Description |
|--------|------|-------------|
| case_id | TEXT PK | Unique case identifier (e.g. CASE-0241) |
| title | TEXT | Case title |
| severity | TEXT | high/medium/low |
| current_stage | INTEGER | Current workflow stage index |
| stages_json | TEXT | JSON array of stage states |
| evidence_items_json | TEXT | JSON array of evidence IDs |
| evidence_verified | INTEGER | 0/1 boolean |
| detection_json | TEXT | Detection details |
| investigation_json | TEXT | Investigation findings |
| remediation_json | TEXT | Remediation details |
| verification_json | TEXT | Verification results |
| deployment_json | TEXT | Deployment status |
| monitoring_json | TEXT | Monitoring status |
| timeline_json | TEXT | Investigation timeline events |

### evidence
| Column | Type | Description |
|--------|------|-------------|
| evidence_id | TEXT PK | Unique evidence ID (e.g. E-001) |
| case_id | TEXT FK | Parent case |
| name | TEXT | Evidence name/label |
| type | TEXT | logs/scan/file/network/system/code |
| content | TEXT | Actual evidence content (for hashing) |
| evidence_hash | TEXT | SHA-256 of content |
| record_hash | TEXT | Provenance record hash |
| verification_status | TEXT | verified/compromised/pending |
| verified | INTEGER | 0/1 boolean |

### provenance_events
| Column | Type | Description |
|--------|------|-------------|
| event_id | TEXT PK | Unique event ID |
| case_id | TEXT FK | Parent case |
| evidence_id | TEXT | Related evidence (nullable) |
| event_type | TEXT | EVIDENCE_REGISTERED, EVIDENCE_VERIFIED, etc. |
| previous_record_hash | TEXT | Hash of previous event (GENESIS for first) |
| record_hash | TEXT | SHA-256 of canonical serialization |

### integrity_verifications
| Column | Type | Description |
|--------|------|-------------|
| verification_id | TEXT PK | Unique verification ID |
| case_id | TEXT FK | Parent case |
| expected_hash | TEXT | Expected hash value |
| calculated_hash | TEXT | Actually calculated hash |
| status | TEXT | verified/compromised |

## 3. Evidence Lifecycle

```
Evidence Added
     ↓
SHA-256 of Content → Evidence Hash
     ↓
Evidence Record Created
     ↓
Provenance Event: EVIDENCE_REGISTERED
     ↓
Record Hash = SHA-256(canonical serialization of event fields)
     ↓
Chain: GENESIS → Record Hash → (linked to next event)
```

## 4. Hash Generation Process

### Evidence Hash
```
evidence_hash = SHA-256(content)
```
- Always computed from the actual evidence content
- Never random, never hardcoded
- Same content always produces the same hash

### Record Hash
```
record_hash = SHA-256(canonical_serialize({
  event_id,
  case_id,
  evidence_id,
  event_type,
  actor_type,
  actor_id,
  timestamp (ISO 8601),
  description,
  previous_record_hash
}))
```

**Canonical serialization:**
- Fields joined with `|` (pipe) separator
- Field order is fixed and documented
- Null values become empty string `""`
- UTF-8 encoding

## 5. Provenance Chain

```
GENESIS
   ↓
HASH-001 (first event, previous = GENESIS)
   ↓
HASH-002 (second event, previous = HASH-001)
   ↓
HASH-003 (third event, previous = HASH-002)
   ↓
   ...
```

**Verification checks:**
1. Each event's record_hash matches recalculated hash
2. Each event's previous_record_hash matches the previous event's record_hash
3. First event's previous_record_hash is "GENESIS"

## 6. Integrity Verification

### Evidence Integrity
```
1. Retrieve stored evidence + evidence_hash
2. Recalculate SHA-256 of stored content
3. Compare: calculated == stored
4. Result: VERIFIED or COMPROMISED
```

### Provenance Chain Integrity
```
1. Retrieve all events for case (chronological order)
2. For each event:
   a. Recalculate record_hash from event fields
   b. Verify matches stored record_hash
   c. Verify previous_record_hash links to previous event
3. Result: chain_valid (true/false)
```

## 7. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/cases | List all cases |
| POST | /api/cases | Create new case |
| GET | /api/cases/:id | Get case by ID |
| PUT | /api/cases/:id | Update case |
| GET | /api/cases/:id/integrity | Get case integrity summary |
| GET | /api/evidence | List all evidence |
| GET | /api/evidence/:id | Get evidence by ID |
| POST | /api/evidence/case/:caseId | Register new evidence |
| GET | /api/evidence/case/:caseId | Get evidence for case |
| POST | /api/evidence/:id/verify | Verify evidence integrity |
| POST | /api/evidence/:id/tamper | Simulate tamper (demo only) |
| GET | /api/provenance/case/:caseId | Get provenance events |
| POST | /api/provenance/case/:caseId/verify | Verify provenance chain |
| GET | /api/provenance/evidence/:evidenceId | Get evidence provenance |

## 8. Security Considerations

- **Backend-only hashing**: Evidence hash always calculated on the server
- **No client-trusted hashes**: Frontend never decides integrity status
- **Input validation**: Required fields checked before processing
- **Isolated storage**: Evidence content stored in database, not filesystem
- **No code execution**: Uploaded content is never executed
- **Parameterized queries**: SQLite uses parameterized statements (via better-sqlite3 API)

## 9. Test Results

```
✓ tests/integrity.test.js (13 tests)
✓ tests/evidence.test.js (6 tests)

Test Files  2 passed (2)
     Tests  19 passed (19)
```

Test coverage:
1. Same evidence → same SHA-256
2. Different evidence → different SHA-256
3. Registered evidence → verification passes
4. Modified evidence → verification fails
5. Valid provenance chain → verification passes
6. Modified provenance event → chain verification fails
7. Broken previous-record hash → chain verification fails
8. New evidence → Evidence ID generated
9. New evidence → provenance event created
10. New evidence → case evidence count updates

## 10. Known Limitations

- **No authentication** — Prototype has no user auth
- **No file upload** — Evidence content is text-based; binary upload not yet implemented
- **In-memory tamper state** — Tamper detection on frontend uses boolean flag, not real-time polling
- **No persistent tamper** — Tamper simulation modifies DB; re-seeding resets it
- **SQLite limits** — Not suitable for high-concurrency production use

## 11. Next Integration Points

Future phases can plug in via clean service boundaries:

```javascript
// Future services to add:
InvestigationService    // Investigation workflow
ScannerService          // ZAP, Nmap integration
AIService               // LLM-based analysis
RemediationService      // AutoFix, Patch Manager
VerificationService     // Fix verification
DeploymentService       // Deployment pipeline
RuntimeAuditService     // Continuous monitoring
ReportService           // Report generation
```

## 12. Files Created/Modified

### Created
- `server/db.js` — Database initialization and schema
- `server/index.js` — Express server entry point
- `server/seed.js` — Database seeding with mock data
- `server/services/integrity.js` — SHA-256 hashing + canonical serialization
- `server/services/evidence.js` — Evidence registration and verification
- `server/services/provenance.js` — Provenance events and chain verification
- `server/services/case.js` — Case CRUD operations
- `server/routes/cases.js` — Case API routes
- `server/routes/evidence.js` — Evidence API routes
- `server/routes/provenance.js` — Provenance API routes
- `src/api/client.js` — Frontend API client
- `tests/integrity.test.js` — Integrity engine tests
- `tests/evidence.test.js` — Evidence service tests
- `PHASE_1_ARCHITECTURE.md` — This document

### Modified
- `package.json` — Added backend dependencies and scripts
- `vite.config.js` — Added API proxy configuration
- `src/context/AppContext.jsx` — Added backend data loading
- `src/context/DemoContext.jsx` — Integrated real tamper simulation
- `src/components/case/AddEvidenceModal.jsx` — Uses real backend API
- `src/components/case/EvidenceDetail.jsx` — Displays real hashes from backend
- `src/components/alerts/TamperAlert.jsx` — Real verification + tamper simulation
- `src/components/alerts/TamperInvestigation.jsx` — Real provenance chain display
