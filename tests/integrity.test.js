import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sha256, hashEvidence, hashRecord, canonicalSerialize, verifyEvidenceIntegrity, verifyProvenanceChain } from '../server/services/integrity.js';

describe('IntegrityService', () => {
  describe('SHA-256 Hashing', () => {
    it('TEST 1: Same evidence → same SHA-256 hash', () => {
      const content = 'This is test evidence content';
      const hash1 = sha256(content);
      const hash2 = sha256(content);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('TEST 2: Different evidence → different SHA-256 hash', () => {
      const content1 = 'Evidence item A';
      const content2 = 'Evidence item B';
      const hash1 = sha256(content1);
      const hash2 = sha256(content2);
      expect(hash1).not.toBe(hash2);
    });

    it('hashEvidence produces consistent SHA-256', () => {
      const content = 'server-auth.log content here';
      const hash = hashEvidence(content);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hashEvidence(content)).toBe(hash);
    });
  });

  describe('Canonical Serialization', () => {
    it('produces deterministic output for same input', () => {
      const record = {
        event_id: 'PE-000001',
        case_id: 'CASE-0241',
        evidence_id: 'E-001',
        event_type: 'EVIDENCE_REGISTERED',
        actor_type: 'officer',
        actor_id: 'Officer Martinez',
        timestamp: '2026-08-30T10:44:00.000Z',
        description: 'Evidence registered',
        previous_record_hash: 'GENESIS',
      };
      const s1 = canonicalSerialize(record);
      const s2 = canonicalSerialize(record);
      expect(s1).toBe(s2);
    });

    it('produces different output for different records', () => {
      const record1 = {
        event_id: 'PE-000001', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_REGISTERED', actor_type: 'officer', actor_id: 'Officer Martinez',
        timestamp: '2026-08-30T10:44:00.000Z', description: 'First event', previous_record_hash: 'GENESIS',
      };
      const record2 = {
        ...record1, event_id: 'PE-000002', description: 'Second event', previous_record_hash: 'some-hash',
      };
      expect(canonicalSerialize(record1)).not.toBe(canonicalSerialize(record2));
    });

    it('handles null values as empty strings', () => {
      const record = {
        event_id: 'PE-000001', case_id: 'CASE-0241', evidence_id: null,
        event_type: 'EVIDENCE_REGISTERED', actor_type: 'system', actor_id: 'system',
        timestamp: '2026-08-30T10:44:00.000Z', description: null, previous_record_hash: 'GENESIS',
      };
      const serialized = canonicalSerialize(record);
      // null evidence_id and null description should be empty strings
      const parts = serialized.split('|');
      expect(parts[2]).toBe(''); // evidence_id
      expect(parts[7]).toBe(''); // description
    });
  });

  describe('Record Hash', () => {
    it('generates deterministic record hash', () => {
      const record = {
        event_id: 'PE-000001', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_REGISTERED', actor_type: 'officer', actor_id: 'Officer Martinez',
        timestamp: '2026-08-30T10:44:00.000Z', description: 'Evidence registered', previous_record_hash: 'GENESIS',
      };
      const hash1 = hashRecord(record);
      const hash2 = hashRecord(record);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('different records produce different hashes', () => {
      const record1 = {
        event_id: 'PE-000001', case_id: 'CASE-0241', evidence_id: '',
        event_type: 'EVIDENCE_REGISTERED', actor_type: 'system', actor_id: 'system',
        timestamp: '2026-08-30T10:44:00.000Z', description: '', previous_record_hash: 'GENESIS',
      };
      const record2 = {
        ...record1, event_id: 'PE-000002',
      };
      expect(hashRecord(record1)).not.toBe(hashRecord(record2));
    });
  });

  describe('Evidence Integrity Verification', () => {
    it('TEST 3: Registered evidence → verification passes', () => {
      const content = 'Original evidence content';
      const storedHash = hashEvidence(content);
      const result = verifyEvidenceIntegrity(content, storedHash);
      expect(result.verified).toBe(true);
      expect(result.calculated).toBe(result.expected);
    });

    it('TEST 4: Modified evidence → verification fails', () => {
      const originalContent = 'Original evidence content';
      const tamperedContent = 'Modified evidence content';
      const storedHash = hashEvidence(originalContent);
      const result = verifyEvidenceIntegrity(tamperedContent, storedHash);
      expect(result.verified).toBe(false);
      expect(result.calculated).not.toBe(result.expected);
    });
  });

  describe('Provenance Chain Verification', () => {
    it('TEST 5: Valid provenance chain → verification passes', () => {
      // Create a valid chain of 3 events
      const event1 = {
        event_id: 'PE-000001', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_REGISTERED', actor_type: 'officer', actor_id: 'Officer Martinez',
        timestamp: '2026-08-30T10:44:00.000Z', description: 'Evidence registered',
        previous_record_hash: 'GENESIS',
      };
      event1.record_hash = hashRecord(event1);

      const event2 = {
        event_id: 'PE-000002', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_VERIFIED', actor_type: 'system', actor_id: 'integrity-engine',
        timestamp: '2026-08-30T10:45:00.000Z', description: 'Evidence verified',
        previous_record_hash: event1.record_hash,
      };
      event2.record_hash = hashRecord(event2);

      const event3 = {
        event_id: 'PE-000003', case_id: 'CASE-0241', evidence_id: '',
        event_type: 'INTEGRITY_CHECK', actor_type: 'system', actor_id: 'system',
        timestamp: '2026-08-30T10:46:00.000Z', description: 'Chain integrity check',
        previous_record_hash: event2.record_hash,
      };
      event3.record_hash = hashRecord(event3);

      const result = verifyProvenanceChain([event1, event2, event3]);
      expect(result.chain_valid).toBe(true);
      expect(result.event_count).toBe(3);
      result.events.forEach(e => {
        expect(e.hash_valid).toBe(true);
        expect(e.chain_link_valid).toBe(true);
      });
    });

    it('TEST 6: Modified provenance event → chain verification fails', () => {
      const event1 = {
        event_id: 'PE-000001', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_REGISTERED', actor_type: 'officer', actor_id: 'Officer Martinez',
        timestamp: '2026-08-30T10:44:00.000Z', description: 'Evidence registered',
        previous_record_hash: 'GENESIS',
      };
      event1.record_hash = hashRecord(event1);

      const event2 = {
        event_id: 'PE-000002', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_VERIFIED', actor_type: 'system', actor_id: 'integrity-engine',
        timestamp: '2026-08-30T10:45:00.000Z', description: 'Evidence verified',
        previous_record_hash: event1.record_hash,
      };
      event2.record_hash = hashRecord(event2);

      // Tamper with event2's description (but keep old record_hash)
      const tamperedEvent2 = { ...event2, description: 'TAMPERED description', record_hash: event2.record_hash };

      const event3 = {
        event_id: 'PE-000003', case_id: 'CASE-0241', evidence_id: '',
        event_type: 'INTEGRITY_CHECK', actor_type: 'system', actor_id: 'system',
        timestamp: '2026-08-30T10:46:00.000Z', description: 'Chain integrity check',
        previous_record_hash: event2.record_hash, // Still points to original event2's hash
      };
      event3.record_hash = hashRecord(event3);

      const result = verifyProvenanceChain([event1, tamperedEvent2, event3]);
      expect(result.chain_valid).toBe(false);
      // Event 2 should fail hash validation
      expect(result.events[1].hash_valid).toBe(false);
    });

    it('TEST 7: Broken previous-record hash → chain verification fails', () => {
      const event1 = {
        event_id: 'PE-000001', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_REGISTERED', actor_type: 'officer', actor_id: 'Officer Martinez',
        timestamp: '2026-08-30T10:44:00.000Z', description: 'Evidence registered',
        previous_record_hash: 'GENESIS',
      };
      event1.record_hash = hashRecord(event1);

      // Event 2 has wrong previous_record_hash
      const event2 = {
        event_id: 'PE-000002', case_id: 'CASE-0241', evidence_id: 'E-001',
        event_type: 'EVIDENCE_VERIFIED', actor_type: 'system', actor_id: 'integrity-engine',
        timestamp: '2026-08-30T10:45:00.000Z', description: 'Evidence verified',
        previous_record_hash: 'WRONG_HASH_BROKEN_CHAIN',
      };
      event2.record_hash = hashRecord(event2);

      const result = verifyProvenanceChain([event1, event2]);
      expect(result.chain_valid).toBe(false);
      expect(result.events[1].chain_link_valid).toBe(false);
    });
  });
});
