import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { getEvidenceForCase } from './evidence.js';
import { createProvenanceEvent } from './provenance.js';
import { getAdapter, detectAdapter } from '../integrations/index.js';

/**
 * InvestigationService
 * 
 * The core investigation engine. Accepts a case ID, retrieves evidence,
 * normalizes it through an adapter, correlates events, builds a timeline,
 * and generates findings.
 * 
 * IMPORTANT: This service does NOT depend on any specific data source.
 * It consumes NormalizedEvents produced by adapters.
 * 
 * Flow:
 *   Evidence → Adapter → Normalized Events → Correlation → Timeline → Findings
 */

/**
 * Run an investigation for a case.
 * 
 * @param {string} caseId - The case to investigate
 * @param {Object} options - { adapterName?: string, scenario?: string }
 * @returns {Object} Investigation result with events, timeline, and findings
 */
export function runInvestigation(caseId, options = {}) {
  const db = getDb();
  const { adapterName = 'mock', scenario = 'suspicious-data-access' } = options;

  // 1. Create investigation record
  const investigationId = `INV-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO investigations (
      investigation_id, case_id, status, started_at, adapter_used
    ) VALUES (?, ?, ?, ?, ?)
  `).run(investigationId, caseId, 'running', now, adapterName);

  // Create provenance event for investigation start
  createProvenanceEvent({
    caseId,
    eventType: 'INVESTIGATION_STARTED',
    actorType: 'system',
    actorId: 'investigation-engine',
    description: `Investigation ${investigationId} started for case ${caseId}`,
    metadataJson: { investigation_id: investigationId, adapter: adapterName, scenario },
  });

  // 2. Retrieve all evidence for the case
  const evidence = getEvidenceForCase(caseId);

  // 3. Normalize evidence through adapter
  const adapter = getAdapter(adapterName);
  const rawData = { evidence, scenario, type: adapterName };
  const normalizedEvents = adapter.normalize(rawData);

  // 4. Store normalized events in database
  for (const event of normalizedEvents) {
    db.prepare(`
      INSERT INTO investigation_events (
        event_id, investigation_id, case_id, normalized_id,
        timestamp, source, event_type, actor, target, action,
        severity, metadata_json, evidence_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id, investigationId, caseId, event.id,
      event.timestamp, event.source, event.eventType,
      event.actor, event.target, event.action,
      event.severity, JSON.stringify(event.metadata),
      event.evidenceId || null
    );

    // Create provenance event for each correlated event
    createProvenanceEvent({
      caseId,
      evidenceId: event.evidenceId || undefined,
      eventType: 'EVENT_CORRELATED',
      actorType: 'system',
      actorId: 'investigation-engine',
      description: `Event correlated: ${event.eventType} at ${event.timestamp}`,
      metadataJson: {
        normalized_id: event.id,
        event_type: event.eventType,
        source: event.source,
        severity: event.severity,
      },
    });
  }

  // 5. Correlate events into a timeline
  const timeline = buildTimeline(normalizedEvents);

  // Store timeline as provenance event
  createProvenanceEvent({
    caseId,
    eventType: 'TIMELINE_CREATED',
    actorType: 'system',
    actorId: 'investigation-engine',
    description: `Investigation timeline created with ${timeline.length} events`,
    metadataJson: { event_count: timeline.length },
  });

  // 6. Identify suspicious patterns and generate findings
  const findings = identifyFindings(caseId, investigationId, normalizedEvents, evidence);

  // Store findings in database and create provenance events
  for (const finding of findings) {
    db.prepare(`
      INSERT INTO findings (
        finding_id, investigation_id, case_id, title, description,
        severity, confidence, affected_asset, status,
        recommended_next_step, supporting_evidence_json,
        supporting_events_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finding.id, investigationId, caseId, finding.title, finding.description,
      finding.severity, finding.confidence, finding.affectedAsset, finding.status,
      finding.recommendedNextStep, JSON.stringify(finding.supportingEvidence),
      JSON.stringify(finding.supportingEvents), now
    );

    // Create provenance event for finding creation
    createProvenanceEvent({
      caseId,
      eventType: 'FINDING_CREATED',
      actorType: 'system',
      actorId: 'investigation-engine',
      description: `Finding created: ${finding.title} (${finding.severity})`,
      metadataJson: {
        finding_id: finding.id,
        title: finding.title,
        severity: finding.severity,
        confidence: finding.confidence,
        supporting_evidence: finding.supportingEvidence,
      },
    });
  }

  // 7. Update investigation record
  const completedAt = new Date().toISOString();
  db.prepare(`
    UPDATE investigations SET
      status = 'completed',
      completed_at = ?,
      evidence_reviewed = ?,
      events_correlated = ?,
      findings_count = ?,
      summary = ?
    WHERE investigation_id = ?
  `).run(
    completedAt,
    evidence.length,
    normalizedEvents.length,
    findings.length,
    generateSummary(findings, timeline),
    investigationId
  );

  return {
    investigationId,
    caseId,
    status: 'completed',
    evidenceReviewed: evidence.length,
    eventsCorrelated: normalizedEvents.length,
    findingsCount: findings.length,
    summary: generateSummary(findings, timeline),
    timeline,
    findings,
    events: normalizedEvents,
    adapterUsed: adapterName,
  };
}

