import { describe, it, expect, beforeAll } from 'vitest';
import { createCase, getCase, getCases } from '../server/services/case.js';
import { registerEvidence, getEvidence, getAllEvidence, verifyEvidence, simulateTamper } from '../server/services/evidence.js';
import { getEventsForCase } from '../server/services/provenance.js';
import { sha256 } from '../server/services/integrity.js';

describe('Case Creation & Evidence Intake Flow', () => {
  beforeAll(() => {
    import('../server/db.js').then(({ getDb }) => getDb());
  });

  describe('Case Creation', () => {
    it('TEST 1: Create new case → Case ID auto-generated', () => {
      const newCase = createCase({
        title: 'Suspicious USB Activity',
        description: 'Potential unauthorized data transfer detected.',
        severity: 'medium',
        system: 'Cyber Operations',
        assignedTo: 'Officer Martinez',
      });

      expect(newCase).toBeDefined();
      expect(newCase.id).toBeDefined();
      expect(newCase.id).toMatch(/^CASE-\d{4}$/);
      expect(newCase.title).toBe('Suspicious USB Activity');
      expect(newCase.status).toBe('active');
      expect(newCase.severity).toBe('medium');

      // Store for later tests
      globalThis.__testCaseId = newCase.id;
    });

    it('TEST 2: Create new case → Case appears in Cases list', () => {
      const caseId = globalThis.__testCaseId;
      const caseData = getCase(caseId);
      expect(caseData).not.toBeNull();
      expect(caseData.title).toBe('Suspicious USB Activity');

      const allCases = getCases();
      const found = allCases.find(c => c.id === caseId);
      expect(found).toBeDefined();
    });

    it('TEST 1a: Next case ID increments from highest existing', () => {
      const cases = getCases();
      const numbers = cases.map(c => {
        const num = parseInt(c.id.replace('CASE-', ''), 10);
        return isNaN(num) ? 0 : num;
      });
      const maxExisting = Math.max(...numbers);

      const newestCase = createCase({
        title: 'Test Increment Case',
        severity: 'low',
      });

      const newNum = parseInt(newestCase.id.replace('CASE-', ''), 10);
      expect(newNum).toBe(maxExisting + 1);
    });

    it('Case has default stages with Detected completed and Evidence active', () => {
      const caseData = getCase(globalThis.__testCaseId);
      expect(caseData.stages).toBeDefined();
      expect(caseData.stages.length).toBe(11); // 9 original + report + decision
      expect(caseData.stages[0].status).toBe('completed'); // Detected
      expect(caseData.stages[1].status).toBe('active');    // Evidence
    });
  });

  describe('Case + Evidence Integration', () => {
    it('TEST 3: Create new case + evidence → Evidence linked correctly', () => {
      const newCase = createCase({
        title: 'Network Anomaly Investigation',
        description: 'Suspicious traffic pattern detected.',
        severity: 'high',
        system: 'Network Security',
        assignedTo: 'Officer Chen',
      });

      const result = registerEvidence({
        caseId: newCase.id,
        name: 'Network Capture',
        type: 'network',
        source: '/captures/anomaly.pcap',
        collectedBy: 'Officer Chen',
        content: 'POST /api/data HTTP/1.1\nHost: suspicious-server.com\nX-Forwarded-For: 10.0.3.15',
        description: 'Captured network traffic during anomaly window',
      });

      expect(result.evidence_id).toBeDefined();
      expect(result.case_id).toBe(newCase.id);

      // Verify evidence is linked to case
      const caseData = getCase(newCase.id);
      expect(caseData.evidenceItems).toContain(result.evidence_id);
    });
  });

  describe('Evidence Registration', () => {
    it('TEST 4: Evidence → real SHA-256 generated', () => {
      const content = 'USB Device: Kingston 32GB\nSerial: KST-20260830\nFile System: NTFS';
      const result = registerEvidence({
        caseId: globalThis.__testCaseId,
        name: 'USB Device 01',
        type: 'file',
        source: '/forensics/usb-device-01',
        content,
        description: 'Forensic copy of USB device',
      });

      expect(result.evidence_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.verification_status).toBe('verified');
      expect(result.verified).toBe(true);

      // Verify the hash is deterministic
      const result2 = registerEvidence({
        caseId: globalThis.__testCaseId,
        name: 'USB Device 01 Copy',
        type: 'file',
        content,
      });
      expect(result.evidence_hash).toBe(result2.evidence_hash);
    });

    it('TEST 5: Evidence → provenance event created', () => {
      const caseId = globalThis.__testCaseId;
      const eventsBefore = getEventsForCase(caseId);

      registerEvidence({
        caseId,
        name: 'Provenance Chain Test',
        type: 'file',
        content: 'Test content for provenance chain',
        description: 'Testing provenance event creation',
      });

      const eventsAfter = getEventsForCase(caseId);
      expect(eventsAfter.length).toBe(eventsBefore.length + 1);

      const newEvent = eventsAfter[eventsAfter.length - 1];
      expect(newEvent.event_type).toBe('EVIDENCE_REGISTERED');
      expect(newEvent.previous_record_hash).toBeDefined();
    });

    it('TEST 6: Record hash generated', () => {
      const result = registerEvidence({
        caseId: globalThis.__testCaseId,
        name: 'Record Hash Test',
        type: 'log',
        content: 'Test log content for record hash',
      });

      expect(result.record_hash).toBeDefined();
      expect(result.record_hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Existing Case Flow (Flow A)', () => {
    it('TEST 7: Existing case → evidence registration still works', () => {
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Existing Case Evidence Test',
        type: 'logs',
        source: '/var/log/test.log',
        collectedBy: 'Officer Martinez',
        content: 'Test evidence for existing case flow',
        description: 'Verifying existing case flow still works',
      });

      expect(result.evidence_id).toBeDefined();
      expect(result.case_id).toBe('CASE-0241');
      expect(result.evidence_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.record_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.verified).toBe(true);
    });
  });

  describe('Evidence Verification', () => {
    it('TEST 10: Evidence verification works', () => {
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Verification Flow Test',
        type: 'file',
        content: 'Content for verification test',
      });

      const verification = verifyEvidence(result.evidence_id);
      expect(verification.verified).toBe(true);
      expect(verification.status).toBe('VERIFIED');
    });

    it('TEST 11: Tamper simulation still works', () => {
      const result = registerEvidence({
        caseId: 'CASE-0241',
        name: 'Tamper Simulation Test',
        type: 'file',
        content: 'Original content for tamper test',
      });

      const tamperResult = simulateTamper(result.evidence_id);
      expect(tamperResult.status).toBe('tampered');

      const verification = verifyEvidence(result.evidence_id);
      expect(verification.verified).toBe(false);
      expect(verification.status).toBe('COMPROMISED');
    });
  });

  describe('Base64 File Upload', () => {
    it('Base64-encoded evidence → SHA-256 computed from binary content', () => {
      const textContent = 'USB Device: Kingston 32GB\nSerial: KST-20260830';
      const base64Content = Buffer.from(textContent, 'utf-8').toString('base64');

      const result = registerEvidence({
        caseId: globalThis.__testCaseId,
        name: 'Base64 Upload Test',
        type: 'file',
        content: base64Content,
        contentEncoding: 'base64',
        fileName: 'usb-device.txt',
        mimeType: 'text/plain',
        description: 'Testing base64 file upload',
      });

      expect(result.evidence_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.file_name).toBe('usb-device.txt');
      expect(result.mime_type).toBe('text/plain');

      // The hash should match the SHA-256 of the binary content
      const expectedHash = sha256(Buffer.from(textContent, 'utf-8'));
      expect(result.evidence_hash).toBe(expectedHash);
    });
  });

  describe('Provenance Chain', () => {
    it('New case creates CASE_CREATED event', () => {
      const newCase = createCase({
        title: 'Provenance Chain Test',
        severity: 'low',
        assignedTo: 'Officer Test',
      });

      const events = getEventsForCase(newCase.id);
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].event_type).toBe('CASE_CREATED');
      expect(events[0].previous_record_hash).toBe('GENESIS');
    });

    it('Evidence registration creates linked event after CASE_CREATED', () => {
      const newCase = createCase({
        title: 'Chain Link Test',
        severity: 'medium',
      });

      registerEvidence({
        caseId: newCase.id,
        name: 'Chain Test Evidence',
        type: 'file',
        content: 'Chain link test content',
      });

      const events = getEventsForCase(newCase.id);
      expect(events.length).toBe(2);
      expect(events[0].event_type).toBe('CASE_CREATED');
      expect(events[1].event_type).toBe('EVIDENCE_REGISTERED');
      expect(events[1].previous_record_hash).toBe(events[0].record_hash);
    });
  });
});
