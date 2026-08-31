/**
 * MockAIProvider - Deterministic AI responses without external API calls.
 *
 * Used when:
 *   - No OPENAI_API_KEY is configured
 *   - AI_PROVIDER=mock
 *   - Testing
 *
 * Generates realistic responses grounded in the supplied case data.
 * Never invents evidence — all statements reference provided data.
 */

import { AIProvider } from './AIProvider.js';

export class MockAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
  }

  getProviderInfo() {
    return {
      name: 'MockAI',
      type: 'mock',
      version: '1.0.0',
      description: 'Deterministic mock AI for demonstration and testing. No external API calls.',
    };
  }

  async generateCaseSummary({ caseData, evidence, timeline, findings, verificationStatus }) {
    const findingNames = (findings || []).map(f => f.title).join(', ') || 'No findings yet';
    const evidenceCount = (evidence || []).length;
    const verifiedCount = (evidence || []).filter(e => e.verified).length;
    const eventCount = (timeline || []).length;
    const severity = caseData?.severity || 'unknown';
    const system = caseData?.system || caseData?.detection?.system || 'the affected system';
    const status = caseData?.status || 'active';
    const assignedTo = caseData?.assignedTo || 'an officer';

    const evidenceRefs = (evidence || []).slice(0, 5).map(e => e.evidence_id || e.id).join(', ');

    const summary = `Case ${caseData?.id || 'Unknown'} is a ${severity}-severity security incident affecting ${system}. ` +
      `${evidenceCount} evidence items have been collected (${verifiedCount} verified). ` +
      `The investigation correlated ${eventCount} events and identified ${findings?.length || 0} finding(s): ${findingNames}. ` +
      `The case is currently ${status} and assigned to ${assignedTo}. ` +
      `${verificationStatus === 'VERIFIED' ? 'All evidence integrity checks have passed.' : 'Evidence integrity verification is pending.'}`;

    const importantEvidence = (evidence || []).slice(0, 5).map(e => ({
      id: e.evidence_id || e.id,
      name: e.name || e.label,
      type: e.type,
      status: e.verification_status || (e.verified ? 'verified' : 'pending'),
    }));

    return {
      type: 'case_summary',
      situation: summary,
      importantEvidence,
      whatHappened: caseData?.detection?.description || 'An issue was detected during monitoring.',
      currentStatus: `Case is ${status}. ${findings?.length || 0} finding(s) identified.`,
      recommendedNextStep: this._suggestNextStep(caseData),
      confidence: 'deterministic',
      aiEnhanced: false,
      sourceFindingIds: (findings || []).map(f => f.findingId || f.id),
      sourceEvidenceIds: (evidence || []).map(e => e.evidence_id || e.id).slice(0, 10),
    };
  }

  async explainFinding({ finding, supportingEvidence, supportingEvents, timeline, severity, confidence }) {
    const evidenceIds = (supportingEvidence || []).map(e => e.evidence_id || e.id || e).join(', ');
    const eventTypes = (supportingEvents || []).map(e => e.eventType || e.event_type || e).join(', ');
    const findingTitle = finding?.title || 'Unknown finding';
    const findingDesc = finding?.description || 'No description available.';
    const affected = finding?.affectedAsset || 'the affected system';

    const explanation = {
      type: 'finding_explanation',
      whatDetected: `The investigation detected: ${findingTitle}. ${findingDesc}`,
      whySuspicious: `This finding has ${confidence || 'medium'} confidence based on correlated events (${eventTypes}). ` +
        `The pattern of events suggests unauthorized activity targeting ${affected}.`,
      evidenceSupporting: `Supporting evidence: ${evidenceIds || 'None specified'}. ` +
        `Each piece of evidence was integrity-verified and linked through the provenance chain.`,
      likelyImpact: severity === 'critical' ? 'Critical impact — immediate action required to prevent data loss or system compromise.'
        : severity === 'high' ? 'High impact — the affected system may be compromised and should be isolated.'
        : severity === 'medium' ? 'Medium impact — the issue should be addressed promptly to prevent escalation.'
        : 'Low impact — monitor the situation and address during normal maintenance.',
      nextInvestigationStep: `Based on finding ${finding?.findingId || finding?.id || 'N/A'}, the officer should: ` +
        (finding?.recommendedNextStep || 'Review the supporting evidence and confirm the finding before proceeding to remediation.'),
      confidence: confidence || 'medium',
      aiEnhanced: false,
      sourceFindingIds: [finding?.findingId || finding?.id].filter(Boolean),
      sourceEvidenceIds: (supportingEvidence || []).map(e => e.evidence_id || e.id || e).filter(Boolean),
      disclaimer: 'AI inference — requires officer verification.',
    };

    return explanation;
  }

  async recommendRemediation({ finding, evidence, timeline, affectedSystem }) {
    const findingTitle = finding?.title || 'the identified issue';
    const affected = affectedSystem || finding?.affectedAsset || 'the affected system';
    const evidenceRefs = (evidence || []).slice(0, 5).map(e => e.evidence_id || e.id || e).join(', ');

    const recommendation = {
      type: 'remediation_recommendation',
      recommendedAction: `Address ${findingTitle} on ${affected} by applying the appropriate security fix. ` +
        `Review the evidence (${evidenceRefs}) to confirm the specific vulnerability before proceeding.`,
      rationale: `Based on the investigation findings and supporting evidence, ${findingTitle} represents a security risk ` +
        `that requires remediation. The recommended action addresses the root cause identified in the evidence.`,
      expectedSecurityImprovement: `Applying this fix should eliminate the ${findingTitle} vulnerability on ${affected}. ` +
        `After remediation, the system should be re-verified to confirm the issue is resolved.`,
      potentialRisks: `Applying security fixes may temporarily affect system availability. ` +
        `Ensure a rollback plan is in place before proceeding. The risk level is ${finding?.severity || 'medium'}.`,
      verificationStepsAfterRemediation: [
        'Run security scan to confirm vulnerability is resolved',
        'Execute regression tests to verify normal operation',
        'Verify evidence integrity of the fix',
        'Conduct independent verification check',
      ],
      confidence: finding?.confidence || 'medium',
      aiEnhanced: false,
      sourceFindingIds: [finding?.findingId || finding?.id].filter(Boolean),
      sourceEvidenceIds: (evidence || []).map(e => e.evidence_id || e.id || e).filter(Boolean),
      disclaimer: 'AI recommendation — requires officer approval before any action is taken. This recommendation will not be executed automatically.',
    };

    return recommendation;
  }

  async generateHandover({ caseData, findings, timeline, evidence, completedActions, pendingActions }) {
    const caseId = caseData?.id || caseData?.case_id || 'Unknown';
    const title = caseData?.title || 'Untitled case';
    const severity = caseData?.severity || 'unknown';
    const system = caseData?.system || caseData?.detection?.system || 'the affected system';
    const assignedTo = caseData?.assignedTo || 'an officer';
    const evidenceCount = (evidence || []).length;
    const verifiedCount = (evidence || []).filter(e => e.verified).length;
    const findingsCount = (findings || []).length;

    const findingSummaries = (findings || []).map(f =>
      `${f.title} (${f.severity || 'unknown'} severity, ${f.confidence || 'unknown'} confidence)`
    ).join('; ') || 'No findings identified yet';

    const evidenceRefs = (evidence || []).slice(0, 8).map(e => e.evidence_id || e.id || e).join(', ');

    const handover = {
      type: 'handover_summary',
      situation: `${title}. This is a ${severity}-severity incident affecting ${system}. ` +
        `Currently assigned to ${assignedTo}.`,
      evidenceCollected: `${evidenceCount} evidence items collected (${verifiedCount} verified). ` +
        `Evidence IDs: ${evidenceRefs || 'None'}.`,
      investigationCompleted: findingsCount > 0
        ? `Investigation identified ${findingsCount} finding(s): ${findingSummaries}.`
        : 'Investigation completed. No findings identified yet.',
      finding: findingSummaries,
      actionsAlreadyTaken: (completedActions || []).join('; ') || 'Detection and evidence collection completed.',
      pendingActions: (pendingActions || []).join('; ') || 'No pending actions.',
      recommendedNextStep: this._suggestNextStep(caseData),
      confidence: 'deterministic',
      aiEnhanced: false,
      sourceFindingIds: (findings || []).map(f => f.findingId || f.id).filter(Boolean),
      sourceEvidenceIds: (evidence || []).map(e => e.evidence_id || e.id || e).filter(Boolean),
    };

    return handover;
  }

  async analyzeAnomaly({ anomaly, provenanceRecords, evidenceIntegrityState, timeline }) {
    const anomalyType = anomaly?.type || anomaly?.event_type || 'unknown';
    const caseId = anomaly?.caseId || anomaly?.case_id || 'Unknown';
    const evidenceId = anomaly?.evidenceId || anomaly?.evidence_id || 'Unknown';

    const integrityRecords = (evidenceIntegrityState || []).slice(0, 5);
    const provenanceCount = (provenanceRecords || []).length;

    const analysis = {
      type: 'anomaly_analysis',
      whatHappened: `An anomaly of type "${anomalyType}" was detected on case ${caseId}. ` +
        (evidenceId !== 'Unknown' ? `Affected evidence: ${evidenceId}. ` : '') +
        `The system detected a discrepancy between the stored state and the expected state.`,
      whyUnusual: `This anomaly is unusual because it indicates a potential integrity issue. ` +
        `The provenance chain contains ${provenanceCount} events that should be reviewed to understand the timeline.`,
      evidenceSupporting: `The following evidence items are relevant to this anomaly: ` +
        integrityRecords.map(e => `${e.evidence_id || e.id} (${e.verification_status || 'unknown'})`).join(', ') +
        `. All evidence should be re-verified.`,
      officerCheckNext: [
        'Review the affected evidence items for unauthorized modifications',
        'Verify the provenance chain integrity for the case',
        'Check if any recent changes were made outside normal workflow',
        'Document findings before proceeding with the investigation',
      ],
      confidence: 'medium',
      aiEnhanced: false,
      sourceEvidenceIds: integrityRecords.map(e => e.evidence_id || e.id).filter(Boolean),
      disclaimer: 'AI inference — requires officer verification.',
    };

    return analysis;
  }

  _suggestNextStep(caseData) {
    if (!caseData) return 'Review the case details.';
    const stage = caseData.currentStage || 0;
    const stages = caseData.stages || [];
    const activeStage = stages.find(s => s.status === 'active');

    if (activeStage) {
      switch (activeStage.id) {
        case 'detected': return 'Collect and verify evidence for this case.';
        case 'evidence': return 'Run the investigation to correlate evidence and identify findings.';
        case 'investigation': return 'Review the investigation findings and confirm the issue.';
        case 'finding': return 'Review the recommended remediation and approve if appropriate.';
        case 'remediation': return 'Apply the approved fix and run verification checks.';
        case 'verification': return 'Deploy the verified fix to the target system.';
        case 'deployment': return 'Run a runtime audit to confirm system security.';
        case 'monitoring': return 'Generate the final case report.';
        default: return `Proceed to the ${activeStage.label} stage.`;
      }
    }
    if (stage >= 8) return 'Case is complete. No further action required.';
    return 'Review the case and proceed with the next step.';
  }
}
