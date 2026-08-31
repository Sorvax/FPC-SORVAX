import { BaseAdapter } from '../adapters/BaseAdapter.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * MockAdapter - Normalizes mock/sample data into normalized investigation events.
 * 
 * This adapter provides a deterministic investigation scenario for the demo.
 * It simulates a realistic cybersecurity incident:
 *   Failed authentication → Successful login → Privilege escalation → USB activity → Sensitive file access
 * 
 * Future adapters will replace this for real environments:
 *   MockAdapter → SimulatedEnvironmentAdapter → RealAdapter
 * 
 * The investigation engine never knows which adapter produced the events.
 */
export class MockAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.sourceName = config.sourceName || 'mock-logs';
  }

  getSourceInfo() {
    return {
      name: 'Mock Adapter',
      type: 'mock',
      version: '1.0.0',
      description: 'Provides deterministic mock data for demonstration and testing',
    };
  }

  canHandle(rawData) {
    if (!rawData) return false;
    return !!(rawData.type === 'mock' || rawData.scenario);
  }

  /**
   * Normalize mock evidence into investigation events.
   */
  normalize(rawData) {
    const { evidence = [], scenario = 'default' } = rawData;

    if (scenario === 'suspicious-data-access') {
      return this.normalizeSuspiciousDataAccess(evidence);
    }

    return this.normalizeDefault(evidence);
  }

  /**
   * Suspicious Data Access scenario - the primary demo scenario.
   * 
   * Matches evidence by type and content patterns rather than specific IDs,
   * making it resilient to evidence ID differences between seed and test data.
   */
  normalizeSuspiciousDataAccess(evidence) {
    const events = [];
    const caseId = evidence[0]?.caseId || evidence[0]?.case_id || 'CASE-0243';

    // Find evidence by type/content patterns
    const authLog = this.findEvidenceByType(evidence, 'logs', ['auth', 'login', 'ssh', 'password']);
    const usbLog = this.findEvidenceByType(evidence, 'system', ['usb', 'device', 'kingston']);
    const fileLog = this.findEvidenceByType(evidence, 'logs', ['file', 'access', 'audit', 'shadow']);

    // Fallback: use any evidence if specific types not found
    const firstEvidence = evidence[0];
    const authEvidence = authLog || firstEvidence;
    const usbEvidence = usbLog || evidence[1] || firstEvidence;
    const fileEvidence = fileLog || evidence[2] || firstEvidence;

    // Event 1: Failed authentication attempts
    events.push(this.createEvent({
      caseId,
      timestamp: '2026-08-30T10:32:00Z',
      source: 'authentication-log',
      eventType: 'FAILED_LOGIN',
      actor: 'unknown (IP: 192.168.1.100)',
      target: 'authentication-service',
      action: 'multiple_failed_attempts',
      severity: 'medium',
      evidenceId: this.getEvidenceId(authEvidence),
      metadata: {
        attempts: 5,
        ip: '192.168.1.100',
        usernames_attempted: ['admin', 'root', 'operator', 'sysadmin', 'test'],
        service: 'SSH',
        port: 22,
      },
    }));

    // Event 2: Successful login after failures
    events.push(this.createEvent({
      caseId,
      timestamp: '2026-08-30T10:35:00Z',
      source: 'authentication-log',
      eventType: 'SUCCESSFUL_LOGIN',
      actor: 'operator (IP: 192.168.1.100)',
      target: 'authentication-service',
      action: 'successful_authentication',
      severity: 'info',
      evidenceId: this.getEvidenceId(authEvidence),
      metadata: {
        username: 'operator',
        ip: '192.168.1.100',
        method: 'password',
        service: 'SSH',
      },
    }));

    // Event 3: Privilege escalation
    events.push(this.createEvent({
      caseId,
      timestamp: '2026-08-30T10:37:00Z',
      source: 'system-audit',
      eventType: 'PRIVILEGE_ESCALATION',
      actor: 'operator',
      target: 'system-shell',
      action: 'sudo_su_root',
      severity: 'high',
      evidenceId: this.getEvidenceId(usbEvidence) || this.getEvidenceId(authEvidence),
      metadata: {
        from_user: 'operator',
        to_user: 'root',
        method: 'su',
        terminal: 'pts/0',
      },
    }));

    // Event 4: USB device connected
    events.push(this.createEvent({
      caseId,
      timestamp: '2026-08-30T10:41:00Z',
      source: 'usb-monitor',
      eventType: 'USB_CONNECTED',
      actor: 'root',
      target: 'usb-storage',
      action: 'device_connected',
      severity: 'high',
      evidenceId: this.getEvidenceId(usbEvidence),
      metadata: {
        device: 'Kingston DataTraveler 32GB',
        serial: 'KST-20260830',
        mount_point: '/mnt/usb',
        file_system: 'NTFS',
      },
    }));

    // Event 5: Sensitive file accessed
    events.push(this.createEvent({
      caseId,
      timestamp: '2026-08-30T10:42:00Z',
      source: 'file-access-log',
      eventType: 'SENSITIVE_FILE_ACCESS',
      actor: 'root',
      target: '/etc/shadow',
      action: 'file_read',
      severity: 'critical',
      evidenceId: this.getEvidenceId(fileEvidence),
      metadata: {
        file_path: '/etc/shadow',
        file_size: 2048,
        access_type: 'read',
        destination: '/mnt/usb/shadow_copy.txt',
        bytes_copied: 2048,
      },
    }));

    return events;
  }

  /**
   * Default scenario - parse evidence content for basic events.
   */
  normalizeDefault(evidence) {
    const events = [];
    for (const item of evidence) {
      if (!item) continue;
      events.push(this.createEvent({
        caseId: item.caseId || item.case_id,
        timestamp: item.collectedAt || item.collected_at || new Date().toISOString(),
        source: item.type || 'unknown',
        eventType: 'EVIDENCE_COLLECTED',
        actor: item.collectedBy || item.collected_by || 'system',
        target: item.name,
        action: 'evidence_collected',
        severity: 'info',
        evidenceId: this.getEvidenceId(item),
        metadata: { originalType: item.type, source: item.source },
      }));
    }
    return events;
  }

  createEvent({ caseId, timestamp, source, eventType, actor, target, action, severity, evidenceId, metadata }) {
    return {
      id: `NE-${uuidv4().substring(0, 8)}`,
      caseId,
      timestamp,
      source,
      eventType,
      actor,
      target,
      action,
      severity,
      metadata: metadata || {},
      evidenceId: evidenceId || null,
    };
  }

  /**
   * Extract evidence ID from an evidence item, handling both formats.
   */
  getEvidenceId(item) {
    if (!item) return null;
    return item.evidence_id || item.id || null;
  }

  /**
   * Find evidence by type and content keywords.
   * Searches the evidence name, description, source, and content for matching keywords.
   */
  findEvidenceByType(evidence, type, keywords) {
    return evidence.find(e => {
      if (!e) return false;
      // Match by type
      const typeMatch = e.type === type;
      // Match by keywords in name, description, source, or content
      const searchable = [
        e.name || '',
        e.description || '',
        e.source || '',
      ].join(' ').toLowerCase();
      const keywordMatch = keywords.some(kw => searchable.includes(kw.toLowerCase()));
      return typeMatch && keywordMatch;
    });
  }
}
