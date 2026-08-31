import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import { runInvestigation, getInvestigation, getLatestInvestigation, getInvestigationEvents, getFindings, getFindingsForInvestigation } from '../server/services/investigation.js';
import { getEvidenceForCase } from '../server/services/evidence.js';
import { getEventsForCase } from '../server/services/provenance.js';
import { getAdapter, detectAdapter, listAdapters, registerAdapter } from '../server/integrations/index.js';
import { BaseAdapter } from '../server/integrations/adapters/BaseAdapter.js';
import { MockAdapter } from '../server/integrations/mock/MockAdapter.js';

describe('Phase 2 — Investigation Engine', () => {
  beforeAll(() => {
    getDb();
    seedDatabase();
  });

  // ═══════════════════════════════════════════════════════
  // 1. ADAPTER ARCHITECTURE
  // ═══════════════════════════════════════════════════════
  describe('Adapter Architecture', () => {
    it('Mock adapter is registered and retrievable', () => {
      const adapter = getAdapter('mock');
      expect(adapter).toBeInstanceOf(MockAdapter);
      expect(adapter).toBeInstanceOf(BaseAdapter);
    });

    it('Mock adapter returns correct source info', () => {
      const adapter = getAdapter('mock');
      const info = adapter.getSourceInfo();
      expect(info.name).toBe('Mock Adapter');
      expect(info.type).toBe('mock');
      expect(info.version).toBeDefined();
    });

    it('Mock adapter can handle mock data', () => {
      const adapter = getAdapter('mock');
      expect(adapter.canHandle({ type: 'mock' })).toBe(true);
      expect(adapter.canHandle({ scenario: 'suspicious-data-access' })).toBe(true);
      expect(adapter.canHandle(null)).toBe(false);
    });

    it('Adapter auto-detection selects mock adapter for mock data', () => {
      const adapter = detectAdapter({ type: 'mock' });
      expect(adapter).toBeInstanceOf(MockAdapter);
    });

    it('Adapter auto-detection defaults to mock for unknown data', () => {
      const adapter = detectAdapter({ unknown: true });
      expect(adapter).toBeInstanceOf(MockAdapter);
    });

    it('listAdapters returns registered adapters', () => {
      const adapters = listAdapters();
      expect(adapters).toContain('mock');
    });

    it('Custom adapter can be registered', () => {
      class TestAdapter extends BaseAdapter {
        normalize() { return []; }
        getSourceInfo() { return { name: 'Test', type: 'test', version: '1.0.0' }; }
      }
      registerAdapter('test-custom', TestAdapter);
      const adapter = getAdapter('test-custom');
      expect(adapter).toBeInstanceOf(TestAdapter);
    });

    it('Getting unregistered adapter throws error', () => {
      expect(() => getAdapter('nonexistent')).toThrow('not found');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. NORMALIZED EVENT MODEL
  // ═══════════════════════════════════════════════════════
  describe('Normalized Event Model', () => {
    it('Mock adapter produces normalized events with required fields', () => {
      const adapter = getAdapter('mock');
      const evidence = getEvidenceForCase('CASE-0243');
      const events = adapter.normalize({ evidence, scenario: 'suspicious-data-access' });

      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('caseId');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('source');
        expect(event).toHaveProperty('eventType');
        expect(event).toHaveProperty('actor');
        expect(event).toHaveProperty('target');
        expect(event).toHaveProperty('action');
        expect(event).toHaveProperty('severity');
        expect(event).toHaveProperty('metadata');
      }
    });

    it('Normalized events have consistent caseId', () => {
      const adapter = getAdapter('mock');
      const evidence = getEvidenceForCase('CASE-0243');
      const events = adapter.normalize({ evidence, scenario: 'suspicious-data-access' });

      for (const event of events) {
        expect(event.caseId).toBe('CASE-0243');
      }
    });

    it('Normalized events are sorted chronologically', () => {
      const adapter = getAdapter('mock');
      const evidence = getEvidenceForCase('CASE-0243');
      const events = adapter.normalize({ evidence, scenario: 'suspicious-data-access' });

      for (let i = 1; i < events.length; i++) {
        const prev = new Date(events[i - 1].timestamp).getTime();
        const curr = new Date(events[i].timestamp).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('Normalized events link to evidence IDs', () => {
      const adapter = getAdapter('mock');
      const evidence = getEvidenceForCase('CASE-0243');
      const events = adapter.normalize({ evidence, scenario: 'suspicious-data-access' });

      const eventsWithEvidence = events.filter(e => e.evidenceId);
      expect(eventsWithEvidence.length).toBeGreaterThan(0);
      for (const event of eventsWithEvidence) {
        expect(event.evidenceId).toMatch(/^E-\d{3}$/);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. INVESTIGATION SERVICE
  // ═══════════════════════════════════════════════════════
  describe('Investigation Service', () => {
    it('TEST: Investigation starts and returns result', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result).toBeDefined();
      expect(result.investigationId).toMatch(/^INV-/);
      expect(result.caseId).toBe('CASE-0243');
      expect(result.status).toBe('completed');
    });

    it('TEST: Evidence is retrieved correctly', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result.evidenceReviewed).toBeGreaterThan(0);
      const evidence = getEvidenceForCase('CASE-0243');
      expect(evidence.length).toBeGreaterThanOrEqual(result.evidenceReviewed);
    });

    it('TEST: Events are normalized', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result.eventsCorrelated).toBeGreaterThan(0);
      expect(result.events).toBeDefined();
      expect(result.events.length).toBe(result.eventsCorrelated);
    });

    it('TEST: Events are correlated', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result.events.length).toBeGreaterThanOrEqual(3);
      const eventTypes = [...new Set(result.events.map(e => e.eventType))];
      expect(eventTypes.length).toBeGreaterThanOrEqual(2);
    });

    it('TEST: Timeline is generated', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result.timeline).toBeDefined();
      expect(result.timeline.length).toBeGreaterThan(0);

      for (let i = 1; i < result.timeline.length; i++) {
        const prev = new Date(result.timeline[i - 1].timestamp).getTime();
        const curr = new Date(result.timeline[i].timestamp).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }

      for (const entry of result.timeline) {
        expect(entry).toHaveProperty('time');
        expect(entry).toHaveProperty('title');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('eventType');
        expect(entry).toHaveProperty('severity');
      }
    });

    it('TEST: Finding is created', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findingsCount).toBe(result.findings.length);
    });

    it('TEST: Finding links to supporting evidence', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      for (const finding of result.findings) {
        expect(finding.supportingEvidence).toBeDefined();
        expect(finding.supportingEvidence.length).toBeGreaterThan(0);

        for (const evId of finding.supportingEvidence) {
          expect(evId).toMatch(/^E-\d{3}$/);
        }

        const caseEvidence = getEvidenceForCase('CASE-0243');
        const caseEvidenceIds = caseEvidence.map(e => e.evidence_id);
        for (const evId of finding.supportingEvidence) {
          expect(caseEvidenceIds).toContain(evId);
        }
      }
    });

    it('TEST: Finding creates provenance event', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const provenanceEvents = getEventsForCase('CASE-0243');
      const investigationEvents = provenanceEvents.filter(e =>
        e.event_type === 'INVESTIGATION_STARTED' ||
        e.event_type === 'EVENT_CORRELATED' ||
        e.event_type === 'TIMELINE_CREATED' ||
        e.event_type === 'FINDING_CREATED'
      );

      expect(investigationEvents.length).toBeGreaterThan(0);

      const started = investigationEvents.find(e => e.event_type === 'INVESTIGATION_STARTED');
      const finding = investigationEvents.find(e => e.event_type === 'FINDING_CREATED');
      expect(started).toBeDefined();
      expect(finding).toBeDefined();
    });

    it('TEST: Same input produces deterministic investigation result', () => {
      const result1 = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const result2 = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result1.evidenceReviewed).toBe(result2.evidenceReviewed);
      expect(result1.eventsCorrelated).toBe(result2.eventsCorrelated);
      expect(result1.findingsCount).toBe(result2.findingsCount);

      const types1 = result1.events.map(e => e.eventType);
      const types2 = result2.events.map(e => e.eventType);
      expect(types1).toEqual(types2);

      const titles1 = result1.findings.map(f => f.title);
      const titles2 = result2.findings.map(f => f.title);
      expect(titles1).toEqual(titles2);
    });

    it('TEST: Investigation does not depend on mock adapter internals', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      expect(result).toHaveProperty('investigationId');
      expect(result).toHaveProperty('caseId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('evidenceReviewed');
      expect(result).toHaveProperty('eventsCorrelated');
      expect(result).toHaveProperty('findingsCount');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('adapterUsed');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. FINDING MODEL
  // ═══════════════════════════════════════════════════════
  describe('Finding Model', () => {
    it('Finding has required fields', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      for (const finding of result.findings) {
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('title');
        expect(finding).toHaveProperty('description');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('confidence');
        expect(finding).toHaveProperty('affectedAsset');
        expect(finding).toHaveProperty('status');
        expect(finding).toHaveProperty('supportingEvidence');
        expect(finding).toHaveProperty('supportingEvents');
        expect(finding).toHaveProperty('recommendedNextStep');
      }
    });

    it('Finding cannot exist without supporting evidence', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      for (const finding of result.findings) {
        expect(finding.supportingEvidence.length).toBeGreaterThan(0);
        expect(finding.supportingEvents.length).toBeGreaterThan(0);
      }
    });

    it('Finding severity is a valid level', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
      for (const finding of result.findings) {
        expect(validSeverities).toContain(finding.severity);
      }
    });

    it('Finding links to evidence that exists in the database', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const caseEvidence = getEvidenceForCase('CASE-0243');
      const evidenceIds = new Set(caseEvidence.map(e => e.evidence_id));

      for (const finding of result.findings) {
        for (const evId of finding.supportingEvidence) {
          expect(evidenceIds.has(evId)).toBe(true);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. DATABASE PERSISTENCE
  // ═══════════════════════════════════════════════════════
  describe('Database Persistence', () => {
    it('Investigation record is persisted', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const investigation = getInvestigation(result.investigationId);
      expect(investigation).not.toBeNull();
      expect(investigation.status).toBe('completed');
      expect(investigation.caseId).toBe('CASE-0243');
    });

    it('Investigation events are persisted', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const events = getInvestigationEvents('CASE-0243', result.investigationId);
      expect(events.length).toBe(result.eventsCorrelated);
    });

    it('Findings are persisted', () => {
      const result = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const findings = getFindingsForInvestigation(result.investigationId);
      expect(findings.length).toBe(result.findingsCount);
    });

    it('getLatestInvestigation returns most recent for case', () => {
      runInvestigation('CASE-0243', { adapterName: 'mock', scenario: 'suspicious-data-access' });
      const result2 = runInvestigation('CASE-0243', { adapterName: 'mock', scenario: 'suspicious-data-access' });

      const latest = getLatestInvestigation('CASE-0243');
      expect(latest.investigationId).toBe(result2.investigationId);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. PROVENANCE INTEGRATION
  // ═══════════════════════════════════════════════════════
  describe('Provenance Integration', () => {
    it('Investigation actions enter provenance chain', () => {
      const eventsBefore = getEventsForCase('CASE-0243');

      runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const eventsAfter = getEventsForCase('CASE-0243');
      expect(eventsAfter.length).toBeGreaterThan(eventsBefore.length);

      const newEvents = eventsAfter.slice(eventsBefore.length);
      const eventTypes = newEvents.map(e => e.event_type);
      expect(eventTypes).toContain('INVESTIGATION_STARTED');
      expect(eventTypes).toContain('EVENT_CORRELATED');
      expect(eventTypes).toContain('TIMELINE_CREATED');
      expect(eventTypes).toContain('FINDING_CREATED');
    });

    it('Provenance chain remains valid after investigation', () => {
      runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const events = getEventsForCase('CASE-0243');
      for (let i = 1; i < events.length; i++) {
        expect(events[i].previous_record_hash).toBe(events[i - 1].record_hash);
      }
    });
  });
});
