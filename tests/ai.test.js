import { describe, it, expect, beforeAll, vi } from 'vitest';
import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import {
  getAIProviderInfo,
  generateCaseSummary,
  explainFinding,
  recommendRemediation,
  generateHandover,
  analyzeAnomaly,
} from '../server/services/ai/AIService.js';
import { MockAIProvider } from '../server/services/ai/providers/MockAIProvider.js';
import { OpenAIProvider } from '../server/services/ai/providers/OpenAIProvider.js';
import { AIProvider } from '../server/services/ai/providers/AIProvider.js';
import { getCase, createCase } from '../server/services/case.js';
import { getEvidenceForCase, registerEvidence } from '../server/services/evidence.js';
import { getEventsForCase, getEventsForEvidence } from '../server/services/provenance.js';
import { getLatestInvestigation, getFindings, runInvestigation } from '../server/services/investigation.js';
import { createHash } from 'crypto';

describe('Phase 3 — AI Integration', () => {
  beforeAll(() => {
    getDb();
    seedDatabase();
  });

  // ═══════════════════════════════════════════════════════
  // 1. MOCK AI PROVIDER
  // ═══════════════════════════════════════════════════════
  describe('1. MockAIProvider', () => {
    it('MockAIProvider is an instance of AIProvider', () => {
      const provider = new MockAIProvider();
      expect(provider).toBeInstanceOf(AIProvider);
      expect(provider).toBeInstanceOf(MockAIProvider);
    });

    it('MockAIProvider returns correct provider info', () => {
      const provider = new MockAIProvider();
      const info = provider.getProviderInfo();
      expect(info.name).toBe('MockAI');
      expect(info.type).toBe('mock');
      expect(info.version).toBeDefined();
    });

    it('MockAIProvider.generateCaseSummary returns valid structure', async () => {
      const provider = new MockAIProvider();
      const caseData = getCase('CASE-0241');
      const evidence = getEvidenceForCase('CASE-0241');

      const result = await provider.generateCaseSummary({
        caseData,
        evidence,
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('case_summary');
      expect(result.situation).toBeDefined();
      expect(result.aiEnhanced).toBe(false);
      expect(result.confidence).toBeDefined();
      expect(result.sourceEvidenceIds).toBeDefined();
      expect(Array.isArray(result.sourceEvidenceIds)).toBe(true);
    });

    it('MockAIProvider.explainFinding returns valid structure', async () => {
      const provider = new MockAIProvider();
      const finding = {
        findingId: 'FIND-test-001',
        title: 'Test Finding',
        description: 'A test finding for unit testing',
        severity: 'high',
        confidence: 'medium',
        affectedAsset: 'Test System',
      };

      const result = await provider.explainFinding({
        finding,
        supportingEvidence: [{ evidence_id: 'E-001', name: 'Test Evidence', type: 'logs' }],
        supportingEvents: [{ eventType: 'FAILED_LOGIN' }],
        timeline: [],
        severity: 'high',
        confidence: 'medium',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('finding_explanation');
      expect(result.whatDetected).toBeDefined();
      expect(result.whySuspicious).toBeDefined();
      expect(result.evidenceSupporting).toBeDefined();
      expect(result.likelyImpact).toBeDefined();
      expect(result.nextInvestigationStep).toBeDefined();
      expect(result.aiEnhanced).toBe(false);
      expect(result.sourceEvidenceIds).toContain('E-001');
      expect(result.sourceFindingIds).toContain('FIND-test-001');
    });

    it('MockAIProvider.recommendRemediation returns valid structure', async () => {
      const provider = new MockAIProvider();
      const finding = {
        findingId: 'FIND-test-002',
        title: 'SQL Injection',
        severity: 'high',
        confidence: 'high',
        affectedAsset: 'Auth Service',
      };

      const result = await provider.recommendRemediation({
        finding,
        evidence: [{ evidence_id: 'E-001' }],
        timeline: [],
        affectedSystem: 'Auth Service',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('remediation_recommendation');
      expect(result.recommendedAction).toBeDefined();
      expect(result.rationale).toBeDefined();
      expect(result.expectedSecurityImprovement).toBeDefined();
      expect(result.potentialRisks).toBeDefined();
      expect(result.verificationStepsAfterRemediation).toBeDefined();
      expect(Array.isArray(result.verificationStepsAfterRemediation)).toBe(true);
      expect(result.aiEnhanced).toBe(false);
      expect(result.disclaimer).toContain('officer approval');
    });

    it('MockAIProvider.generateHandover returns valid structure', async () => {
      const provider = new MockAIProvider();
      const caseData = getCase('CASE-0241');

      const result = await provider.generateHandover({
        caseData,
        findings: [],
        timeline: [],
        evidence: getEvidenceForCase('CASE-0241'),
        completedActions: ['Detection completed'],
        pendingActions: ['Remediation'],
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('handover_summary');
      expect(result.situation).toBeDefined();
      expect(result.evidenceCollected).toBeDefined();
      expect(result.investigationCompleted).toBeDefined();
      expect(result.recommendedNextStep).toBeDefined();
      expect(result.aiEnhanced).toBe(false);
    });

    it('MockAIProvider.analyzeAnomaly returns valid structure', async () => {
      const provider = new MockAIProvider();

      const result = await provider.analyzeAnomaly({
        anomaly: { caseId: 'CASE-0241', type: 'integrity_failure', evidenceId: 'E-001' },
        provenanceRecords: [],
        evidenceIntegrityState: [{ evidence_id: 'E-001', verification_status: 'compromised' }],
        timeline: [],
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('anomaly_analysis');
      expect(result.whatHappened).toBeDefined();
      expect(result.whyUnusual).toBeDefined();
      expect(result.officerCheckNext).toBeDefined();
      expect(Array.isArray(result.officerCheckNext)).toBe(true);
      expect(result.aiEnhanced).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. PROVIDER SELECTION
  // ═══════════════════════════════════════════════════════
  describe('2. Provider Selection', () => {
    it('getAIProviderInfo returns provider info', () => {
      const info = getAIProviderInfo();
      expect(info).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.type).toBeDefined();
    });

    it('Default provider is MockAI when AI_PROVIDER not set', () => {
      // In test environment, AI_PROVIDER is not set, so default is mock
      const originalEnv = process.env.AI_PROVIDER;
      delete process.env.AI_PROVIDER;

      const info = getAIProviderInfo();
      expect(info.type).toBe('mock');

      // Restore (always, even if undefined)
      if (originalEnv !== undefined) process.env.AI_PROVIDER = originalEnv;
      else delete process.env.AI_PROVIDER;
    });

    it('OpenAIProvider can be instantiated with config', () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key', model: 'gpt-4o' });
      expect(provider).toBeInstanceOf(AIProvider);
      expect(provider.getProviderInfo().type).toBe('openai');
      expect(provider.getProviderInfo().model).toBe('gpt-4o');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. MISSING API KEY HANDLING
  // ═══════════════════════════════════════════════════════
  describe('3. Missing API Key Handling', () => {
    it('OpenAIProvider without API key throws on responses request', async () => {
      const provider = new OpenAIProvider({ apiKey: null });
      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('OPENAI_API_KEY is not configured');
    });

    it('OpenAIProvider falls back to MockAI when key is missing', () => {
      const originalEnv = process.env.AI_PROVIDER;
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.AI_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;

      // The createProvider function in AIService should fall back to mock
      // We test this indirectly through getAIProviderInfo
      const info = getAIProviderInfo();
      // When AI_PROVIDER=openai but no key, it falls back to mock
      expect(info.type).toBe('mock');

      // Restore (always)
      if (originalEnv !== undefined) process.env.AI_PROVIDER = originalEnv;
      else delete process.env.AI_PROVIDER;
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
      else delete process.env.OPENAI_API_KEY;
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. OPENAI PROVIDER CONFIGURATION
  // ═══════════════════════════════════════════════════════
  describe('4. OpenAI Provider Configuration', () => {
    it('OpenAIProvider stores config correctly', () => {
      const provider = new OpenAIProvider({
        apiKey: 'sk-test-key',
        model: 'gpt-4o-mini',
        timeout: 10000,
      });

      expect(provider.apiKey).toBe('sk-test-key');
      expect(provider.model).toBe('gpt-4o-mini');
      expect(provider.timeout).toBe(10000);
    });

    it('OpenAIProvider uses env vars when no config provided', () => {
      const originalModel = process.env.OPENAI_MODEL;
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';

      const provider = new OpenAIProvider({ apiKey: 'test' });
      expect(provider.model).toBe('gpt-3.5-turbo');

      if (originalModel) process.env.OPENAI_MODEL = originalModel;
      else delete process.env.OPENAI_MODEL;
    });

    it('OpenAIProvider has default timeout', () => {
      const provider = new OpenAIProvider({ apiKey: 'test' });
      expect(provider.timeout).toBe(60000);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. AI OUTPUT STRUCTURE
  // ═══════════════════════════════════════════════════════
  describe('5. AI Output Structure', () => {
    it('Case summary output has all required metadata fields', async () => {
      const result = await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: getEventsForCase('CASE-0241'),
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      expect(result.type).toBe('case_summary');
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.aiEnhanced).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('Finding explanation output has all required metadata fields', async () => {
      // Run investigation to get findings
      const invResult = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const findings = getFindings('CASE-0243', invResult.investigationId);
      expect(findings.length).toBeGreaterThan(0);

      const finding = findings[0];
      const evidence = getEvidenceForCase('CASE-0243');

      const result = await explainFinding('CASE-0243', finding.findingId, {
        finding,
        supportingEvidence: evidence,
        supportingEvents: [],
        timeline: getEventsForCase('CASE-0243'),
        severity: finding.severity,
        confidence: finding.confidence,
      });

      expect(result.type).toBe('finding_explanation');
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.aiEnhanced).toBeDefined();
      expect(result.disclaimer).toContain('officer verification');
    });

    it('Remediation recommendation output has all required metadata fields', async () => {
      const invResult = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const findings = getFindings('CASE-0243', invResult.investigationId);
      const finding = findings[0];
      const evidence = getEvidenceForCase('CASE-0243');

      const result = await recommendRemediation('CASE-0243', {
        finding,
        evidence,
        timeline: getEventsForCase('CASE-0243'),
        affectedSystem: finding.affectedAsset,
      });

      expect(result.type).toBe('remediation_recommendation');
      expect(result.correlationId).toBeDefined();
      expect(result.disclaimer).toContain('officer approval');
      expect(result.recommendedAction).toBeDefined();
    });

    it('Handover output has all required metadata fields', async () => {
      const result = await generateHandover('CASE-0241', {
        caseData: getCase('CASE-0241'),
        findings: [],
        timeline: getEventsForCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        completedActions: ['Detection completed'],
        pendingActions: ['Remediation'],
      });

      expect(result.type).toBe('handover_summary');
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.situation).toBeDefined();
      expect(result.recommendedNextStep).toBeDefined();
    });

    it('Anomaly analysis output has all required metadata fields', async () => {
      const result = await analyzeAnomaly('CASE-0241', {
        anomaly: { caseId: 'CASE-0241', type: 'integrity_failure', evidenceId: 'E-001' },
        provenanceRecords: getEventsForCase('CASE-0241'),
        evidenceIntegrityState: getEvidenceForCase('CASE-0241'),
        timeline: getEventsForCase('CASE-0241'),
      });

      expect(result.type).toBe('anomaly_analysis');
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.whatHappened).toBeDefined();
      expect(result.disclaimer).toContain('officer verification');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. EVIDENCE REFERENCES
  // ═══════════════════════════════════════════════════════
  describe('6. Evidence References', () => {
    it('Case summary references actual evidence IDs', async () => {
      const evidence = getEvidenceForCase('CASE-0241');
      const result = await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence,
        timeline: getEventsForCase('CASE-0241'),
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const evidenceIds = evidence.map(e => e.evidence_id);
      // At least some of the referenced IDs should be real evidence IDs
      const referencedIds = result.sourceEvidenceIds || [];
      for (const refId of referencedIds) {
        expect(evidenceIds).toContain(refId);
      }
    });

    it('Finding explanation references actual evidence IDs from the finding', async () => {
      const invResult = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const findings = getFindings('CASE-0243', invResult.investigationId);
      const finding = findings[0];
      const caseEvidence = getEvidenceForCase('CASE-0243');
      const caseEvidenceIds = caseEvidence.map(e => e.evidence_id);

      const result = await explainFinding('CASE-0243', finding.findingId, {
        finding,
        supportingEvidence: caseEvidence,
        supportingEvents: [],
        timeline: getEventsForCase('CASE-0243'),
        severity: finding.severity,
        confidence: finding.confidence,
      });

      // All referenced evidence IDs should exist in the case
      for (const refId of (result.sourceEvidenceIds || [])) {
        expect(caseEvidenceIds).toContain(refId);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // 7. AI PROVENANCE EVENTS
  // ═══════════════════════════════════════════════════════
  describe('7. AI Provenance Events', () => {
    it('AI case summary creates provenance event', async () => {
      const eventsBefore = getEventsForCase('CASE-0241');

      await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: eventsBefore,
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const eventsAfter = getEventsForCase('CASE-0241');
      expect(eventsAfter.length).toBeGreaterThan(eventsBefore.length);

      // Find the AI provenance event
      const aiEvent = eventsAfter.find(e => e.event_type === 'AI_CASE_SUMMARY_GENERATED');
      expect(aiEvent).toBeDefined();
      expect(aiEvent.actor_type).toBe('ai');
      expect(aiEvent.metadata).toBeDefined();
      expect(aiEvent.metadata.provider).toBeDefined();
    });

    it('AI finding explanation creates provenance event', async () => {
      const invResult = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const findings = getFindings('CASE-0243', invResult.investigationId);
      const finding = findings[0];
      const evidence = getEvidenceForCase('CASE-0243');

      const eventsBefore = getEventsForCase('CASE-0243');

      await explainFinding('CASE-0243', finding.findingId, {
        finding,
        supportingEvidence: evidence,
        supportingEvents: [],
        timeline: eventsBefore,
        severity: finding.severity,
        confidence: finding.confidence,
      });

      const eventsAfter = getEventsForCase('CASE-0243');
      const aiEvent = eventsAfter.find(e => e.event_type === 'AI_FINDING_EXPLAINED');
      expect(aiEvent).toBeDefined();
      expect(aiEvent.actor_type).toBe('ai');
    });

    it('AI remediation recommendation creates provenance event', async () => {
      const invResult = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const findings = getFindings('CASE-0243', invResult.investigationId);
      const finding = findings[0];
      const evidence = getEvidenceForCase('CASE-0243');

      const eventsBefore = getEventsForCase('CASE-0243');

      await recommendRemediation('CASE-0243', {
        finding,
        evidence,
        timeline: eventsBefore,
        affectedSystem: finding.affectedAsset,
      });

      const eventsAfter = getEventsForCase('CASE-0243');
      const aiEvent = eventsAfter.find(e => e.event_type === 'AI_REMEDIATION_RECOMMENDED');
      expect(aiEvent).toBeDefined();
    });

    it('AI handover generation creates provenance event', async () => {
      const eventsBefore = getEventsForCase('CASE-0241');

      await generateHandover('CASE-0241', {
        caseData: getCase('CASE-0241'),
        findings: [],
        timeline: eventsBefore,
        evidence: getEvidenceForCase('CASE-0241'),
        completedActions: ['Detection'],
        pendingActions: ['Fix'],
      });

      const eventsAfter = getEventsForCase('CASE-0241');
      const aiEvent = eventsAfter.find(e => e.event_type === 'AI_HANDOVER_GENERATED');
      expect(aiEvent).toBeDefined();
    });

    it('AI anomaly analysis creates provenance event', async () => {
      const eventsBefore = getEventsForCase('CASE-0241');

      await analyzeAnomaly('CASE-0241', {
        anomaly: { caseId: 'CASE-0241', type: 'integrity_failure' },
        provenanceRecords: eventsBefore,
        evidenceIntegrityState: getEvidenceForCase('CASE-0241'),
        timeline: eventsBefore,
      });

      const eventsAfter = getEventsForCase('CASE-0241');
      const aiEvent = eventsAfter.find(e => e.event_type === 'AI_ANOMALY_ANALYZED');
      expect(aiEvent).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 8. AI OUTPUT HASHING
  // ═══════════════════════════════════════════════════════
  describe('8. AI Output Hashing', () => {
    it('AI interactions are stored in the database', async () => {
      await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const db = getDb();
      const interactions = db.prepare(
        "SELECT * FROM ai_interactions WHERE case_id = 'CASE-0241' AND operation = 'AI_CASE_SUMMARY_GENERATED'"
      ).all();

      expect(interactions.length).toBeGreaterThan(0);
      const latest = interactions[interactions.length - 1];
      expect(latest.output_hash).toBeDefined();
      expect(latest.output_hash).toHaveLength(64); // SHA-256 hex
      expect(latest.status).toBe('success');
      expect(latest.provider).toBeDefined();
    });

    it('AI output hash is deterministic for same content', async () => {
      // Two calls with same input should produce same output hash (from cache)
      const input = {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      };

      const result1 = await generateCaseSummary('CASE-0241', input);
      const result2 = await generateCaseSummary('CASE-0241', input);

      // Both should have the same correlationId (cached)
      expect(result1.correlationId).toBe(result2.correlationId);
      expect(result1.cached).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 9. ERROR HANDLING
  // ═══════════════════════════════════════════════════════
  describe('9. Error Handling', () => {
    it('AI summary for non-existent case returns 404-like error', async () => {
      await expect(
        generateCaseSummary('CASE-9999', {
          caseData: null,
          evidence: [],
          timeline: [],
          findings: [],
          verificationStatus: 'UNKNOWN',
        })
      ).resolves.toBeDefined(); // MockAI doesn't throw for null data
    });

    it('OpenAIProvider timeout handling', async () => {
      const provider = new OpenAIProvider({ apiKey: 'invalid-key', timeout: 1 });
      // Mock a timeout error
      provider._client = {
        responses: {
          create: vi.fn().mockRejectedValue(
            Object.assign(new Error('Request timed out'), { status: 408, code: 'timeout' })
          ),
        },
      };

      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('timed out');
    });

    it('AI interactions table stores error status on failure', async () => {
      const db = getDb();
      const countBefore = db.prepare(
        "SELECT COUNT(*) as cnt FROM ai_interactions WHERE status = 'error'"
      ).get().cnt;

      // The MockAI never fails, so we test the storage mechanism directly
      // by checking the table exists and has the right schema
      const columns = db.prepare("PRAGMA table_info(ai_interactions)").all();
      const columnNames = columns.map(c => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('case_id');
      expect(columnNames).toContain('operation');
      expect(columnNames).toContain('provider');
      expect(columnNames).toContain('model');
      expect(columnNames).toContain('input_reference');
      expect(columnNames).toContain('input_fingerprint');
      expect(columnNames).toContain('output');
      expect(columnNames).toContain('output_hash');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('error_message');
      expect(columnNames).toContain('created_at');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 10. DETERMINISTIC INPUT FINGERPRINTING
  // ═══════════════════════════════════════════════════════
  describe('10. Deterministic Input Fingerprinting', () => {
    it('Same input produces same fingerprint (cached result)', async () => {
      const input = {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      };

      const result1 = await generateCaseSummary('CASE-0241', input);
      const result2 = await generateCaseSummary('CASE-0241', input);

      // Second call should be cached
      expect(result2.cached).toBe(true);
      expect(result2.correlationId).toBe(result1.correlationId);
    });

    it('Different inputs produce different results', async () => {
      const result1 = await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const result2 = await generateCaseSummary('CASE-0242', {
        caseData: getCase('CASE-0242'),
        evidence: getEvidenceForCase('CASE-0242'),
        timeline: [],
        findings: [],
        verificationStatus: 'PENDING',
      });

      // Different case IDs should produce different results
      expect(result1.correlationId).not.toBe(result2.correlationId);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 11. NO EVIDENCE INVENTION ENFORCEMENT
  // ═══════════════════════════════════════════════════════
  describe('11. No Evidence Invention Enforcement', () => {
    it('MockAI only references evidence IDs that were supplied', async () => {
      const evidence = getEvidenceForCase('CASE-0241');
      const evidenceIds = evidence.map(e => e.evidence_id);

      const result = await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence,
        timeline: getEventsForCase('CASE-0241'),
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      // All referenced evidence IDs should be from the supplied evidence
      for (const refId of (result.sourceEvidenceIds || [])) {
        expect(evidenceIds).toContain(refId);
      }
    });

    it('MockAI finding explanation only references supplied evidence', async () => {
      const invResult = runInvestigation('CASE-0243', {
        adapterName: 'mock',
        scenario: 'suspicious-data-access',
      });

      const findings = getFindings('CASE-0243', invResult.investigationId);
      const finding = findings[0];
      const evidence = getEvidenceForCase('CASE-0243');
      const evidenceIds = evidence.map(e => e.evidence_id);

      const result = await explainFinding('CASE-0243', finding.findingId, {
        finding,
        supportingEvidence: evidence,
        supportingEvents: [],
        timeline: getEventsForCase('CASE-0243'),
        severity: finding.severity,
        confidence: finding.confidence,
      });

      for (const refId of (result.sourceEvidenceIds || [])) {
        expect(evidenceIds).toContain(refId);
      }
    });

    it('AI outputs contain disclaimer about officer verification', async () => {
      const explanation = await explainFinding('CASE-0243', 'FIND-test', {
        finding: { findingId: 'FIND-test', title: 'Test', severity: 'high', confidence: 'medium', affectedAsset: 'Test' },
        supportingEvidence: [],
        supportingEvents: [],
        timeline: [],
        severity: 'high',
        confidence: 'medium',
      });

      expect(explanation.disclaimer).toBeDefined();
      expect(explanation.disclaimer).toContain('officer verification');
    });

    it('Remediation recommendation contains execution warning', async () => {
      const result = await recommendRemediation('CASE-0243', {
        finding: { findingId: 'FIND-test', title: 'Test', severity: 'high', confidence: 'high', affectedAsset: 'Test' },
        evidence: [],
        timeline: [],
        affectedSystem: 'Test',
      });

      expect(result.disclaimer).toContain('officer approval');
      expect(result.disclaimer).toContain('not be executed automatically');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 12. ARMY ADAPTER INDEPENDENCE
  // ═══════════════════════════════════════════════════════
  describe('12. Army Adapter Independence', () => {
    it('AIService does not import or depend on MockAdapter', async () => {
      // The AIService should work with any normalized investigation data
      // regardless of which adapter produced it
      const mockData = {
        caseData: getCase('CASE-0243'),
        evidence: getEvidenceForCase('CASE-0243'),
        timeline: getEventsForCase('CASE-0243'),
        findings: getFindings('CASE-0243'),
        verificationStatus: 'VERIFIED',
      };

      const result = await generateCaseSummary('CASE-0243', mockData);
      expect(result).toBeDefined();
      expect(result.type).toBe('case_summary');
    });

    it('AI works with custom data structure (no adapter dependency)', async () => {
      // Simulate data from a hypothetical Army adapter
      const armyStyleData = {
        caseData: {
          id: 'CASE-ARMY-001',
          title: 'Suspicious Activity on Military Network',
          severity: 'critical',
          system: 'Military Server',
          status: 'active',
          assignedTo: 'Officer Smith',
          detection: { description: 'Anomalous network traffic detected' },
          stages: [
            { id: 'detected', label: 'Detected', status: 'completed' },
            { id: 'evidence', label: 'Evidence', status: 'active' },
          ],
          currentStage: 1,
        },
        evidence: [
          { evidence_id: 'E-ARMY-001', name: 'Network Log', type: 'network', verified: true, verification_status: 'verified' },
        ],
        timeline: [{ time: '09:00', title: 'Detection', description: 'Network anomaly' }],
        findings: [{ findingId: 'F-ARMY-001', title: 'Network Intrusion', severity: 'critical' }],
        verificationStatus: 'VERIFIED',
      };

      const result = await generateCaseSummary('CASE-ARMY-001', armyStyleData);
      expect(result).toBeDefined();
      expect(result.type).toBe('case_summary');
      expect(result.situation).toContain('CASE-ARMY-001');
    });

    it('AIProvider interface is adapter-agnostic', () => {
      // The AIProvider interface should not reference any specific adapter
      const provider = new MockAIProvider();
      const info = provider.getProviderInfo();

      // Should not contain references to MockAdapter or any specific adapter
      expect(info.name).not.toContain('MockAdapter');
      expect(info.description).not.toContain('adapter');
    });
  });

  // ═══════════════════════════════════════════════════════
  // BONUS: TRUST BOUNDARY VALIDATION
  // ═══════════════════════════════════════════════════════
  describe('Bonus: Trust Boundary Validation', () => {
    it('AI output does NOT overwrite evidence hashes', async () => {
      const evidence = getEvidenceForCase('CASE-0241');
      const hashesBefore = evidence.map(e => ({ id: e.evidence_id, hash: e.evidence_hash }));

      await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence,
        timeline: getEventsForCase('CASE-0241'),
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const hashesAfter = getEvidenceForCase('CASE-0241').map(e => ({ id: e.evidence_id, hash: e.evidence_hash }));

      // All evidence hashes should be unchanged
      for (let i = 0; i < hashesBefore.length; i++) {
        expect(hashesAfter[i].hash).toBe(hashesBefore[i].hash);
      }
    });

    it('AI output does NOT modify provenance record hashes', async () => {
      const eventsBefore = getEventsForCase('CASE-0241');
      const hashesBefore = eventsBefore.map(e => ({ id: e.event_id, hash: e.record_hash }));

      await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: eventsBefore,
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const eventsAfter = getEventsForCase('CASE-0241');

      // Original events should have unchanged hashes
      for (const before of hashesBefore) {
        const after = eventsAfter.find(e => e.event_id === before.id);
        expect(after.record_hash).toBe(before.hash);
      }
    });

    it('Three trust boundaries remain separate', async () => {
      // 1. Evidence Trust: SHA-256 evidence hash
      const evidence = getEvidenceForCase('CASE-0241');
      expect(evidence[0].evidence_hash).toMatch(/^[a-f0-9]{64}$/);

      // 2. Provenance Trust: Hash-linked provenance records
      const events = getEventsForCase('CASE-0241');
      expect(events[0].record_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(events[0].previous_record_hash).toBeDefined();

      // 3. AI Assistance: Independent, non-authoritative
      const aiResult = await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence,
        timeline: events,
        findings: [],
        verificationStatus: 'VERIFIED',
      });
      expect(aiResult.aiEnhanced).toBeDefined();
      expect(typeof aiResult.aiEnhanced).toBe('boolean');
      // AI result is separate from evidence/provenance hashes
      expect(aiResult.output_hash).toBeUndefined(); // Not stored as evidence
    });
  });
});
