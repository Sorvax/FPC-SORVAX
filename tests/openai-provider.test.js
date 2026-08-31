/**
 * OpenAI Provider Tests — Phase 4A
 *
 * All tests mock the OpenAI SDK to avoid real API calls.
 * One optional manual integration test is documented but skipped by default.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import {
  getAIProviderInfo,
  getAIProviderStatus,
  generateCaseSummary,
  explainFinding,
  recommendRemediation,
  generateHandover,
  analyzeAnomaly,
} from '../server/services/ai/AIService.js';
import { OpenAIProvider } from '../server/services/ai/providers/OpenAIProvider.js';
import { MockAIProvider } from '../server/services/ai/providers/MockAIProvider.js';
import { AIProvider } from '../server/services/ai/providers/AIProvider.js';
import { getCase } from '../server/services/case.js';
import { getEvidenceForCase } from '../server/services/evidence.js';
import { getEventsForCase } from '../server/services/provenance.js';
import { runInvestigation, getFindings } from '../server/services/investigation.js';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════
// MOCK HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Create a mock OpenAI SDK client that returns controlled responses.
 */
function createMockOpenAIClient(responseContent) {
  return {
    responses: {
      create: vi.fn().mockResolvedValue({
        id: `resp-${Date.now()}`,
        model: 'gpt-4.1-nano',
        output_text: typeof responseContent === 'string'
          ? responseContent
          : JSON.stringify(responseContent),
        usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 },
      }),
    },
  };
}

/**
 * Create a mock client that throws an error.
 */
function createMockOpenAIClientError(statusCode, message, code) {
  return {
    responses: {
      create: vi.fn().mockRejectedValue(
        Object.assign(new Error(message), { status: statusCode, code })
      ),
    },
  };
}

// ═══════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════

