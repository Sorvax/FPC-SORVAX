/**
 * BaseAdapter - Abstract adapter interface for the Investigation Engine.
 * 
 * The adapter pattern allows the investigation engine to remain independent
 * of specific data sources (mock data, simulated environment, real scanners, etc.)
 * 
 * Source → Adapter → Normalized Event → Investigation Engine
 * 
 * All adapters MUST implement:
 *   - normalize(rawData) → NormalizedEvent[]
 *   - getSourceInfo() → { name, type, version }
 * 
 * Future adapters:
 *   - SimulatedEnvironmentAdapter (challenge environment)
 *   - WindowsEventLogAdapter
 *   - LinuxAuthLogAdapter
 *   - NetworkTelemetryAdapter
 *   - ScannerResultAdapter
 */
export class BaseAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Normalize raw data from the source into internal normalized events.
   * Each adapter knows how to translate its source format into the common model.
   * 
   * @param {Object} rawData - Raw data from the external source
   * @returns {NormalizedEvent[]} Array of normalized events
   */
  normalize(rawData) {
    throw new Error('BaseAdapter.normalize() must be implemented by subclass');
  }

  /**
   * Return metadata about this adapter.
   * @returns {{ name: string, type: string, version: string }}
   */
  getSourceInfo() {
    throw new Error('BaseAdapter.getSourceInfo() must be implemented by subclass');
  }

  /**
   * Check if this adapter can handle the given data format.
   * @param {Object} rawData - Data to test
   * @returns {boolean}
   */
  canHandle(rawData) {
    return false;
  }
}

/**
 * NormalizedEvent - Common internal event structure.
 * 
 * All sources map into this structure. The investigation engine
 * operates exclusively on NormalizedEvents.
 * 
 * @typedef {Object} NormalizedEvent
 * @property {string} id - Unique event ID
 * @property {string} caseId - Case this event belongs to
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} source - Source system (e.g., 'mock', 'auth-log', 'network')
 * @property {string} eventType - Type of event (e.g., 'FAILED_LOGIN', 'PRIVILEGE_ESCALATION')
 * @property {string} actor - Who performed the action
 * @property {string} target - What was targeted
 * @property {string} action - What action was taken
 * @property {string} severity - Severity level (critical, high, medium, low, info)
 * @property {Object} metadata - Additional source-specific metadata
 * @property {string|null} evidenceId - Linked evidence ID if applicable
 */
