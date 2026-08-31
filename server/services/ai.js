/**
 * AIService - Stub interface for future LLM integration.
 * 
 * Architecture:
 *   Evidence → Deterministic Investigation → Facts / Events / Findings → AI → Explanation / Recommendation
 * 
 * NOT:
 *   Evidence → AI → Truth
 * 
 * The deterministic investigation engine establishes the factual basis.
 * AI will later explain, summarize, and recommend.
 * 
 * This module defines the interface only. No real AI calls are made.
 */

/**
 * Generate an investigation summary from findings and timeline.
 * 
 * @param {Object} investigation - Investigation result
 * @returns {Object} AI-generated summary (placeholder for now)
 */
export function summarizeInvestigation(investigation) {
  // Future: Call LLM with investigation data
  // For now, return a deterministic placeholder
  return {
    type: 'investigation_summary',
    summary: investigation.summary || 'No summary available.',
    confidence: 'deterministic',
    aiEnhanced: false,
    note: 'AI summarization not yet implemented. This is a deterministic summary.',
  };
}

/**
 * Explain why events are correlated.
 * 
 * @param {Object[]} events - Normalized events
 * @param {Object} finding - The finding to explain
 * @returns {Object} AI-generated explanation (placeholder)
 */
export function explainCorrelation(events, finding) {
  return {
    type: 'correlation_explanation',
    explanation: finding.description,
    confidence: finding.confidence,
    aiEnhanced: false,
    note: 'AI correlation explanation not yet implemented.',
  };
}

/**
 * Generate root-cause analysis.
 * 
 * @param {Object} finding - The finding to analyze
 * @param {Object[]} evidence - Supporting evidence
 * @returns {Object} AI-generated root cause (placeholder)
 */
export function analyzeRootCause(finding, evidence) {
  return {
    type: 'root_cause_analysis',
    rootCause: finding.title,
    affectedAssets: finding.affectedAsset,
    confidence: finding.confidence,
    aiEnhanced: false,
    note: 'AI root cause analysis not yet implemented.',
  };
}

/**
 * Generate case handover summary for next officer.
 * 
 * @param {Object} caseData - Case information
 * @param {Object[]} findings - Case findings
 * @param {Object[]} timeline - Investigation timeline
 * @returns {Object} AI-generated handover summary (placeholder)
 */
export function generateCaseHandover(caseData, findings, timeline) {
  return {
    type: 'case_handover',
    caseId: caseData.case_id || caseData.id,
    title: caseData.title,
    findingsCount: findings.length,
    timelineEvents: timeline.length,
    recommendedNextSteps: findings.map(f => f.recommendedNextStep).filter(Boolean),
    aiEnhanced: false,
    note: 'AI case handover not yet implemented.',
  };
}

/**
 * Generate recommended next steps.
 * 
 * @param {Object} finding - The finding
 * @returns {Object} AI-generated recommendations (placeholder)
 */
export function recommendNextSteps(finding) {
  return {
    type: 'recommendation',
    findingId: finding.id || finding.findingId,
    recommendations: [finding.recommendedNextStep || 'No recommendation available.'],
    aiEnhanced: false,
    note: 'AI recommendation engine not yet implemented.',
  };
}

// Planned AI Features (interface stubs):
//
// 1. CASE DATABASE / HANDOVER
//    - Summarize previous investigation
//    - Identify completed work
//    - Identify pending work
//    - Recommend next step
//
// 2. RUNTIME AUDIT
//    - Analyze anomalies
//    - Explain unusual behavior
//
// 3. TAMPER ALERT
//    - Triage the alert
//    - Explain what changed
//    - Recommend investigation steps
//
// 4. CONSISTENCY CHECK
//    - Explain contextual inconsistency
//    - Identify likely cause
//    - Recommend officer review