/**
 * Get an existing investigation for a case.
 */
export function getInvestigation(investigationId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM investigations WHERE investigation_id = ?').get(investigationId);
  if (!row) return null;
  return formatInvestigationRow(row);
}

/**
 * Get the latest investigation for a case.
 */
export function getLatestInvestigation(caseId) {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM investigations WHERE case_id = ? ORDER BY started_at DESC LIMIT 1'
  ).get(caseId);
  if (!row) return null;
  return formatInvestigationRow(row);
}

/**
 * Get investigation events for a case.
 */
export function getInvestigationEvents(caseId, investigationId) {
  const db = getDb();
  let query = 'SELECT * FROM investigation_events WHERE case_id = ?';
  const params = [caseId];
  if (investigationId) {
    query += ' AND investigation_id = ?';
    params.push(investigationId);
  }
  query += ' ORDER BY timestamp ASC';
  return db.prepare(query).all(...params).map(formatEventRow);
}

/**
 * Get findings for a case.
 */
export function getFindings(caseId, investigationId) {
  const db = getDb();
  let query = 'SELECT * FROM findings WHERE case_id = ?';
  const params = [caseId];
  if (investigationId) {
    query += ' AND investigation_id = ?';
    params.push(investigationId);
  }
  query += ' ORDER BY created_at ASC';
  return db.prepare(query).all(...params).map(formatFindingRow);
}

/**
 * Get findings for a specific investigation.
 */
export function getFindingsForInvestigation(investigationId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM findings WHERE investigation_id = ? ORDER BY created_at ASC'
  ).all(investigationId).map(formatFindingRow);
}

// ─────────────────────────────────────────────────────
// INTERNAL: Timeline Builder
// ─────────────────────────────────────────────────────

function buildTimeline(events) {
  // Sort events chronologically
  const sorted = [...events].sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return tA - tB;
  });

  return sorted.map(event => ({
    id: event.id,
    time: formatTime(event.timestamp),
    timestamp: event.timestamp,
    title: formatEventTitle(event),
    description: formatEventDescription(event),
    eventType: event.eventType,
    severity: event.severity,
    source: event.source,
    actor: event.actor,
    target: event.target,
    evidenceId: event.evidenceId,
    metadata: event.metadata,
  }));
}

// ─────────────────────────────────────────────────────
// INTERNAL: Finding Identifier
// ─────────────────────────────────────────────────────

function identifyFindings(caseId, investigationId, events, evidence) {
  const findings = [];

  // Pattern: Authentication abuse followed by data access
  const authEvents = events.filter(e =>
    e.eventType === 'FAILED_LOGIN' || e.eventType === 'SUCCESSFUL_LOGIN'
  );
  const escalationEvents = events.filter(e => e.eventType === 'PRIVILEGE_ESCALATION');
  const usbEvents = events.filter(e => e.eventType === 'USB_CONNECTED');
  const fileAccessEvents = events.filter(e => e.eventType === 'SENSITIVE_FILE_ACCESS');

  if (authEvents.length > 0 && escalationEvents.length > 0 && usbEvents.length > 0 && fileAccessEvents.length > 0) {
    // Full attack chain detected
    const supportingEvidence = [
      ...new Set(events.filter(e => e.evidenceId).map(e => e.evidenceId))
    ];
    const supportingEvents = events.map(e => e.id);

    findings.push({
      id: `FIND-${uuidv4().substring(0, 8)}`,
      investigationId,
      caseId,
      title: 'Potential Unauthorized Data Access',
      description: 'The investigation identified a sequence of events suggesting unauthorized access: ' +
        'multiple failed authentication attempts followed by successful login, privilege escalation, ' +
        'USB device connection, and sensitive file access. This pattern is consistent with a ' +
        'credential-based attack leading to data exfiltration.',
      severity: 'high',
      confidence: 'high',
      affectedAsset: events[0]?.target || 'Unknown System',
      status: 'open',
      recommendedNextStep: 'Review the finding and proceed to the remediation stage. ' +
        'Consider isolating the affected system and reviewing USB device policies.',
      supportingEvidence,
      supportingEvents,
    });
  } else if (authEvents.length > 0 && escalationEvents.length > 0) {
    // Partial chain: auth abuse + privilege escalation
    const supportingEvidence = [
      ...new Set(events.filter(e => e.evidenceId).map(e => e.evidenceId))
    ];
    findings.push({
      id: `FIND-${uuidv4().substring(0, 8)}`,
      investigationId,
      caseId,
      title: 'Suspicious Authentication Activity',
      description: 'Multiple failed login attempts were followed by a successful login and privilege escalation. ' +
        'This pattern suggests potential credential compromise or brute-force attack.',
      severity: 'high',
      confidence: 'medium',
      affectedAsset: events[0]?.target || 'Unknown System',
      status: 'open',
      recommendedNextStep: 'Review authentication logs and enforce account lockout policies.',
      supportingEvidence,
      supportingEvents: events.map(e => e.id),
    });
  } else if (usbEvents.length > 0 && fileAccessEvents.length > 0) {
    // USB + file access pattern
    const supportingEvidence = [
      ...new Set(events.filter(e => e.evidenceId).map(e => e.evidenceId))
    ];
    findings.push({
      id: `FIND-${uuidv4().substring(0, 8)}`,
      investigationId,
      caseId,
      title: 'Potential Data Exfiltration via USB',
      description: 'USB device connection was followed by sensitive file access. ' +
        'This pattern suggests potential data exfiltration through removable media.',
      severity: 'critical',
      confidence: 'medium',
      affectedAsset: events[0]?.target || 'Unknown System',
      status: 'open',
      recommendedNextStep: 'Review USB device policies and check for unauthorized data transfers.',
      supportingEvidence,
      supportingEvents: events.map(e => e.id),
    });
  }

  return findings;
}

