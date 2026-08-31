/**
 * AIProvider - Abstract interface for AI providers.
 *
 * All AI providers must implement this interface.
 * The AIService consumes NormalizedEvents and findings — never raw adapter data.
 *
 * Architecture:
 *   Investigation Data → AIService → AIProvider → Response
 *
 * Provider selection is based on environment variables:
 *   AI_PROVIDER=openai | mock (default: mock)
 *   OPENAI_API_KEY=... (required for openai provider)
 */

export class AIProvider {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Generate a case summary from investigation data.
   * @param {Object} inputData - { caseData, evidence, timeline, findings, verificationStatus }
   * @returns {Promise<Object>} AI response with metadata
   */
  async generateCaseSummary(inputData) {
    throw new Error('AIProvider.generateCaseSummary() must be implemented by subclass');
  }

  /**
   * Explain a finding based on evidence and events.
   * @param {Object} inputData - { finding, supportingEvidence, supportingEvents, timeline, severity, confidence }
   * @returns {Promise<Object>} AI response with metadata
   */
  async explainFinding(inputData) {
    throw new Error('AIProvider.explainFinding() must be implemented by subclass');
  }

  /**
   * Generate a remediation recommendation.
   * @param {Object} inputData - { finding, evidence, timeline, affectedSystem }
   * @returns {Promise<Object>} AI response with metadata
   */
  async recommendRemediation(inputData) {
    throw new Error('AIProvider.recommendRemediation() must be implemented by subclass');
  }

  /**
   * Generate an officer-friendly handover summary.
   * @param {Object} inputData - { caseData, findings, timeline, evidence, completedActions, pendingActions }
   * @returns {Promise<Object>} AI response with metadata
   */
  async generateHandover(inputData) {
    throw new Error('AIProvider.generateHandover() must be implemented by subclass');
  }

  /**
   * Analyze a runtime/tamper/consistency anomaly.
   * @param {Object} inputData - { anomaly, provenanceRecords, evidenceIntegrityState, timeline }
   * @returns {Promise<Object>} AI response with metadata
   */
  async analyzeAnomaly(inputData) {
    throw new Error('AIProvider.analyzeAnomaly() must be implemented by subclass');
  }

  /**
   * Return metadata about this provider.
   * @returns {{ name: string, type: string, version: string }}
   */
  getProviderInfo() {
    throw new Error('AIProvider.getProviderInfo() must be implemented by subclass');
  }
}
