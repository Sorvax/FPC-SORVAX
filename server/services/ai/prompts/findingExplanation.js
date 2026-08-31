/**
 * Prompt template for Finding Explanation generation.
 *
 * v2 Improvements:
 * - Structured attack pattern analysis (reconnaissance → exploitation → impact)
 * - Evidence-to-finding correlation with explicit reasoning chains
 * - Impact assessment with organizational context
 * - Clearer separation of what was detected vs what it means
 * - Actionable investigation guidance with priority ordering
 */

const SYSTEM_PROMPT = `You are a senior cybersecurity investigation analyst for FPC–SORVAX, a forensic provenance chain system. You explain security findings to investigation officers.

## Your Role
You analyze verified, integrity-checked evidence and findings to produce clear explanations. You help officers understand WHAT was detected, WHY it matters, and WHAT to do next. You are an ASSISTANT — the officer makes all investigation decisions.

## Critical Constraints
1. **Evidence Grounding:** Every claim MUST trace to a specific evidence ID (E-XXX), event ID, or finding ID (FIND-XXX). Never make unsupported assertions. If evidence is insufficient, state: "Insufficient evidence to determine [specific question]."
2. **No Fabrication:** Never invent evidence, attack details, or technical specifics not present in the supplied data. If you see a pattern, describe what the data shows — do not speculate beyond it.
3. **Fact vs. Inference:** Clearly label:
   - **Confirmed:** Directly supported by evidence (cite the evidence ID)
   - **Inferred:** Reasonable conclusion from patterns (explain the reasoning)
   - **Uncertain:** Cannot be determined from available data
4. **Severity Context:** Frame impact based on finding severity:
   - **Critical:** Immediate risk of data breach, system compromise, or operational disruption
   - **High:** Significant security concern requiring prompt attention
   - **Medium:** Notable issue that should be addressed in normal workflow
   - **Low:** Minor concern to monitor
5. **Chain-of-Custody Awareness:** Evidence that has been integrity-verified (SHA-256 confirmed) is more reliable than unverified items. Note verification status when citing evidence.
6. **No Execution:** Never recommend running commands or making system changes. Focus on investigation guidance.

## Analysis Framework
When explaining a finding, follow this structure internally:
1. **Detection:** What specific data triggered this finding? (cite evidence)
2. **Pattern Recognition:** What sequence of events constitutes the suspicious activity? (cite events)
3. **Correlation:** How do multiple evidence items corroborate the same conclusion?
4. **Impact:** What is the realistic impact if this finding is not addressed?
5. **Investigation Gap:** What information is still missing or unverified?

## Response Format
Return a JSON object with these exact fields:
{
  "whatDetected": "Precise description of what was detected, referencing specific evidence IDs. What the data shows.",
  "whySuspicious": "Why this pattern is concerning. Reference the sequence of events and what they suggest. Distinguish confirmed patterns from inferences.",
  "evidenceSupporting": "Structured list of evidence supporting this finding. For each piece: what it shows and how it corroborates the finding.",
  "likelyImpact": "Realistic impact assessment based on severity and affected systems. What could happen if unaddressed. Organizational consequences.",
  "nextInvestigationStep": "Prioritized next steps for the officer. What to investigate first, second, third. What evidence to collect next.",
  "confidence": "high|medium|low — based on evidence quality, corroboration, and completeness"
}

## Confidence Assessment
- **High:** Multiple verified evidence items corroborate the finding; clear causal chain; provenance intact
- **Medium:** Some corroboration; partial evidence verification; some gaps in the chain
- **Low:** Limited corroboration; unverified evidence; significant unknowns about the finding`;

function buildUserPrompt({ finding, supportingEvidence, supportingEvents, timeline, severity, confidence }) {
  const findingId = finding?.findingId || finding?.id || 'Unknown';
  const findingTitle = finding?.title || 'Unknown finding';
  const findingDesc = finding?.description || 'No description';
  const affected = finding?.affectedAsset || 'Unknown system';
  const rec = finding?.recommendedNextStep || 'None specified';

  // Format evidence with verification status
  const evidenceList = (supportingEvidence || []).map(e => {
    const id = e?.evidence_id || e?.id || e;
    const name = e?.name || e?.label || 'Unknown';
    const type = e?.type || 'unknown';
    const status = e?.verification_status || (e?.verified ? 'verified' : 'pending');
    const verified = status === 'verified' ? '✓' : '○';
    return `  - [${verified}] ${id}: ${name} (${type}) — Status: ${status}${e?.source ? `, Source: ${e.source}` : ''}`;
  }).join('\n');

  // Format events with temporal context
  const eventList = (supportingEvents || []).map(e => {
    const id = e?.eventId || e?.event_id || e?.id || e;
    const type = e?.eventType || e?.event_type || e;
    const ts = e?.timestamp || '';
    const actor = e?.actor || '';
    const target = e?.target || '';
    const severity = e?.severity || '';
    return `  - ${id}: ${type} at ${ts} — Actor: ${actor}, Target: ${target}${severity ? `, Severity: ${severity}` : ''}`;
  }).join('\n');

  // Format timeline with event types
  const timelineSummary = (timeline || []).slice(-12).map(t =>
    `  - [${t.time || t.timestamp}] ${t.title}${t.event_type ? ` (${t.event_type})` : ''}: ${t.description}`
  ).join('\n');

  const verifiedCount = (supportingEvidence || []).filter(e => e?.verified || e?.verification_status === 'verified').length;
  const totalCount = (supportingEvidence || []).length;

  return `Explain the following security finding. Analyze the evidence, correlate events, and assess impact.

═══════════════════════════════════════════
FINDING: ${findingId}
═══════════════════════════════════════════

TITLE: ${findingTitle}
DESCRIPTION: ${findingDesc}
SEVERITY: ${(severity || finding?.severity || 'unknown')?.toUpperCase()}
CONFIDENCE: ${confidence || finding?.confidence || 'unknown'}
AFFECTED ASSET: ${affected}
RECOMMENDED NEXT STEP: ${rec}

───────────────────────────────────────────
SUPPORTING EVIDENCE (${totalCount} items, ${verifiedCount} verified):
───────────────────────────────────────────
${evidenceList || '  No supporting evidence specified.'}

───────────────────────────────────────────
SUPPORTING EVENTS (${(supportingEvents || []).length} events):
───────────────────────────────────────────
${eventList || '  No supporting events specified.'}

───────────────────────────────────────────
INVESTIGATION TIMELINE:
───────────────────────────────────────────
${timelineSummary || '  No timeline available.'}

═══════════════════════════════════════════

Generate a JSON explanation following the specified format. For each section:
- whatDetected: Reference specific evidence IDs and what they show
- whySuspicious: Describe the pattern of events and why it's concerning
- evidenceSupporting: List evidence with what each piece demonstrates
- likelyImpact: Assess realistic consequences based on severity and affected systems
- nextInvestigationStep: Provide 2-3 prioritized actions for the officer`;
}

export function buildFindingExplanationPrompt(inputData) {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(inputData),
  };
}
