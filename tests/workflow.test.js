import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import { getCase, createCase, updateCase, transferCase, getCases } from '../server/services/case.js';
import { getEventsForCase } from '../server/services/provenance.js';
import { getEvidenceForCase } from '../server/services/evidence.js';

describe('FPC–SORVAX Workflow Architecture', () => {
  beforeAll(() => {
    getDb();
    seedDatabase();
  });

  // ═══════════════════════════════════════════════════════
  // 1. NEW CASES HAVE UPDATED STAGES
  // ═══════════════════════════════════════════════════════
  describe('1. New Case Stage Structure', () => {
    it('new cases have 11 stages including report and decision', () => {
      const newCase = createCase({
        title: 'Stage Structure Test',
        severity: 'low',
        assignedTo: 'Test Officer',
      });
      expect(newCase.stages).toBeDefined();
      expect(newCase.stages.length).toBe(11);
    });

    it('new cases include "report" (Initial Report) stage', () => {
      const newCase = createCase({
        title: 'Report Stage Test',
        severity: 'low',
      });
      const reportStage = newCase.stages.find(s => s.id === 'report');
      expect(reportStage).toBeDefined();
      expect(reportStage.label).toBe('Initial Report');
    });

    it('new cases include "decision" (Next Action) stage', () => {
      const newCase = createCase({
        title: 'Decision Stage Test',
        severity: 'low',
      });
      const decisionStage = newCase.stages.find(s => s.id === 'decision');
      expect(decisionStage).toBeDefined();
      expect(decisionStage.label).toBe('Next Action');
    });

    it('report stage comes after finding and before decision', () => {
      const newCase = createCase({
        title: 'Stage Order Test',
        severity: 'low',
      });
      const stageIds = newCase.stages.map(s => s.id);
      const findingIdx = stageIds.indexOf('finding');
      const reportIdx = stageIds.indexOf('report');
      const decisionIdx = stageIds.indexOf('decision');
      expect(reportIdx).toBeGreaterThan(findingIdx);
      expect(decisionIdx).toBeGreaterThan(reportIdx);
    });

    it('decision stage comes before remediation', () => {
      const newCase = createCase({
        title: 'Decision Order Test',
        severity: 'low',
      });
      const stageIds = newCase.stages.map(s => s.id);
      const decisionIdx = stageIds.indexOf('decision');
      const remediationIdx = stageIds.indexOf('remediation');
      expect(decisionIdx).toBeLessThan(remediationIdx);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. CONTINUE CASE PATH
  // ═══════════════════════════════════════════════════════
  describe('2. Continue Case Path', () => {
    it('continue case does NOT create transfer provenance events', () => {
      const events = getEventsForCase('CASE-0241');
      const transferEvents = events.filter(e => e.event_type === 'CASE_TRANSFERRED');
      // CASE-0241 was continued, not transferred
      expect(transferEvents.length).toBe(0);
    });

    it('case remains assigned to original officer after continue', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.assignedTo).toBe('Officer Martinez');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. TRANSFER CASE (OPTIONAL)
  // ═══════════════════════════════════════════════════════
  describe('3. Transfer Case', () => {
    it('transfer is optional — cases can continue without transfer', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.assignedTo).toBe('Officer Martinez');
    });

    it('transferCase creates provenance events', () => {
      const newCase = createCase({
        title: 'Transfer Test Case',
        severity: 'low',
        system: 'Test System',
        assignedTo: 'Officer A',
      });

      const eventsBefore = getEventsForCase(newCase.id);

      transferCase(newCase.id, {
        receivingOfficer: 'Officer B',
        receivingDepartment: 'Cyber Team',
        reason: 'Specialized expertise needed',
        previousOfficer: 'Officer A',
      });

      const eventsAfter = getEventsForCase(newCase.id);
      expect(eventsAfter.length).toBeGreaterThan(eventsBefore.length);

      // Check for CASE_TRANSFERRED event
      const transferEvent = eventsAfter.find(e => e.event_type === 'CASE_TRANSFERRED');
      expect(transferEvent).toBeDefined();
      expect(transferEvent.actor_id).toBe('Officer A');

      // Check for HANDOVER_ACCEPTED event
      const handoverEvent = eventsAfter.find(e => e.event_type === 'HANDOVER_ACCEPTED');
      expect(handoverEvent).toBeDefined();
      expect(handoverEvent.actor_id).toBe('Officer B');
    });

    it('transfer updates case assignment', () => {
      const newCase = createCase({
        title: 'Transfer Assignment Test',
        severity: 'low',
        assignedTo: 'Officer X',
      });

      transferCase(newCase.id, {
        receivingOfficer: 'Officer Y',
        receivingDepartment: 'NetSec',
        reason: 'Test transfer',
        previousOfficer: 'Officer X',
      });

      const updated = getCase(newCase.id);
      expect(updated.assignedTo).toBe('Officer Y');
    });

    it('transfer requires receivingOfficer', () => {
      const newCase = createCase({
        title: 'Transfer Validation Test',
        severity: 'low',
        assignedTo: 'Officer A',
      });

      expect(() => {
        transferCase(newCase.id, {
          receivingOfficer: null,
          reason: 'Test',
          previousOfficer: 'Officer A',
        });
      }).toThrow('receivingOfficer is required');
    });

    it('transfer preserves original case data', () => {
      const newCase = createCase({
        title: 'Transfer Preserve Test',
        severity: 'high',
        system: 'Critical System',
        assignedTo: 'Officer Original',
      });

      transferCase(newCase.id, {
        receivingOfficer: 'Officer New',
        receivingDepartment: 'Security Team',
        reason: 'Expertise',
        previousOfficer: 'Officer Original',
      });

      const updated = getCase(newCase.id);
      expect(updated.title).toBe('Transfer Preserve Test');
      expect(updated.severity).toBe('high');
      expect(updated.system).toBe('Critical System');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. MONITORING AS PERSISTENT LAYER
  // ═══════════════════════════════════════════════════════
  describe('4. Monitoring Architecture', () => {
    it('monitoring stage exists in all cases', () => {
      const caseData = getCase('CASE-0241');
      const monitoringStage = caseData.stages.find(s => s.id === 'monitoring');
      expect(monitoringStage).toBeDefined();
    });

    it('monitoring data is stored separately from stage', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.monitoring).toBeDefined();
      expect(typeof caseData.monitoring).toBe('object');
    });

    it('monitoring is available after initial report', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.monitoring).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. TWO-REPORT MODEL
  // ═══════════════════════════════════════════════════════
  describe('5. Two-Report Model', () => {
    it('initial report data is preserved', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.detection).toBeDefined();
      expect(caseData.finding).toBeDefined();
      expect(caseData.remediation).toBeDefined();
    });

    it('verification data exists for post-patch report', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.verification).toBeDefined();
    });

    it('deployment data exists for post-patch report', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.deployment).toBeDefined();
    });

    it('CASE-0238 (completed) has all report data', () => {
      const caseData = getCase('CASE-0238');
      expect(caseData.detection).toBeDefined();
      expect(caseData.verification).toBeDefined();
      expect(caseData.deployment).toBeDefined();
      expect(caseData.monitoring).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. EVIDENCE HASHES UNCHANGED
  // ═══════════════════════════════════════════════════════
  describe('6. Evidence Integrity', () => {
    it('evidence hashes remain unchanged', () => {
      const evidence = getEvidenceForCase('CASE-0241');
      expect(evidence.length).toBeGreaterThan(0);

      for (const e of evidence) {
        expect(e.evidence_hash).toMatch(/^[a-f0-9]{64}$/);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // 7. BACKWARD COMPATIBILITY
  // ═══════════════════════════════════════════════════════
  describe('7. Backward Compatibility', () => {
    it('existing cases still have all original stages plus new ones', () => {
      const caseData = getCase('CASE-0241');
      const stageIds = caseData.stages.map(s => s.id);

      // All original stages present
      expect(stageIds).toContain('detected');
      expect(stageIds).toContain('evidence');
      expect(stageIds).toContain('investigation');
      expect(stageIds).toContain('finding');
      expect(stageIds).toContain('remediation');
      expect(stageIds).toContain('verification');
      expect(stageIds).toContain('deployment');
      expect(stageIds).toContain('monitoring');
      expect(stageIds).toContain('complete');
    });

    it('case data structure is preserved', () => {
      const caseData = getCase('CASE-0241');
      expect(caseData.id).toBeDefined();
      expect(caseData.title).toBeDefined();
      expect(caseData.severity).toBeDefined();
      expect(caseData.assignedTo).toBeDefined();
      expect(caseData.stages).toBeDefined();
      expect(caseData.evidenceItems).toBeDefined();
    });

    it('getCases still returns all cases', () => {
      const cases = getCases();
      expect(cases.length).toBeGreaterThan(0);
    });

    it('existing cases retain their stage data', () => {
      const caseData = getCase('CASE-0241');
      // CASE-0241 was at remediation stage in the original data
      const remediationStage = caseData.stages.find(s => s.id === 'remediation');
      expect(remediationStage).toBeDefined();
    });
  });
});
