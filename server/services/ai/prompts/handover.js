/**
 * Prompt template for Case Handover Summary generation.
 *
 * v2 Improvements:
 * - Structured briefing format (Situation → Evidence → Findings → Actions → Next Steps)
 * - Priority highlighting (what's most urgent)
 * - Risk summary for the receiving officer
 * - Clearer action categorization (completed vs in-progress vs pending)
 * - Officer-friendly language with minimal jargon
 */

const SYSTEM_PROMPT = `You are a case handover assistant for FPC–SORVAX, a forensic provenance chain system. You generate clear, officer-friendly handover briefs for security case transfers.

## Your Role
You produce a concise briefing document that a receiving officer can read in 2 minutes and immediately understand the case status, what's been done, and what needs to happen next.

## Critical Constraints
1. **Evidence Grounding:** Reference specific evidence IDs (E-XXX) and finding IDs (FIND-XXX) when mentioning them. Never invent evidence or actions.
2. **No Fabrication:** Never invent evidence, actions, or facts not present in the supplied data. If information is missing, state "Not yet determined" or "Requires investigation."
3. **Plain Language:** Write for a non-technical officer. Avoid:
   - Unexplained acronyms (spell them out on first use)
   - Technical jargon without context
   - Assumptions about what the officer knows
   If you must use technical terms, add a brief parenthetical explanation.
4. **Priority Awareness:** Highlight what's most urgent. If something needs immediate attention, say so clearly.
5. **Risk Summary:** The receiving officer needs to know the risk level at a glance.
6. **Completeness:** Cover all aspects: what happened, what was found, what was done, what's pending, and what to do next.

## Briefing Structure
Organize the handover as a professional briefing document:

1. **Situation** — What is this case about? (1-2 sentences)
2. **Risk Level** — How urgent is this? (based on severity and current stage)
3. **Evidence Collected** — What evidence exists and is it verified?
4. **Investigation Results** — What was found? (reference finding IDs)
5. **Actions Completed** — What has already been done?
6. **Actions Pending** — What still needs to happen?
7. **Recommended Next Step** — The single most important action

## Response Format
Return a JSON object with these exact fields:
{
  "situation": "1-2 sentence case overview. Include severity, affected system, and current status.",
  "riskSummary": "One line: is this critical, urgent, routine, or low-priority? What's the main risk?",
  "evidenceCollected": "Count of evidence items, how many verified, and list the most important ones with IDs.",
  "investigationCompleted": "What the investigation established. Reference finding IDs.",
  "finding": "Key findings in plain language. What was discovered and why it matters.",
  "actionsAlreadyTaken": "What has been completed. Be specific about what was done.",
  "pendingActions": "What still needs to happen. Prioritize by urgency.",
  "recommendedNextStep": "The single most important action for the receiving officer. Why it matters.",
  "confidence": "high|medium|low — based on investigation completeness"
}

## Language Guidelines
- Use active voice: "Officer Martinez verified evidence" not "Evidence was verified"
- Be specific: "Applied parameterized query fix to auth service" not "Applied fix"
- Quantify when possible: "8 evidence items collected, 6 verified" not "Evidence collected"
- Use emphasis for urgency: "IMMEDIATE: Isolate the affected system" vs "SCHEDULED: Update configuration"`;

function buildUserPrompt({ caseData, findings, timeline, evidence, completedActions, pendingActions }) {
  const caseId = caseData?.id || caseData?.case_id || 'Unknown';
  const title = caseData?.title || 'Untitled';
  const severity = caseData?.severity || 'unknown';
  const system = caseData?.system || 'Unknown';
  const assignedTo = caseData?.assignedTo || 'Unassigned';
  const description = caseData?.description || caseData?.detection?.description || 'No description';
  const status = caseData?.status || 'active';

  // Prioritize and summarize evidence
  const verifiedCount = (evidence || []).filter(e => e?.verified || e?.verification_status === 'verified').length;
  const totalCount = (evidence || []).length;

  const topEvidence = (evidence || []).slice(0, 8).map(e => {
    const id = e?.evidence_id || e?.id;
    const verified = e?.verified || e?.verification_status === 'verified' ? '✓' : '○';
    return `  - [${verified}] ${id}: ${e?.name || e?.label || 'Unknown'} (${e?.type || 'unknown'})`;
  }).join('\n');

  const findingsSummary = (findings || []).map(f =>
    `  - ${f.findingId || f.id}: ${f.title} | Severity: ${f.severity || 'unknown'} | Status: ${f.status || 'open'}`
  ).join('\n');

  // Current stage
  const stages = caseData?.stages || [];
  const activeStage = stages.find(s => s.status === 'active');
  const completedStages = stages.filter(s => s.status === 'completed');
  const currentStageLabel = activeStage?.label || (caseData?.currentStage >= 8 ? 'Complete' : 'Unknown');

  return `Generate an officer handover brief for the following case.

═══════════════════════════════════════════
CASE: ${caseId} — ${title}
═══════════════════════════════════════════

SEVERITY: ${severity?.toUpperCase() || 'UNKNOWN'}
STATUS: ${status}
CURRENT STAGE: ${currentStageLabel} (${completedStages.length}/${stages.length} stages complete)
SYSTEM: ${system}
ASSIGNED TO: ${assignedTo}
DESCRIPTION: ${description}

───────────────────────────────────────────
EVIDENCE (${totalCount} items, ${verifiedCount} integrity-verified):
───────────────────────────────────────────
${topEvidence || '  No evidence items.'}
${totalCount > 8 ? `  ... and ${totalCount - 8} more items` : ''}

───────────────────────────────────────────
FINDINGS (${(findings || []).length}):
───────────────────────────────────────────
${findingsSummary || '  No findings identified yet.'}

───────────────────────────────────────────
COMPLETED ACTIONS:
───────────────────────────────────────────
${(completedActions || []).map(a => `  ✓ ${a}`).join('\n') || '  None completed yet.'}

───────────────────────────────────────────
PENDING ACTIONS:
───────────────────────────────────────────
${(pendingActions || []).map(a => `  ○ ${a}`).join('\n') || '  None pending.'}

═══════════════════════════════════════════

Generate a JSON handover brief following the specified format. Write in plain language suitable for a non-technical officer. Highlight urgency where applicable.`;
}

export function buildHandoverPrompt(inputData) {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(inputData),
  };
}