// ─────────────────────────────────────────────────────
// INTERNAL: Summary Generator
// ─────────────────────────────────────────────────────

function generateSummary(findings, timeline) {
  if (findings.length === 0) {
    return 'Investigation completed. No suspicious patterns identified in the correlated events.';
  }

  const findingSummaries = findings.map(f =>
    `${f.title} (Severity: ${f.severity}, Confidence: ${f.confidence})`
  ).join('; ');

  return `Investigation completed. ${findings.length} finding(s) identified: ${findingSummaries}. ` +
    `Timeline reconstructed from ${timeline.length} correlated events.`;
}

// ─────────────────────────────────────────────────────
// INTERNAL: Formatting Helpers
// ─────────────────────────────────────────────────────

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatEventTitle(event) {
  const titles = {
    'FAILED_LOGIN': 'Failed login attempts',
    'SUCCESSFUL_LOGIN': 'Successful login',
    'PRIVILEGE_ESCALATION': 'Privilege escalation',
    'USB_CONNECTED': 'USB device connected',
    'SENSITIVE_FILE_ACCESS': 'Sensitive file accessed',
    'EVIDENCE_COLLECTED': 'Evidence collected',
  };
  return titles[event.eventType] || event.eventType.replace(/_/g, ' ').toLowerCase();
}

function formatEventDescription(event) {
  const descriptions = {
    'FAILED_LOGIN': `Multiple failed authentication attempts from ${event.actor}`,
    'SUCCESSFUL_LOGIN': `Successful authentication by ${event.actor}`,
    'PRIVILEGE_ESCALATION': `User ${event.actor} escalated privileges to ${event.target}`,
    'USB_CONNECTED': `USB device connected: ${event.metadata?.device || 'Unknown device'}`,
    'SENSITIVE_FILE_ACCESS': `File ${event.target} accessed by ${event.actor}`,
    'EVIDENCE_COLLECTED': `Evidence collected from ${event.source}`,
  };
  return descriptions[event.eventType] || `Event: ${event.eventType}`;
}

function formatInvestigationRow(row) {
  return {
    investigationId: row.investigation_id,
    caseId: row.case_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    evidenceReviewed: row.evidence_reviewed,
    eventsCorrelated: row.events_correlated,
    findingsCount: row.findings_count,
    summary: row.summary,
    adapterUsed: row.adapter_used,
    metadata: JSON.parse(row.metadata_json || '{}'),
  };
}

function formatEventRow(row) {
  return {
    eventId: row.event_id,
    investigationId: row.investigation_id,
    caseId: row.case_id,
    normalizedId: row.normalized_id,
    timestamp: row.timestamp,
    source: row.source,
    eventType: row.event_type,
    actor: row.actor,
    target: row.target,
    action: row.action,
    severity: row.severity,
    metadata: JSON.parse(row.metadata_json || '{}'),
    evidenceId: row.evidence_id,
  };
}

function formatFindingRow(row) {
  return {
    findingId: row.finding_id,
    investigationId: row.investigation_id,
    caseId: row.case_id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    confidence: row.confidence,
    affectedAsset: row.affected_asset,
    status: row.status,
    recommendedNextStep: row.recommended_next_step,
    supportingEvidence: JSON.parse(row.supporting_evidence_json || '[]'),
    supportingEvents: JSON.parse(row.supporting_events_json || '[]'),
    createdAt: row.created_at,
  };
}
