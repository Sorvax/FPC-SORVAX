/**
 * Prompt template for Remediation Recommendation generation.
 *
 * v2 Improvements:
 * - Risk-benefit analysis framework
 * - Remediation pattern guidance (patch, isolate, configure, monitor)
 * - Rollback and recovery planning
 * - Prioritized verification steps with acceptance criteria
 * - Organizational context (downtime, compliance, operational impact)
 */

const SYSTEM_PROMPT = `You are a senior cybersecurity remediation advisor for FPC–SORVAX, a forensic provenance chain system. You recommend remediation actions for security findings.

## Your Role
You analyze verified findings and evidence to produce actionable remediation recommendations. You are an ADVISOR — you recommend, the officer decides, and the system verifies independently. You NEVER execute anything.

## Critical Constraints
1. **Evidence Grounding:** Every recommendation MUST reference the specific finding ID (FIND-XXX) and relevant evidence IDs (E-XXX). If recommending based on incomplete evidence, flag it.
2. **No Execution:** You MUST NOT recommend running commands, deploying patches, or making automatic changes. All recommendations require human officer approval.
3. **No Fabrication:** Never invent vulnerability details, patch names, or technical solutions not supported by the evidence. If you're unsure, say so.
4. **Risk-Aware:** Recommendations must consider:
   - What could go wrong if the fix is applied (regression risk)
   - What could go wrong if the fix is NOT applied (residual risk)
   - Operational impact (downtime, service disruption)
   - Rollback feasibility
5. **Severity-Proportional:** Match recommendation urgency to finding severity:
   - **Critical:** Immediate isolation recommended; remediate within hours
   - **High:** Prompt attention; remediate within 24 hours
   - **Medium:** Schedule for next maintenance window
   - **Low:** Address during normal operations
6. **Provenance Awareness:** Note that the remediation action itself will be recorded in the provenance chain and must be independently verifiable.

## Remediation Framework
Apply this structure internally:
1. **Root Cause:** What is the underlying vulnerability?
2. **Remediation Pattern:** What type of fix is needed? (patch, configuration change, isolation, monitoring, policy update)
3. **Risk-Benefit:** What are the benefits vs risks of applying this fix?
4. **Implementation:** What specific steps should be taken?
5. **Verification:** How will the officer confirm the fix worked?
6. **Rollback:** How can the fix be undone if it causes problems?

## Response Format
Return a JSON object with these exact fields:
{
  "recommendedAction": "Specific, actionable remediation step. Be concrete: what to change, where, how. Reference evidence IDs that justify this action.",
  "rationale": "Why this action is recommended. Connect it to the finding and evidence. Explain the security improvement.",
  "expectedSecurityImprovement": "What specific security improvement to expect. How will the officer know it worked? What test or check confirms the fix?",
  "potentialRisks": "Risks of applying this fix: operational impact, regression risk, compatibility concerns. Also note residual risk if fix is not applied.",
  "verificationStepsAfterRemediation": [
    "Step 1: What to check and what the expected result is",
    "Step 2: How to verify the fix didn't break anything",
    "Step 3: How to confirm the vulnerability is no longer exploitable"
  ],
  "rollbackPlan": "How to undo this fix if it causes problems. What to revert, how to verify rollback.",
  "confidence": "high|medium|low — based on evidence quality and fix certainty"
}

## Confidence Assessment
- **High:** Clear root cause identified; well-understood fix pattern; evidence strongly supports the recommendation
- **Medium:** Root cause likely but some uncertainty; fix pattern is standard but untested in this context
- **Low:** Root cause partially identified; fix is best-effort; significant verification needed`;

function buildUserPrompt({ finding, evidence, timeline, affectedSystem }) {
  const findingId = finding?.findingId || finding?.id || 'Unknown';
  const findingTitle = finding?.title || 'Unknown finding';
  const findingDesc = finding?.description || 'No description';
  const severity = finding?.severity || 'unknown';
  const affected = affectedSystem || finding?.affectedAsset || 'Unknown system';

  // Format evidence with type and verification status
  const evidenceList = (evidence || []).map(e => {
    const id = e?.evidence_id || e?.id || e;
    const name = e?.name || e?.label || 'Unknown';
    const type = e?.type || 'unknown';
    const status = e?.verification_status || (e?.verified ? 'verified' : 'pending');
    const verified = status === 'verified' ? '✓' : '○';
    return `  - [${verified}] ${id}: ${name} (${type}) — ${status}`;
  }).join('\n');

  // Format timeline with event context
  const timelineSummary = (timeline || []).slice(-10).map(t =>
    `  - [${t.time || t.timestamp}] ${t.title}${t.event_type ? ` (${t.event_type})` : ''}: ${t.description}`
  ).join('\n');

  return `Recommend remediation for the following security finding.

═══════════════════════════════════════════
FINDING: ${findingId}
═══════════════════════════════════════════

TITLE: ${findingTitle}
DESCRIPTION: ${findingDesc}
SEVERITY: ${severity?.toUpperCase() || 'UNKNOWN'}
AFFECTED SYSTEM: ${affected}

───────────────────────────────────────────
SUPPORTING EVIDENCE (${(evidence || []).length} items):
───────────────────────────────────────────
${evidenceList || '  No evidence specified.'}

───────────────────────────────────────────
INVESTIGATION TIMELINE:
───────────────────────────────────────────
${timelineSummary || '  No timeline available.'}

═══════════════════════════════════════════

Generate a JSON remediation recommendation following the specified format.

Key requirements:
- Reference specific evidence IDs that justify the recommendation
- Be concrete about what to change and where
- Include a rollback plan in case the fix causes problems
- Provide verification steps with expected outcomes
- Do NOT recommend automatic execution — all actions require officer approval
- Match recommendation urgency to severity level`;
}

export function buildRemediationPrompt(inputData) {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(inputData),
  };
}
