/**
 * Prompt template for Case Summary generation.
 *
 * v2 Improvements:
 * - Chain-of-thought reasoning before generating the summary
 * - Severity-aware framing (critical vs low cases get different treatment)
 * - Evidence prioritization (verified > pending, most relevant first)
 * - Clearer separation of facts vs inferences
 * - Actionable context for the receiving officer
 */

const SYSTEM_PROMPT = `You are a senior cybersecurity case analyst for FPC–SORVAX, a forensic provenance chain system. You produce case summaries for officer handover during security incident response.

## Your Role
You analyze verified, integrity-checked case data and produce a clear, actionable summary. You are an ASSISTANT to the investigating officer — your analysis helps them, but the officer makes all decisions.

## Critical Constraints
1. **Evidence Grounding:** Every factual claim you make MUST trace to a specific evidence ID (E-XXX), finding ID (FIND-XXX), or timeline event. If you cannot point to a source, label it as "AI inference — requires officer verification."
2. **No Fabrication:** Never invent evidence, events, findings, or technical details not present in the supplied data. If the data is insufficient, say "Insufficient data to determine."
3. **Severity Awareness:** Frame your summary based on severity:
   - **Critical/High:** Lead with urgency and potential impact. Emphasize immediate risks.
   - **Medium:** Focus on the scope and what needs attention.
   - **Low:** Keep it factual and brief; note that it's being tracked.
4. **Provenance Awareness:** Evidence that has been integrity-verified (SHA-256 confirmed) carries more weight than pending verification. Mention verification status when relevant.
5. **No Execution:** Never recommend running commands, deploying patches, or making system changes. All actions require human officer approval.
6. **Plain Language:** Write for an officer who may not be deeply technical. Explain technical findings in terms of what they mean for the organization.

## Reasoning Process (Internal — Do Not Output)
Before generating your response, internally:
1. Identify the severity level and urgency
2. List the most critical evidence items and why they matter
3. Identify what the investigation has established vs. what remains unknown
4. Determine what the receiving officer most needs to know first
5. Assess whether evidence integrity has been verified

## Response Format
Return a JSON object with these exact fields:
{
  "situation": "A concise paragraph summarizing the case. Start with severity and what was detected. Include the affected system and current status. Reference evidence IDs where relevant.",
  "whatHappened": "A clear description of the triggering event or detection. Reference the specific detection method and evidence.",
  "currentStatus": "Current case status: what stage it's in, what's been done, what's pending.",
  "recommendedNextStep": "The single most important action the receiving officer should take, with reasoning grounded in the evidence.",
  "importantEvidence": [
    {"id": "E-XXX", "name": "...", "relevance": "Why this evidence matters to the case"}
  ],
  "confidence": "high|medium|low — based on evidence quality and completeness"
}

## Confidence Assessment
- **High:** Multiple verified evidence items corroborate the findings; clear timeline; provenance chain intact
- **Medium:** Some evidence verified; timeline partially reconstructed; some gaps
- **Low:** Limited evidence; unverified items; significant unknowns`;

function buildUserPrompt({ caseData, evidence, timeline, findings, verificationStatus }) {
  const caseId = caseData?.id || caseData?.case_id || 'Unknown';
  const title = caseData?.title || 'Untitled';
  const severity = caseData?.severity || 'unknown';
  const status = caseData?.status || 'active';
  const system = caseData?.system || 'Unknown';
  const assignedTo = caseData?.assignedTo || 'Unassigned';
  const description = caseData?.description || caseData?.detection?.description || 'No description';

  // Prioritize evidence: verified first, then by type importance
  const typePriority = { code: 0, scan: 1, logs: 2, network: 3, system: 4, file: 5 };
  const sortedEvidence = [...(evidence || [])].sort((a, b) => {
    const aVerified = a.verified ? 0 : 1;
    const bVerified = b.verified ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99);
  });

  const evidenceSummary = sortedEvidence.slice(0, 15).map(e => {
    const verified = e.verification_status === 'verified' || e.verified ? '✓ verified' : '○ pending';
    return `  - [${verified}] ${e.evidence_id || e.id}: ${e.name || e.label} (${e.type})${e.source ? ` — Source: ${e.source}` : ''}`;
  }).join('\n');

  const findingsSummary = (findings || []).map(f =>
    `  - ${f.findingId || f.id}: ${f.title} | Severity: ${f.severity || 'unknown'} | Confidence: ${f.confidence || 'unknown'}${f.affectedAsset ? ` | Asset: ${f.affectedAsset}` : ''}`
  ).join('\n');

  const timelineSummary = (timeline || []).slice(-10).map(t =>
    `  - [${t.time || t.timestamp}] ${t.title}${t.event_type ? ` (${t.event_type})` : ''}: ${t.description}`
  ).join('\n');

  const verifiedCount = (evidence || []).filter(e => e.verified || e.verification_status === 'verified').length;
  const totalCount = (evidence || []).length;

  return `Analyze and summarize the following security case for officer handover.

═══════════════════════════════════════════
CASE: ${caseId} — ${title}
═══════════════════════════════════════════

SEVERITY: ${severity?.toUpperCase() || 'UNKNOWN'}
STATUS: ${status}
SYSTEM: ${system}
ASSIGNED TO: ${assignedTo}
DESCRIPTION: ${description}

───────────────────────────────────────────
EVIDENCE INVENTORY (${totalCount} items, ${verifiedCount} integrity-verified):
───────────────────────────────────────────
${evidenceSummary || '  No evidence items collected.'}
${totalCount > 15 ? `  ... and ${totalCount - 15} more items` : ''}

───────────────────────────────────────────
INVESTIGATION FINDINGS (${(findings || []).length}):
───────────────────────────────────────────
${findingsSummary || '  No findings identified yet.'}

───────────────────────────────────────────
TIMELINE (most recent events):
───────────────────────────────────────────
${timelineSummary || '  No timeline events recorded.'}

───────────────────────────────────────────
EVIDENCE INTEGRITY: ${verificationStatus || 'Unknown'}
───────────────────────────────────────────

Generate a JSON case summary following the specified format. Reference specific evidence and finding IDs. Assess confidence based on evidence quality and completeness.`;
}

export function buildCaseSummaryPrompt(inputData) {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(inputData),
  };
}
