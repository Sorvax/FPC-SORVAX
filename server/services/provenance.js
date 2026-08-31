import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { hashRecord, verifyProvenanceChain } from './integrity.js';

/**
 * ProvenanceService
 * - createEvent()
 * - getEvents()
 * - getEventsForEvidence()
 * - verifyChain()
 */

let eventCounter = 100; // Start high to avoid collisions with seeded data

function getNextEventId() {
  eventCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `PE-${timestamp}-${random}`;
}

/**
 * Get the previous record hash for a case's provenance chain
 */
function getPreviousRecordHash(caseId) {
  const db = getDb();
  const lastEvent = db.prepare(
    'SELECT record_hash FROM provenance_events WHERE case_id = ? ORDER BY rowid DESC LIMIT 1'
  ).get(caseId);
  return lastEvent ? lastEvent.record_hash : 'GENESIS';
}

/**
 * Create a provenance event
 */
export function createProvenanceEvent({
  caseId,
  evidenceId,
  actionId,
  eventType,
  actorType,
  actorId,
  description,
  metadataJson,
}) {
  const db = getDb();
  const eventId = getNextEventId();
  const now = new Date().toISOString();
  const previousRecordHash = getPreviousRecordHash(caseId);

  const record = {
    event_id: eventId,
    case_id: caseId,
    evidence_id: evidenceId || '',
    event_type: eventType,
    actor_type: actorType || 'system',
    actor_id: actorId || 'system',
    timestamp: now,
    description: description || '',
    previous_record_hash: previousRecordHash,
  };

  const recordHash = hashRecord(record);

  db.prepare(`
    INSERT INTO provenance_events (
      event_id, case_id, evidence_id, action_id, event_type,
      actor_type, actor_id, timestamp, description,
      previous_record_hash, record_hash, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId, caseId, evidenceId || null, actionId || null,
    eventType, actorType || 'system', actorId || 'system',
    now, description || '', previousRecordHash, recordHash,
    JSON.stringify(metadataJson || {})
  );

  return {
    event_id: eventId,
    case_id: caseId,
    evidence_id: evidenceId,
    event_type: eventType,
    timestamp: now,
    previous_record_hash: previousRecordHash,
    record_hash: recordHash,
    description,
  };
}

/**
 * Get all provenance events for a case, in chronological order
 */
export function getEventsForCase(caseId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM provenance_events WHERE case_id = ? ORDER BY rowid ASC'
  ).all(caseId).map(formatEventRow);
}

/**
 * Get provenance events for a specific evidence item
 */
export function getEventsForEvidence(evidenceId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM provenance_events WHERE evidence_id = ? ORDER BY rowid ASC'
  ).all(evidenceId).map(formatEventRow);
}

/**
 * Verify provenance chain for a case
 */
export function verifyChain(caseId) {
  const events = getEventsForCase(caseId);
  return verifyProvenanceChain(events);
}

function formatEventRow(row) {
  return {
    event_id: row.event_id,
    case_id: row.case_id,
    evidence_id: row.evidence_id,
    action_id: row.action_id,
    event_type: row.event_type,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    timestamp: row.timestamp,
    description: row.description,
    previous_record_hash: row.previous_record_hash,
    record_hash: row.record_hash,
    metadata: JSON.parse(row.metadata_json || '{}'),
  };
}