describe('Phase 4A — OpenAI Provider Integration', () => {
  beforeAll(() => {
    getDb();
    seedDatabase();
  });

  // ═══════════════════════════════════════════════════════
  // 1. OPENAI PROVIDER INITIALIZATION
  // ═══════════════════════════════════════════════════════
  describe('1. OpenAI Provider Initialization', () => {
    it('OpenAIProvider can be instantiated with config', () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test-123', model: 'gpt-4.1-nano' });
      expect(provider).toBeInstanceOf(AIProvider);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('OpenAIProvider stores config correctly', () => {
      const provider = new OpenAIProvider({
        apiKey: 'sk-test-key',
        model: 'gpt-4.1-nano',
        timeout: 15000,
      });
      expect(provider.apiKey).toBe('sk-test-key');
      expect(provider.model).toBe('gpt-4.1-nano');
      expect(provider.timeout).toBe(15000);
    });

    it('OpenAIProvider uses env vars when no config provided', () => {
      const originalModel = process.env.OPENAI_MODEL;
      process.env.OPENAI_MODEL = 'gpt-4.1-nano';

      const provider = new OpenAIProvider({ apiKey: 'test' });
      expect(provider.model).toBe('gpt-4.1-nano');

      if (originalModel !== undefined) process.env.OPENAI_MODEL = originalModel;
      else delete process.env.OPENAI_MODEL;
    });

    it('OpenAIProvider has default model and timeout', () => {
      const provider = new OpenAIProvider({ apiKey: 'test' });
      expect(provider.model).toBe('gpt-4.1-nano');
      expect(provider.timeout).toBe(60000);
    });

    it('OpenAIProvider creates client when API key is provided', () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      expect(provider._client).toBeDefined();
    });

    it('OpenAIProvider does not create client when API key is missing', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAIProvider({ apiKey: null });
      expect(provider._client).toBeNull();
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. MISSING API KEY
  // ═══════════════════════════════════════════════════════
  describe('2. Missing API Key Handling', () => {
    it('OpenAIProvider without API key throws descriptive error', async () => {
      const provider = new OpenAIProvider({ apiKey: null });
      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('OPENAI_API_KEY is not configured');
    });

    it('AIService falls back to MockAI when key is missing', () => {
      const originalEnv = process.env.AI_PROVIDER;
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.AI_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;

      const info = getAIProviderInfo();
      expect(info.type).toBe('mock');

      if (originalEnv !== undefined) process.env.AI_PROVIDER = originalEnv;
      else delete process.env.AI_PROVIDER;
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
      else delete process.env.OPENAI_API_KEY;
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. PROVIDER SELECTION
  // ═══════════════════════════════════════════════════════
  describe('3. Provider Selection', () => {
    it('getAIProviderInfo returns provider info', () => {
      const info = getAIProviderInfo();
      expect(info).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.type).toBeDefined();
    });

    it('getAIProviderStatus returns status without secrets', () => {
      const status = getAIProviderStatus();
      expect(status).toBeDefined();
      expect(status.provider).toBeDefined();
      expect(status.available).toBeDefined();
      expect(status.apiKeyConfigured).toBeDefined();
      // Must NOT contain API key
      expect(status.apiKey).toBeUndefined();
      expect(status.secret).toBeUndefined();
    });

    it('Default provider is MockAI when AI_PROVIDER not set', () => {
      const originalEnv = process.env.AI_PROVIDER;
      delete process.env.AI_PROVIDER;

      const info = getAIProviderInfo();
      expect(info.type).toBe('mock');

      if (originalEnv !== undefined) process.env.AI_PROVIDER = originalEnv;
      else delete process.env.AI_PROVIDER;
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. MODEL CONFIGURATION
  // ═══════════════════════════════════════════════════════
  describe('4. Model Configuration', () => {
    it('OpenAIProvider uses configured model in requests', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-4.1-nano' });
      const mockClient = createMockOpenAIClient({ situation: 'Test summary' });
      provider._client = mockClient;

      await provider._responsesRequest('system', 'user');

      expect(mockClient.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4.1-nano' })
      );
    });

    it('Model is configurable via OPENAI_MODEL env var', () => {
      const originalModel = process.env.OPENAI_MODEL;
      process.env.OPENAI_MODEL = 'gpt-4.1-mini';

      const provider = new OpenAIProvider({ apiKey: 'test' });
      expect(provider.model).toBe('gpt-4.1-mini');

      if (originalModel !== undefined) process.env.OPENAI_MODEL = originalModel;
      else delete process.env.OPENAI_MODEL;
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. SUCCESSFUL REAL-PROVIDER RESPONSE (mocked)
  // ═══════════════════════════════════════════════════════
  describe('5. Successful Real-Provider Response (mocked)', () => {
    it('OpenAIProvider.generateCaseSummary returns valid structure', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-4.1-nano' });
      provider._client = createMockOpenAIClient({
        situation: 'Test case summary',
        whatHappened: 'Something was detected',
        currentStatus: 'Active',
        recommendedNextStep: 'Review evidence',
        importantEvidence: [],
        confidence: 'high',
      });

      const result = await provider.generateCaseSummary({
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      expect(result.type).toBe('case_summary');
      expect(result.aiEnhanced).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4.1-nano');
      expect(result.situation).toBe('Test case summary');
    });

    it('OpenAIProvider.explainFinding returns valid structure', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = createMockOpenAIClient({
        whatDetected: 'SQL injection detected',
        whySuspicious: 'Pattern matches known attack',
        evidenceSupporting: 'Evidence E-001 shows the vulnerability',
        likelyImpact: 'Data exposure risk',
        nextInvestigationStep: 'Review source code',
        confidence: 'high',
      });

      const result = await provider.explainFinding({
        finding: { findingId: 'FIND-001', title: 'SQL Injection', severity: 'high', confidence: 'high', affectedAsset: 'Auth Service' },
        supportingEvidence: [{ evidence_id: 'E-001', name: 'Scan Result', type: 'scan' }],
        supportingEvents: [],
        timeline: [],
        severity: 'high',
        confidence: 'high',
      });

      expect(result.type).toBe('finding_explanation');
      expect(result.aiEnhanced).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.disclaimer).toContain('officer verification');
    });

    it('OpenAIProvider.recommendRemediation returns valid structure', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = createMockOpenAIClient({
        recommendedAction: 'Apply parameterized queries',
        rationale: 'Evidence shows SQL injection vulnerability',
        expectedSecurityImprovement: 'SQL injection no longer possible',
        potentialRisks: 'Minimal risk',
        verificationStepsAfterRemediation: ['Run security scan', 'Test login'],
        confidence: 'high',
      });

      const result = await provider.recommendRemediation({
        finding: { findingId: 'FIND-001', title: 'SQL Injection', severity: 'high', confidence: 'high', affectedAsset: 'Auth' },
        evidence: [{ evidence_id: 'E-001' }],
        timeline: [],
        affectedSystem: 'Auth',
      });

      expect(result.type).toBe('remediation_recommendation');
      expect(result.aiEnhanced).toBe(true);
      expect(result.disclaimer).toContain('officer approval');
      expect(result.recommendedAction).toBe('Apply parameterized queries');
    });

    it('OpenAIProvider.generateHandover returns valid structure', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = createMockOpenAIClient({
        situation: 'Security incident on auth service',
        evidenceCollected: '8 evidence items',
        investigationCompleted: 'SQL injection found',
        finding: 'SQL Injection vulnerability',
        actionsAlreadyTaken: 'Evidence collected',
        pendingActions: 'Apply fix',
        recommendedNextStep: 'Review remediation',
        confidence: 'medium',
      });

      const result = await provider.generateHandover({
        caseData: getCase('CASE-0241'),
        findings: [],
        timeline: [],
        evidence: getEvidenceForCase('CASE-0241'),
        completedActions: ['Evidence collected'],
        pendingActions: ['Apply fix'],
      });

      expect(result.type).toBe('handover_summary');
      expect(result.aiEnhanced).toBe(true);
      expect(result.situation).toBe('Security incident on auth service');
    });

    it('OpenAIProvider.analyzeAnomaly returns valid structure', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = createMockOpenAIClient({
        whatHappened: 'Evidence hash mismatch detected',
        whyUnusual: 'Evidence was modified after registration',
        evidenceSupporting: 'E-001 hash does not match',
        officerCheckNext: ['Review E-001', 'Verify chain'],
        confidence: 'high',
      });

      const result = await provider.analyzeAnomaly({
        anomaly: { caseId: 'CASE-0241', type: 'integrity_failure', evidenceId: 'E-001' },
        provenanceRecords: [],
        evidenceIntegrityState: [{ evidence_id: 'E-001', verification_status: 'compromised' }],
        timeline: [],
      });

      expect(result.type).toBe('anomaly_analysis');
      expect(result.aiEnhanced).toBe(true);
      expect(result.disclaimer).toContain('officer verification');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. API FAILURE HANDLING
  // ═══════════════════════════════════════════════════════
  describe('6. API Failure Handling', () => {
    it('Invalid API key throws descriptive error', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-invalid' });
      provider._client = createMockOpenAIClientError(401, 'Invalid API key', 'invalid_api_key');

      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('Invalid OpenAI API key');
    });

    it('Rate limit throws descriptive error', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = createMockOpenAIClientError(429, 'Rate limited', 'rate_limit_exceeded');

      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('rate limit');
    });

    it('Model not found throws descriptive error', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test', model: 'nonexistent-model' });
      provider._client = createMockOpenAIClientError(404, 'Model not found', 'model_not_found');

      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('not found');
    });

    it('Generic API error throws with context', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = createMockOpenAIClientError(500, 'Server error', null);

      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('OpenAI API error');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 7. TIMEOUT HANDLING
  // ═══════════════════════════════════════════════════════
  describe('7. Timeout Handling', () => {
    it('Timeout error is handled gracefully', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test', timeout: 1 });
      provider._client = createMockOpenAIClientError(408, 'Request timed out', 'timeout');

      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('timed out');
    });

    it('OpenAIProvider stores configured timeout', () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test', timeout: 5000 });
      expect(provider.timeout).toBe(5000);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 8. MALFORMED RESPONSE HANDLING
  // ═══════════════════════════════════════════════════════
  describe('8. Malformed Response Handling', () => {
    it('Empty response throws error', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = {
        responses: {
          create: vi.fn().mockResolvedValue({
            id: 'resp-test',
            model: 'gpt-4.1-nano',
            output_text: '',
            usage: {},
          }),
        },
      };

      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('Empty response');
    });

    it('Non-JSON response is handled gracefully by fallback', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      provider._client = createMockOpenAIClient('This is not JSON at all');

      const result = await provider.generateCaseSummary({
        caseData: getCase('CASE-0241'),
        evidence: [],
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      // Should fall back to raw text in the situation field
      expect(result.type).toBe('case_summary');
      expect(result.situation).toBe('This is not JSON at all');
      expect(result.aiEnhanced).toBe(true);
    });

    it('JSON wrapped in markdown code block is parsed correctly', async () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      const jsonContent = {
        situation: 'Test from code block',
        whatHappened: 'Detected',
        currentStatus: 'Active',
        recommendedNextStep: 'Review',
        confidence: 'high',
      };
      provider._client = createMockOpenAIClient(`\`\`\`json\n${JSON.stringify(jsonContent)}\n\`\`\``);

      const result = await provider.generateCaseSummary({
        caseData: getCase('CASE-0241'),
        evidence: [],
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      expect(result.situation).toBe('Test from code block');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 9. AI PROVENANCE CREATION
  // ═══════════════════════════════════════════════════════
  describe('9. AI Provenance Creation', () => {
    it('AI case summary creates provenance event via AIService', async () => {
      // This test uses MockAI (default) to verify provenance works
      const eventsBefore = getEventsForCase('CASE-0241');

      await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: eventsBefore,
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const eventsAfter = getEventsForCase('CASE-0241');
      const aiEvent = eventsAfter.find(e => e.event_type === 'AI_CASE_SUMMARY_GENERATED');
      expect(aiEvent).toBeDefined();
      expect(aiEvent.actor_type).toBe('ai');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 10. INPUT FINGERPRINTING
  // ═══════════════════════════════════════════════════════
  describe('10. Input Fingerprinting', () => {
    it('Same input produces cached result', async () => {
      const input = {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      };

      const result1 = await generateCaseSummary('CASE-0241', input);
      const result2 = await generateCaseSummary('CASE-0241', input);

      expect(result2.cached).toBe(true);
      expect(result2.correlationId).toBe(result1.correlationId);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 11. CACHE BEHAVIOR
  // ═══════════════════════════════════════════════════════
  describe('11. Cache Behavior', () => {
    it('Cached result includes cachedAt timestamp', async () => {
      const input = {
        caseData: getCase('CASE-0241'),
        evidence: [],
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      };

      await generateCaseSummary('CASE-0241', input);
      const cached = await generateCaseSummary('CASE-0241', input);

      expect(cached.cached).toBe(true);
      expect(cached.cachedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 12. CACHE INVALIDATION
  // ═══════════════════════════════════════════════════════
  describe('12. Cache Invalidation', () => {
    it('Different inputs produce different results (not cached)', async () => {
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

      expect(result1.correlationId).not.toBe(result2.correlationId);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 13. HUMAN APPROVAL ENFORCEMENT
  // ═══════════════════════════════════════════════════════
  describe('13. Human Approval Enforcement', () => {
    it('Remediation recommendation contains human approval disclaimer', async () => {
      const result = await recommendRemediation('CASE-0241', {
        finding: { findingId: 'FIND-001', title: 'SQL Injection', severity: 'high', confidence: 'high', affectedAsset: 'Auth' },
        evidence: [],
        timeline: [],
        affectedSystem: 'Auth',
      });

      expect(result.disclaimer).toContain('officer approval');
      expect(result.disclaimer).toContain('not be executed automatically');
    });

    it('Finding explanation contains verification disclaimer', async () => {
      const result = await explainFinding('CASE-0241', 'FIND-001', {
        finding: { findingId: 'FIND-001', title: 'Test', severity: 'high', confidence: 'medium', affectedAsset: 'Test' },
        supportingEvidence: [],
        supportingEvents: [],
        timeline: [],
        severity: 'high',
        confidence: 'medium',
      });

      expect(result.disclaimer).toContain('officer verification');
    });

    it('Anomaly analysis contains verification disclaimer', async () => {
      const result = await analyzeAnomaly('CASE-0241', {
        anomaly: { caseId: 'CASE-0241', type: 'integrity_failure' },
        provenanceRecords: [],
        evidenceIntegrityState: [],
        timeline: [],
      });

      expect(result.disclaimer).toContain('officer verification');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 14. API KEY NEVER RETURNED
  // ═══════════════════════════════════════════════════════
  describe('14. API Key Never Returned', () => {
    it('getAIProviderInfo does not expose API key', () => {
      const info = getAIProviderInfo();
      const infoStr = JSON.stringify(info);
      expect(infoStr).not.toContain('sk-');
      expect(infoStr).not.toContain('apiKey');
      expect(info.apiKey).toBeUndefined();
    });

    it('getAIProviderStatus does not expose API key', () => {
      const status = getAIProviderStatus();
      const statusStr = JSON.stringify(status);
      expect(statusStr).not.toContain('sk-');
      expect(status.apiKey).toBeUndefined();
      expect(status.apiKeyConfigured).toBeTypeOf('boolean');
    });

    it('AI responses do not contain API key', async () => {
      const result = await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: [],
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('sk-');
      expect(resultStr).not.toContain('OPENAI_API_KEY');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 15. MOCK PROVIDER FALLBACK
  // ═══════════════════════════════════════════════════════
  describe('15. Mock Provider Fallback', () => {
    it('MockAIProvider is used by default', () => {
      const originalEnv = process.env.AI_PROVIDER;
      delete process.env.AI_PROVIDER;

      const info = getAIProviderInfo();
      expect(info.type).toBe('mock');

      if (originalEnv !== undefined) process.env.AI_PROVIDER = originalEnv;
      else delete process.env.AI_PROVIDER;
    });

    it('MockAIProvider generates valid responses', async () => {
      const result = await generateCaseSummary('CASE-0241', {
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      expect(result.type).toBe('case_summary');
      expect(result.aiEnhanced).toBe(false);
      // MockAIProvider returns aiEnhanced=false, which distinguishes it from real AI
      expect(result.situation).toBeDefined();
    });

    it('Switching from openai to mock works', () => {
      const originalEnv = process.env.AI_PROVIDER;
      const originalKey = process.env.OPENAI_API_KEY;

      // Set to openai with no key → should fall back to mock
      process.env.AI_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;

      const info = getAIProviderInfo();
      expect(info.type).toBe('mock');

      // Restore
      if (originalEnv !== undefined) process.env.AI_PROVIDER = originalEnv;
      else delete process.env.AI_PROVIDER;
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
      else delete process.env.OPENAI_API_KEY;
    });
  });

  // ═══════════════════════════════════════════════════════
  // BONUS: EVIDENCE INTEGRITY PRESERVED
  // ═══════════════════════════════════════════════════════
  describe('Bonus: Evidence Integrity Preserved', () => {
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

      for (const before of hashesBefore) {
        const after = eventsAfter.find(e => e.event_id === before.id);
        expect(after.record_hash).toBe(before.hash);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════
// MANUAL INTEGRATION TEST (requires real API key)
// ═══════════════════════════════════════════════════════
describe.skip('MANUAL: Real OpenAI API Integration (requires OPENAI_API_KEY)', () => {
  it('Real API call: Case Summary', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping: OPENAI_API_KEY not set');
      return;
    }

    const result = await generateCaseSummary('CASE-0241', {
      caseData: getCase('CASE-0241'),
      evidence: getEvidenceForCase('CASE-0241'),
      timeline: getEventsForCase('CASE-0241'),
      findings: [],
      verificationStatus: 'VERIFIED',
    });

    expect(result.type).toBe('case_summary');
    expect(result.aiEnhanced).toBe(true);
    expect(result.provider).toBe('openai');
    expect(result.situation).toBeDefined();
    expect(result.situation.length).toBeGreaterThan(20);
    console.log('✓ Real API call successful');
    console.log(`  Model: ${result.model}`);
    console.log(`  Situation: ${result.situation.substring(0, 100)}...`);
  });

  it('Real API call: Finding Explanation', async () => {
    if (!process.env.OPENAI_API_KEY) return;

    const invResult = runInvestigation('CASE-0243', {
      adapterName: 'mock',
      scenario: 'suspicious-data-access',
    });

    const findings = getFindings('CASE-0243', invResult.investigationId);
    if (findings.length === 0) {
      console.log('No findings to explain');
      return;
    }

    const result = await explainFinding('CASE-0243', findings[0].findingId, {
      finding: findings[0],
      supportingEvidence: getEvidenceForCase('CASE-0243'),
      supportingEvents: [],
      timeline: getEventsForCase('CASE-0243'),
      severity: findings[0].severity,
      confidence: findings[0].confidence,
    });

    expect(result.type).toBe('finding_explanation');
    expect(result.aiEnhanced).toBe(true);
    console.log('✓ Real finding explanation successful');
  });

  it('Real API call: Remediation Recommendation', async () => {
    if (!process.env.OPENAI_API_KEY) return;

    const invResult = runInvestigation('CASE-0243', {
      adapterName: 'mock',
      scenario: 'suspicious-data-access',
    });

    const findings = getFindings('CASE-0243', invResult.investigationId);
    if (findings.length === 0) return;

    const result = await recommendRemediation('CASE-0243', {
      finding: findings[0],
      evidence: getEvidenceForCase('CASE-0243'),
      timeline: getEventsForCase('CASE-0243'),
      affectedSystem: findings[0].affectedAsset,
    });

    expect(result.type).toBe('remediation_recommendation');
    expect(result.aiEnhanced).toBe(true);
    expect(result.disclaimer).toContain('officer approval');
    console.log('✓ Real remediation recommendation successful');
  });
});
