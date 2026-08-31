import { createHash } from 'crypto';

/**
 * IntegrityService - SHA-256 hashing + canonical serialization
 * 
 * Two separate integrity concepts:
 * 1. Evidence Hash = Hash of the actual evidence content
 * 2. Record Hash = Hash representing a provenance event and its chain
 */

/**
 * Calculate SHA-256 hash of content
 * Same input always produces same hash.
 * Supports text and binary (Buffer).
 */
export function sha256(content) {
  if (content === null || content === undefined) {
    content = '';
  }
  if (typeof content === 'string') {
    content = Buffer.from(content, 'utf-8');
  }
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Calculate Evidence Hash from actual evidence content
 * The Evidence Hash MUST be calculated from the actual content.
 */
export function hashEvidence(content) {
  return sha256(content);
}

/**
 * Canonical serialization for Record Hash calculation.
 * 
 * Field order (FIXED):
 *   1. event_id
 *   2. case_id
 *   3. evidence_id (empty string if null)
 *   4. event_type
 *   5. actor_type
 *   6. actor_id
 *   7. timestamp (ISO 8601)
 *   8. description (empty string if null)
 *   9. previous_record_hash
 * 
 * Encoding: UTF-8
 * Null values: empty string ""
 * Separator: "|" (pipe)
 * No trailing separator
 */
const SERIALIZATION_FIELDS = [
  'event_id',
  'case_id',
  'evidence_id',
  'event_type',
  'actor_type',
  'actor_id',
  'timestamp',
  'description',
  'previous_record_hash',
];

export function canonicalSerialize(record) {
  return SERIALIZATION_FIELDS
    .map(field => {
      const value = record[field];
      if (value === null || value === undefined) return '';
      return String(value);
    })
    .join('|');
}

/**
 * Calculate Record Hash from a provenance event record
 * Uses deterministic canonical serialization
 */
export function hashRecord(record) {
  const serialized = canonicalSerialize(record);
  return sha256(serialized);
}

/**
 * Verify that a record hash matches the expected value
 */
export function verifyRecordHash(record, expectedHash) {
  const calculated = hashRecord(record);
  return {
    expected: expectedHash,
    calculated,
    match: calculated === expectedHash,
  };
}

/**
 * Verify evidence integrity by re-hashing content and comparing
 */
export function verifyEvidenceIntegrity(content, storedHash) {
  const calculated = hashEvidence(content);
  return {
    expected: storedHash,
    calculated,
    verified: calculated === storedHash,
  };
}

/**
 * Verify a provenance chain:
 * 1. Retrieve events in chronological order
 * 2. Start from genesis state (previous_record_hash = "GENESIS")
 * 3. Verify each event's Record Hash
 * 4. Verify Previous Record Hash relationships
 * 5. Detect broken links
 */
export function verifyProvenanceChain(events) {
  const results = [];
  let chainValid = true;
  let firstBrokenIndex = -1;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Verify the record hash matches recalculated value
    const record = {
      event_id: event.event_id,
      case_id: event.case_id,
      evidence_id: event.evidence_id || '',
      event_type: event.event_type,
      actor_type: event.actor_type,
      actor_id: event.actor_id,
      timestamp: event.timestamp,
      description: event.description || '',
      previous_record_hash: event.previous_record_hash,
    };

    const calculatedHash = hashRecord(record);
    const hashValid = calculatedHash === event.record_hash;

    // Verify chain link
    let chainLinkValid = true;
    if (i > 0) {
      chainLinkValid = event.previous_record_hash === events[i - 1].record_hash;
    } else {
      chainLinkValid = event.previous_record_hash === 'GENESIS';
    }

    const eventValid = hashValid && chainLinkValid;

    if (!eventValid && firstBrokenIndex === -1) {
      firstBrokenIndex = i;
      chainValid = false;
    }

    // After a break, all subsequent events are considered broken
    if (firstBrokenIndex !== -1 && i > firstBrokenIndex) {
      chainValid = false;
    }

    results.push({
      event_id: event.event_id,
      event_type: event.event_type,
      timestamp: event.timestamp,
      hash_valid: hashValid,
      chain_link_valid: chainLinkValid,
      overall_valid: eventValid && (firstBrokenIndex === -1 || i <= firstBrokenIndex),
      expected_previous_hash: i > 0 ? events[i - 1].record_hash : 'GENESIS',
      actual_previous_hash: event.previous_record_hash,
      expected_record_hash: calculatedHash,
      actual_record_hash: event.record_hash,
    });
  }

  return {
    chain_valid: chainValid && events.length > 0,
    event_count: events.length,
    events: results,
  };
}
