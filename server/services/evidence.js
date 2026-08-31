import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { hashEvidence, sha256 } from './integrity.js';
import { createProvenanceEvent, getEventsForEvidence } from './provenance.js';
import { Buffer } from 'buffer';

/**
 * EvidenceService
 * - registerEvidence()
 * - getEvidence()
 * - getEvidenceForCase()
 * - verifyEvidence()
 * - simulateTamper()
 */

let evidenceCounter = 0;

function getNextEvidenceId(caseId) {
  const db = getDb();
  const row = db.prepare("SELECT evidence_id FROM evidence ORDER BY CAST(SUBSTR(evidence_id, 3) AS INTEGER) DESC LIMIT 1").get();
  if (!row) return 'E-001';
  const currentNum = parseInt(row.evidence_id.replace('E-', ''), 10);
  return `E-${String(currentNum + 1).padStart(3, '0')}`;
}

/**
 * Register new evidence.
 * 1. Receive evidence metadata/file
 * 2. Generate unique Evidence ID
 * 3. Store the evidence
 * 4. Calculate SHA-256 from actual content
 * 5. Create Evidence DB record
 * 6. Create first provenance event
 * 7. Calculate Record Hash
 * 8. Store Record Hash
 * 9. Return evidence record
 */
export function registerEvidence({ caseId, name, type, source, collectedBy, content, description, contentEncoding, fileName, fileSize, mimeType }) {
  const db = getDb();
  const evidenceId = getNextEvidenceId(caseId);
  const now = new Date().toISOString();

  // Handle base64-encoded file content (real file upload)
  let evidenceHash;
  let size;
  let contentStr;

  if (contentEncoding === 'base64' && content) {
    // Decode base64 to binary buffer for real SHA-256
    const fileBuffer = Buffer.from(content, 'base64');
    evidenceHash = sha256(fileBuffer);
    size = fileBuffer.length;
    contentStr = content; // Store the base64 string
  } else {
    contentStr = content || `${name}|${description || ''}|${source || ''}`;
    evidenceHash = hashEvidence(contentStr);
    size = Buffer.byteLength(contentStr, 'utf-8');
  }

  // Create the provenance event for registration
  const provenanceEvent = createProvenanceEvent({
    caseId,
    evidenceId,
    eventType: 'EVIDENCE_REGISTERED',
    actorType: 'officer',
    actorId: collectedBy || 'Officer Martinez',
    description: `Evidence ${name} (${evidenceId}) registered for case ${caseId}`,
    metadataJson: { evidence_name: name, evidence_type: type },
  });

  const dbRecord = db.prepare(`
    INSERT INTO evidence (
      evidence_id, case_id, name, type, source, collected_by, collected_at,
      storage_reference, content, size, hash_algorithm, evidence_hash,
      record_hash, verification_status, created_at, label, description,
      verified, integrity_message, content_encoding, file_name, mime_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evidenceId, caseId, name, type || 'unknown', source || 'Not specified',
    collectedBy || 'Officer Martinez', now,
    `storage://${evidenceId}`, contentStr, size,
    'SHA-256', evidenceHash,
    provenanceEvent.record_hash, 'verified', now,
    name, description || `${type || 'Evidence'} collected for case ${caseId}`,
    1, 'Evidence has not been changed since registration.',
    contentEncoding || null, fileName || null, mimeType || null
  );

  // Update case evidence list
  const caseData = db.prepare('SELECT * FROM cases WHERE case_id = ?').get(caseId);
  if (caseData) {
    const evidenceItems = JSON.parse(caseData.evidence_items_json || '[]');
    evidenceItems.push(evidenceId);
    db.prepare('UPDATE cases SET evidence_items_json = ?, updated_at = ? WHERE case_id = ?')
      .run(JSON.stringify(evidenceItems), now, caseId);
  }

  // Create verification record
  const verificationId = `VER-${uuidv4().substring(0, 8)}`;
  db.prepare(`
    INSERT INTO integrity_verifications (
      verification_id, case_id, evidence_id, verification_type,
      expected_hash, calculated_hash, status, verified_at, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    verificationId, caseId, evidenceId, 'EVIDENCE_REGISTRATION',
    evidenceHash, evidenceHash, 'verified', now,
    'Evidence hash matches calculated SHA-256'
  );

  // Update case evidence_verified flag
  db.prepare('UPDATE cases SET evidence_verified = 1, updated_at = ? WHERE case_id = ?')
    .run(now, caseId);

  return {
    evidence_id: evidenceId,
    case_id: caseId,
    name,
    label: name,
    type: type || 'unknown',
    source: source || 'Not specified',
    collected_by: collectedBy || 'Officer Martinez',
    collected_at: now,
    evidence_hash: evidenceHash,
    record_hash: provenanceEvent.record_hash,
    hash_algorithm: 'SHA-256',
    verification_status: 'verified',
    size,
    verified: true,
    integrity_message: 'Evidence has not been changed since registration.',
    description: description || `${type || 'Evidence'} collected for case ${caseId}`,
    file_name: fileName || null,
    mime_type: mimeType || null,
    content_encoding: contentEncoding || null,
  };
}

/**
 * Get evidence by ID
 */
export function getEvidence(evidenceId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM evidence WHERE evidence_id = ?').get(evidenceId);
  if (!row) return null;
  return formatEvidenceRow(row);
}

/**
 * Get all evidence for a case
 */
export function getEvidenceForCase(caseId) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at ASC').all(caseId);
  return rows.map(formatEvidenceRow);
}

/**
 * Get all evidence items
 */
export function getAllEvidence() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM evidence ORDER BY created_at ASC').all();
  return rows.map(formatEvidenceRow);
}

/**
 * Verify evidence integrity
 * 1. Retrieve stored evidence
 * 2. Calculate SHA-256 again
 * 3. Compare with stored hash
 * 4. Return result
 */
export function verifyEvidence(evidenceId) {
  const db = getDb();
  const evidence = db.prepare('SELECT * FROM evidence WHERE evidence_id = ?').get(evidenceId);
  if (!evidence) {
    return { status: 'error', reason: 'Evidence not found' };
  }

  // Handle base64-encoded content: decode to binary before hashing
  let calculatedHash;
  if (evidence.content_encoding === 'base64' && evidence.content) {
    const fileBuffer = Buffer.from(evidence.content, 'base64');
    calculatedHash = sha256(fileBuffer);
  } else {
    calculatedHash = hashEvidence(evidence.content);
  }
  const verified = calculatedHash === evidence.evidence_hash;
  const now = new Date().toISOString();

  const verificationId = `VER-${uuidv4().substring(0, 8)}`;
  db.prepare(`
    INSERT INTO integrity_verifications (
      verification_id, case_id, evidence_id, verification_type,
      expected_hash, calculated_hash, status, verified_at, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    verificationId, evidence.case_id, evidenceId, 'EVIDENCE_INTEGRITY_CHECK',
    evidence.evidence_hash, calculatedHash,
    verified ? 'verified' : 'compromised', now,
    verified ? 'Evidence hash matches stored hash' : 'Evidence hash mismatch - integrity compromised'
  );

  // Create provenance event for the verification
  createProvenanceEvent({
    caseId: evidence.case_id,
    evidenceId,
    eventType: verified ? 'EVIDENCE_VERIFIED' : 'INTEGRITY_FAILURE',
    actorType: 'system',
    actorId: 'integrity-engine',
    description: verified
      ? `Evidence ${evidenceId} integrity verified - hash matches`
      : `INTEGRITY FAILURE: Evidence ${evidenceId} hash mismatch detected`,
    metadataJson: {
      expected_hash: evidence.evidence_hash,
      calculated_hash: calculatedHash,
      verified,
    },
  });

  return {
    evidence_id: evidenceId,
    expected_hash: evidence.evidence_hash,
    calculated_hash: calculatedHash,
    verified,
    status: verified ? 'VERIFIED' : 'COMPROMISED',
    reason: verified
      ? '✓ EVIDENCE INTEGRITY VERIFIED'
      : '⚠ EVIDENCE INTEGRITY COMPROMISED',
  };
}

/**
 * Simulate tamper by modifying evidence content in storage
 * This is a SAFE DEMO-ONLY mechanism
 */
export function simulateTamper(evidenceId) {
  const db = getDb();
  const evidence = db.prepare('SELECT * FROM evidence WHERE evidence_id = ?').get(evidenceId);
  if (!evidence) {
    return { status: 'error', reason: 'Evidence not found' };
  }

  const now = new Date().toISOString();
  let tamperedContent;
  if (evidence.content_encoding === 'base64' && evidence.content) {
    // For base64 content, decode, modify, and re-encode
    const decoded = Buffer.from(evidence.content, 'base64').toString('utf-8');
    tamperedContent = Buffer.from(decoded + '\n[TAMPERED: content modified after registration]', 'utf-8').toString('base64');
  } else {
    tamperedContent = evidence.content + '\n[TAMPERED: content modified after registration]';
  }

  db.prepare('UPDATE evidence SET content = ?, verification_status = ?, verified = 0, integrity_message = ? WHERE evidence_id = ?')
    .run(tamperedContent, 'compromised', 'Evidence content has been modified since registration.', evidenceId);

  // Create provenance event for the tamper
  createProvenanceEvent({
    caseId: evidence.case_id,
    evidenceId,
    eventType: 'INTEGRITY_FAILURE',
    actorType: 'simulation',
    actorId: 'tamper-simulation',
    description: `Simulated tamper on evidence ${evidenceId} — content modified`,
    metadataJson: { original_hash: evidence.evidence_hash, reason: 'tamper_simulation' },
  });

  const newHash = hashEvidence(tamperedContent);
  return {
    evidence_id: evidenceId,
    original_hash: evidence.evidence_hash,
    tampered_hash: newHash,
    status: 'tampered',
    message: `Evidence ${evidenceId} content has been modified. Run verification to detect mismatch.`,
  };
}

function formatEvidenceRow(row) {
  return {
    id: row.evidence_id,
    evidence_id: row.evidence_id,
    case_id: row.case_id,
    caseId: row.case_id,
    name: row.name,
    label: row.label || row.name,
    type: row.type,
    source: row.source,
    collected_by: row.collected_by,
    collectedBy: row.collected_by,
    collected_at: row.collected_at,
    collectedAt: row.collected_at,
    evidence_hash: row.evidence_hash,
    fingerprint: row.evidence_hash,
    record_hash: row.record_hash,
    hash_algorithm: row.hash_algorithm,
    verification_status: row.verification_status,
    verified: row.verified === 1,
    size: row.size,
    description: row.description,
    integrity_message: row.integrity_message,
    content_encoding: row.content_encoding,
    file_name: row.file_name,
    mime_type: row.mime_type,
    created_at: row.created_at,
  };
}
