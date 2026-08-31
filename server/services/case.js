import { getDb } from '../db.js';
import { getEvidenceForCase } from './evidence.js';
import { getEventsForCase, createProvenanceEvent } from './provenance.js';

/**
 * CaseService
 * - createCase()
 * - getCase()
 * - getCases()
 * - updateCase()
 * - getCaseIntegrity()
 */

/**
 * Get a single case by ID
 */
export function getCase(caseId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM cases WHERE case_id = ?').get(caseId);
  if (!row) return null;
  return formatCaseRow(row);
}

/**
 * Get all cases
 */
export function getCases() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM cases ORDER BY created_at DESC').all();
  return rows.map(formatCaseRow);
}

/**
 * Generate the next available case number by querying existing cases
 */
function getNextCaseNumber() {
  const db = getDb();
  const rows = db.prepare('SELECT case_number FROM cases ORDER BY case_number DESC').all();
  let maxNum = 0;
  for (const row of rows) {
    const num = parseInt(row.case_number, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return maxNum + 1;
}

/**
 * Create a new case
 */
export function createCase({ caseNumber, title, subtitle, description, severity, system, assignedTo, source, reportedBy }) {
  const db = getDb();
  const nextNum = caseNumber || getNextCaseNumber();
  const caseId = `CASE-${String(nextNum).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const defaultStages = [
    { id: 'detected', label: 'Detected', status: 'completed', timestamp: now },
    { id: 'evidence', label: 'Evidence', status: 'active', timestamp: null },
    { id: 'investigation', label: 'Investigated', status: 'pending', timestamp: null },
    { id: 'finding', label: 'Issue Found', status: 'pending', timestamp: null },
    { id: 'report', label: 'Initial Report', status: 'pending', timestamp: null },
    { id: 'decision', label: 'Next Action', status: 'pending', timestamp: null },
    { id: 'remediation', label: 'Fix', status: 'pending', timestamp: null },
    { id: 'verification', label: 'Verify', status: 'pending', timestamp: null },
    { id: 'deployment', label: 'Deploy', status: 'pending', timestamp: null },
    { id: 'monitoring', label: 'Monitor', status: 'pending', timestamp: null },
    { id: 'complete', label: 'Complete', status: 'pending', timestamp: null },
  ];

  db.prepare(`
    INSERT INTO cases (
      case_id, case_number, title, subtitle, description, status, severity,
      system, assigned_to, created_at, updated_at, current_stage, stages_json,
      evidence_items_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    caseId, String(nextNum).padStart(4, '0'), title, subtitle || '', description || '',
    'active', severity || 'medium', system || source || '', assignedTo || reportedBy || 'Unassigned',
    now, now, 0, JSON.stringify(defaultStages), '[]'
  );

  // Create CASE_CREATED provenance event
  createProvenanceEvent({
    caseId,
    evidenceId: null,
    eventType: 'CASE_CREATED',
    actorType: 'officer',
    actorId: assignedTo || reportedBy || 'Unassigned',
    description: `Case ${caseId} created: ${title}`,
    metadataJson: { title, severity: severity || 'medium', source: system || source || '' },
  });

  return getCase(caseId);
}

/**
 * Update a case
 */
export function updateCase(caseId, updates) {
  const db = getDb();
  const now = new Date().toISOString();

  const fields = [];
  const values = [];

  const updatableFields = {
    title: updates.title,
    subtitle: updates.subtitle,
    description: updates.description,
    status: updates.status,
    severity: updates.severity,
    system: updates.system,
    assigned_to: updates.assignedTo,
    current_stage: updates.currentStage,
    evidence_verified: updates.evidenceVerified !== undefined ? (updates.evidenceVerified ? 1 : 0) : undefined,
    stages_json: updates.stages ? JSON.stringify(updates.stages) : undefined,
    detection_json: updates.detection ? JSON.stringify(updates.detection) : undefined,
    investigation_json: updates.investigation ? JSON.stringify(updates.investigation) : undefined,
    finding_json: updates.finding ? JSON.stringify(updates.finding) : undefined,
    remediation_json: updates.remediation ? JSON.stringify(updates.remediation) : undefined,
    verification_json: updates.verification ? JSON.stringify(updates.verification) : undefined,
    deployment_json: updates.deployment ? JSON.stringify(updates.deployment) : undefined,
    monitoring_json: updates.monitoring ? JSON.stringify(updates.monitoring) : undefined,
    timeline_json: updates.timeline ? JSON.stringify(updates.timeline) : undefined,
    fix_steps_json: updates.fixSteps ? JSON.stringify(updates.fixSteps) : undefined,
    evidence_items_json: updates.evidenceItems ? JSON.stringify(updates.evidenceItems) : undefined,
  };

  for (const [field, value] of Object.entries(updatableFields)) {
    if (value !== undefined) {
      fields.push(`${field} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getCase(caseId);

  fields.push('updated_at = ?');
  values.push(now);
  values.push(caseId);

  db.prepare(`UPDATE cases SET ${fields.join(', ')} WHERE case_id = ?`).run(...values);

  return getCase(caseId);
}

/**
 * Transfer a case to another officer/department.
 * Records provenance events and updates case assignment.
 */
export function transferCase(caseId, { receivingOfficer, receivingDepartment, reason, previousOfficer }) {
  if (!receivingOfficer) throw new Error('receivingOfficer is required');
  const db = getDb();
  const now = new Date().toISOString();
  const caseData = getCase(caseId);
  if (!caseData) throw new Error('Case not found');

  // Update case assignment
  db.prepare('UPDATE cases SET assigned_to = ?, updated_at = ? WHERE case_id = ?')
    .run(receivingOfficer, now, caseId);

  // Record provenance events
  createProvenanceEvent({
    caseId,
    eventType: 'CASE_TRANSFERRED',
    actorType: 'officer',
    actorId: previousOfficer || 'unknown',
    description: `Case transferred from ${previousOfficer || 'unknown'} to ${receivingOfficer}`,
    metadataJson: {
      previousOfficer: previousOfficer || 'unknown',
      receivingOfficer,
      receivingDepartment: receivingDepartment || receivingOfficer,
      reason,
      currentStage: caseData.currentStage,
    },
  });

  createProvenanceEvent({
    caseId,
    eventType: 'HANDOVER_ACCEPTED',
    actorType: 'officer',
    actorId: receivingOfficer,
    description: `Handover accepted by ${receivingOfficer}`,
    metadataJson: {
      receivingOfficer,
      receivingDepartment: receivingDepartment || receivingOfficer,
      acceptedAt: now,
    },
  });

  return getCase(caseId);
}

/**
 * Get integrity summary for a case
 * Includes evidence integrity and provenance chain status
 */
export function getCaseIntegrity(caseId) {
  const evidence = getEvidenceForCase(caseId);
  const events = getEventsForCase(caseId);

  const evidenceIntegrity = evidence.map(e => ({
    evidence_id: e.evidence_id,
    name: e.name,
    evidence_hash: e.evidence_hash,
    verification_status: e.verification_status,
    verified: e.verified,
  }));

  // Simple chain status
  const chainValid = events.length > 0;
  let chainBroken = false;
  for (let i = 1; i < events.length; i++) {
    if (events[i].previous_record_hash !== events[i - 1].record_hash) {
      chainBroken = true;
      break;
    }
  }

  let overallStatus = 'VERIFIED';
  if (evidence.some(e => !e.verified)) overallStatus = 'REVIEW_REQUIRED';
  if (chainBroken) overallStatus = 'COMPROMISED';
  if (evidence.some(e => e.verification_status === 'compromised')) overallStatus = 'COMPROMISED';

  return {
    case_id: caseId,
    overall_status: overallStatus,
    evidence_integrity: evidenceIntegrity,
    provenance_chain_valid: chainValid && !chainBroken,
    event_count: events.length,
    evidence_count: evidence.length,
  };
}

function formatCaseRow(row) {
  return {
    id: row.case_id,
    case_id: row.case_id,
    caseNumber: row.case_number,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    status: row.status,
    severity: row.severity,
    system: row.system,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentStage: row.current_stage,
    stages: JSON.parse(row.stages_json || '[]'),
    evidenceItems: JSON.parse(row.evidence_items_json || '[]'),
    evidenceVerified: row.evidence_verified === 1,
    detection: JSON.parse(row.detection_json || '{}'),
    investigation: JSON.parse(row.investigation_json || '{}'),
    finding: JSON.parse(row.finding_json || '{}'),
    remediation: JSON.parse(row.remediation_json || '{}'),
    verification: JSON.parse(row.verification_json || '{}'),
    deployment: JSON.parse(row.deployment_json || '{}'),
    monitoring: JSON.parse(row.monitoring_json || '{}'),
    timeline: JSON.parse(row.timeline_json || '[]'),
    fixSteps: JSON.parse(row.fix_steps_json || '[]'),
  };
}
