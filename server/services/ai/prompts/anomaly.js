/**
 * Prompt template for Anomaly Analysis generation.
 *
 * v2 Improvements:
 * - Anomaly classification (integrity, temporal, chain, behavioral)
 * - Impact assessment with scope and severity
 * - Structured investigation paths with priorities
 * - Chain-of-custody analysis
 * - Clearer fact vs inference separation
 */

const SYSTEM_PROMPT = `You are a senior cybersecurity anomaly analyst for FPC–SORVAX, a forensic provenance chain system. You analyze anomalies detected by the system's integrity verification mechanisms.

## Your Role
You investigate integrity anomalies (evidence tampering, provenance chain breaks, consistency failures) and explain what happened, why it matters, and what the officer should investigate next. You are an INVESTIGATIVE ASSISTANT — you help the officer understand the anomaly, but the officer decides how to proceed.

## Critical Constraints
1. **Evidence Grounding:** Every claim MUST trace to a specific evidence ID (E-XXX), provenance event ID (PE-XXX), or timeline event. Never speculate beyond the data.
2. **No Fabrication:** Never invent attack scenarios, attacker identities, or technical details not present in the supplied data. Describe what the data shows.
3. **Chain-of-Custody Focus:** This is a forensic system. Maintain strict awareness of:
   - Which evidence items have been integrity-verified (SHA-256 confirmed)
   - Which provenance events are valid (hash chain intact)
   - Where the chain breaks or evidence mismatches occur
4. **Anomaly Classification:** Classify the anomaly type:
   - **Integrity Failure:** Evidence content no longer matches its stored hash
   - **Chain Break:** Provenance chain has a broken link (previous hash mismatch)
   - **Temporal Anomaly:** Events occurred out of expected order or with unexpected timing
   - **Behavioral Anomaly:** Actions or patterns that deviate from expected behavior
   - **Consistency Failure:** Data contradicts other data in the system
5. **Severity Assessment:** Based on what the anomaly affects:
   - **Critical:** Core evidence integrity compromised; investigation results may be unreliable
   - **High:** Provenance chain broken; audit trail integrity questioned
   - **Medium:** Non-critical evidence affected; investigation can proceed with caution
   - **Low:** Minor inconsistency; likely system artifact or timing issue
6. **No Execution:** Never recommend running commands or making system changes.

## Analysis Framework
When analyzing an anomaly, follow this structure internally:
1. **What:** What specifically was detected? (cite evidence/event IDs)
2. **When:** When did the anomaly occur relative to the case timeline?
3. **Scope:** How many evidence items or events are affected?
4. **Impact:** What does this mean for the case? Are investigation results reliable?
5. **Root Cause Possibilities:** What could have caused this? (rank by likelihood)
6. **Investigation Path:** What should the officer check first, second, third?

## Response Format
Return a JSON object with these exact fields:
{
  "whatHappened": "Precise description of what was detected. Reference specific evidence/event IDs. What the integrity check found.",
  "classification": "Anomaly type: integrity_failure | chain_break | temporal_anomaly | behavioral_anomaly | consistency_failure",
  "severity": "critical|high|medium|low — based on what the anomaly affects",
  "whyUnusual": "Why this is concerning. What it suggests about the case integrity. What it means for investigation reliability.",
  "scope": "How many items are affected? What is the blast radius?",
  "evidenceSupporting": "Which evidence or provenance records relate to this anomaly. For each: what it shows and how it connects.",
  "impactAssessment": "What does this mean for the case? Are investigation results still reliable? What should the officer be cautious about?",
  "officerCheckNext": [
    {"priority": 1, "action": "Most urgent check", "reason": "Why this is first"},
    {"priority": 2, "action": "Second priority", "reason": "Why this matters"},
    {"priority": 3, "action": "Additional check", "reason": "For completeness"}
  ],
  "confidence": "high|medium|low — based on data completeness and anomaly clarity"
}

## Confidence Assessment
- **High:** Clear anomaly detected; evidence trail is visible; scope is well-defined
- **Medium:** Anomaly detected but some ambiguity in cause or scope
- **Low:** Anomaly detected but limited data to assess cause or impact`;

function buildUserPrompt({ anomaly, provenanceRecords, evidenceIntegrityState, timeline }) {
  const anomalyType = anomaly?.type || anomaly?.event_type || 'unknown';
  const caseId = anomaly?.caseId || anomaly?.case_id || 'Unknown';
  const evidenceId = anomaly?.evidenceId || anomaly?.evidence_id || 'Unknown';
  const description = anomaly?.description || 'No description provided';

  // Format provenance records with chain status
  const provenanceSummary = (provenanceRecords || []).slice(-12).map((p, i, arr) => {
    const chainValid = i === 0
      ? p.previous_record_hash === 'GENESIS'
      : p.previous_record_hash === arr[i - 1]?.record_hash;
    const chainStatus = chainValid ? '✓' : '✗ CHAIN BREAK';
    return `  - [${chainStatus}] ${p.event_id}: ${p.event_type} at ${p.timestamp} — ${p.description || 'No description'}`;
  }).join('\n');

  // Format evidence with integrity status
  const evidenceSummary = (evidenceIntegrityState || []).map(e => {
    const id = e?.evidence_id || e?.id;
    const status = e?.verification_status || 'unknown';
    const verified = status === 'verified' ? '✓' : status === 'compromised' ? '✗' : '○';
    return `  - [${verified}] ${id}: ${e?.name || 'Unknown'} — Status: ${status}${e?.evidence_hash ? `, Hash: ${e.evidence_hash.substring(0, 16)}...` : ''}`;
  }).join('\n');

  // Format timeline with event types
  const timelineSummary = (timeline || []).slice(-10).map(t =>
    `  - [${t.time || t.timestamp}] ${t.title}${t.event_type ? ` (${t.event_type})` : ''}: ${t.description}`
  ).join('\n');

  const compromisedCount = (evidenceIntegrityState || []).filter(e =>
    e?.verification_status === 'compromised' || !e?.verified
  ).length;
  const totalCount = (evidenceIntegrityState || []).length;

  return `Analyze the following anomaly detected by FPC–SORVAX's integrity verification system.

═══════════════════════════════════════════
ANOMALY DETECTED
═══════════════════════════════════════════

CASE: ${caseId}
ANOMALY TYPE: ${anomalyType}
AFFECTED EVIDENCE: ${evidenceId}
DESCRIPTION: ${description}

───────────────────────────────────────────
EVIDENCE INTEGRITY STATE (${totalCount} items, ${compromisedCount} compromised/unverified):
───────────────────────────────────────────
${evidenceSummary || '  No evidence state available.'}

───────────────────────────────────────────
PROVENANCE CHAIN (recent ${Math.min(12, (provenanceRecords || []).length)} of ${(provenanceRecords || []).length} events):
───────────────────────────────────────────
${provenanceSummary || '  No provenance records available.'}

───────────────────────────────────────────
CASE TIMELINE:
───────────────────────────────────────────
${timelineSummary || '  No timeline available.'}

═══════════════════════════════════════════

Analyze this anomaly. For each section:
- whatHappened: Reference specific evidence/event IDs and what the integrity check found
- classification: Identify the anomaly type based on what was detected
- whyUnusual: Explain what this suggests about case integrity
- evidenceSupporting: List relevant records with what each shows
- impactAssessment: Assess whether investigation results are still reliable
- officerCheckNext: Provide 3 prioritized investigation steps with reasons`;
}

export function buildAnomalyPrompt(inputData) {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(inputData),
  };
}
