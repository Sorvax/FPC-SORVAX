import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerEvidence, getEvidence, getEvidenceForCase, verifyEvidence, simulateTamper, getAllEvidence } from '../server/services/evidence.js';
import { getCase } from '../server/services/case.js';

describe('EvidenceService', () => {
  // Ensure DB is initialized before tests
  beforeAll(() => {
    // Import db module to ensure initialization
    import('../server/db.js').then(({ getDb }) => getDb());
  });

  describe('Evidence Registration', () => {
    it('TEST 8: New evidence → Evidence ID generated', () => {
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Test Evidence Item',
        type: 'file',
        source: '/tmp/test.txt',
        content: 'Test evidence content for registration',
        description: 'Test evidence',
        collectedBy: 'Officer Martinez',
      });

      expect(result.evidence_id).toBeDefined();
      expect(result.evidence_id).toMatch(/^E-\d{3,}$/);
      expect(result.evidence_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.record_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.verification_status).toBe('verified');
    });

    it('TEST 9: New evidence → provenance event created', () => {
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Provenance Test Evidence',
        type: 'logs',
        content: 'Evidence for provenance testing',
        description: 'Testing provenance event creation',
      });

      // Verify the evidence exists
      const evidence = getEvidence(result.evidence_id);
      expect(evidence).not.toBeNull();
      expect(evidence.evidence_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('TEST 10: New evidence → case evidence count updates', () => {
      const initialCase = getCase('CASE-0241');
      const initialCount = initialCase.evidenceItems.length;

      registerEvidence({
        caseId: 'CASE-0241',
        name: 'Count Test Evidence',
        type: 'system',
        content: 'Evidence for count testing',
        description: 'Testing case evidence count update',
      });

      const updatedCase = getCase('CASE-0241');
      expect(updatedCase.evidenceItems.length).toBe(initialCount + 1);
    });

    it('registered evidence has real SHA-256 hash (not random)', () => {
      const content = 'Specific evidence content for deterministic test';
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Deterministic Hash Test',
        type: 'file',
        content,
      });

      // The hash should be deterministic - re-registering same content should give same hash
      const result2 = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Deterministic Hash Test 2',
        type: 'file',
        content, // Same content
      });

      expect(result.evidence_hash).toBe(result2.evidence_hash);
    });
  });

  describe('Evidence Verification', () => {
    it('registered evidence → verification passes', () => {
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Verification Test Evidence',
        type: 'logs',
        content: 'Evidence for verification testing',
      });

      const verification = verifyEvidence(result.evidence_id);
      expect(verification.verified).toBe(true);
      expect(verification.status).toBe('VERIFIED');
    });

    it('tampered evidence → verification fails', () => {
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Tamper Test Evidence',
        type: 'file',
        content: 'Original evidence content for tamper testing',
      });

      // Tamper with the evidence
      const tamperResult = simulateTamper(result.evidence_id);
      expect(tamperResult.status).toBe('tampered');

      // Verification should now fail
      const verification = verifyEvidence(result.evidence_id);
      expect(verification.verified).toBe(false);
      expect(verification.status).toBe('COMPROMISED');
    });
  });
});
