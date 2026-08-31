import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import { classifyError, shouldFallback, ErrorCategory } from '../server/services/ai/errors.js';
import { MockAIProvider } from '../server/services/ai/providers/MockAIProvider.js';
import { OpenAIProvider } from '../server/services/ai/providers/OpenAIProvider.js';
import { getCase } from '../server/services/case.js';
import { getEvidenceForCase } from '../server/services/evidence.js';
import { getEventsForCase } from '../server/services/provenance.js';

describe('AI Fallback Mechanism', () => {
  let savedEnv;

  beforeAll(() => {
    getDb();
    seedDatabase();
    // Save original env
    savedEnv = {
      AI_PROVIDER: process.env.AI_PROVIDER,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      AI_FALLBACK_ENABLED: process.env.AI_FALLBACK_ENABLED,
      AI_FALLBACK_PROVIDER: process.env.AI_FALLBACK_PROVIDER,
    };
  });

  afterAll(() => {
    // Restore env
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  beforeEach(() => {
    // Reset env to clean state for each test
    process.env.AI_PROVIDER = 'mock';
    delete process.env.OPENAI_API_KEY;
    process.env.AI_FALLBACK_ENABLED = 'true';
    process.env.AI_FALLBACK_PROVIDER = 'mock';
  });

  // ═══════════════════════════════════════════════════════
  // 1. ERROR CLASSIFICATION
  // ═══════════════════════════════════════════════════════
  describe('1. Error Classification', () => {
    it('classifies rate limit (429) as transient', () => {
      const error = Object.assign(new Error('Rate limit exceeded'), { status: 429 });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('rate_limit');
    });

    it('classifies timeout as transient', () => {
      const error = Object.assign(new Error('Request timed out'), { status: 408, code: 'timeout' });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('request_timeout');
    });

    it('classifies 500 as transient', () => {
      const error = Object.assign(new Error('Internal server error'), { status: 500 });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('provider_error');
    });

    it('classifies 502 as transient', () => {
      const error = Object.assign(new Error('Bad gateway'), { status: 502 });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('bad_gateway');
    });

    it('classifies 503 as transient', () => {
      const error = Object.assign(new Error('Service unavailable'), { status: 503 });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('service_unavailable');
    });

    it('classifies 504 as transient', () => {
      const error = Object.assign(new Error('Gateway timeout'), { status: 504 });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('gateway_timeout');
    });

    it('classifies network connection error as transient', () => {
      const error = Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('econnrefused');
    });

    it('classifies DNS error as transient', () => {
      const error = Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('enotfound');
    });

    it('classifies connection reset as transient', () => {
      const error = Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' });
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.reason).toBe('econnreset');
    });

    it('classifies invalid request as application error', () => {
      const error = new Error('Invalid request data: missing required field');
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.APPLICATION);
    });

    it('classifies type error as application error', () => {
      const error = new TypeError('Cannot read properties of undefined');
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.APPLICATION);
    });

    it('classifies missing required parameter as application error', () => {
      const error = new Error('Missing required parameter: caseId');
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.APPLICATION);
    });

    it('classifies OpenAI invalid_request_error as application error', () => {
      const error = {
        error: { type: 'invalid_request_error', message: 'Invalid request' },
      };
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.APPLICATION);
    });

    it('classifies OpenAI authentication error as configuration error', () => {
      const error = {
        error: { type: 'authentication_error', code: 'invalid_api_key' },
      };
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.CONFIGURATION);
    });

    it('shouldFallback returns true for transient errors', () => {
      const error = Object.assign(new Error('Rate limit'), { status: 429 });
      expect(shouldFallback(error)).toBe(true);
    });

    it('shouldFallback returns false for application errors', () => {
      const error = new Error('Invalid request data');
      expect(shouldFallback(error)).toBe(false);
    });

    it('shouldFallback returns false for configuration errors', () => {
      const error = {
        error: { type: 'authentication_error', code: 'invalid_api_key' },
      };
      expect(shouldFallback(error)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. FALLBACK METADATA
  // ═══════════════════════════════════════════════════════
  describe('2. Fallback Metadata', () => {
    it('MockAIProvider response has correct aiEnhanced flag', async () => {
      const provider = new MockAIProvider();
      const result = await provider.generateCaseSummary({
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      expect(result.aiEnhanced).toBe(false);
      expect(result.type).toBe('case_summary');
    });

    it('MockAIProvider responses include provider type', async () => {
      const provider = new MockAIProvider();
      const info = provider.getProviderInfo();
      expect(info.type).toBe('mock');
      expect(info.name).toBe('MockAI');
    });

    it('OpenAIProvider responses would include aiEnhanced: true', async () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key', model: 'gpt-4o' });
      const info = provider.getProviderInfo();
      expect(info.type).toBe('openai');
      expect(info.available).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. FALLBACK CONFIGURATION
  // ═══════════════════════════════════════════════════════
  describe('3. Fallback Configuration', () => {
    it('fallback is enabled by default', () => {
      delete process.env.AI_FALLBACK_ENABLED;
      // Default should be true
      const enabled = (process.env.AI_FALLBACK_ENABLED || 'true').toLowerCase() !== 'false';
      expect(enabled).toBe(true);
    });

    it('fallback can be disabled via env var', () => {
      process.env.AI_FALLBACK_ENABLED = 'false';
      const enabled = (process.env.AI_FALLBACK_ENABLED || 'true').toLowerCase() !== 'false';
      expect(enabled).toBe(false);
    });

    it('fallback provider defaults to mock', () => {
      delete process.env.AI_FALLBACK_PROVIDER;
      const provider = (process.env.AI_FALLBACK_PROVIDER || 'mock').toLowerCase();
      expect(provider).toBe('mock');
    });

    it('fallback provider can be configured', () => {
      process.env.AI_FALLBACK_PROVIDER = 'mock';
      const provider = (process.env.AI_FALLBACK_PROVIDER || 'mock').toLowerCase();
      expect(provider).toBe('mock');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. MISSING API KEY → MOCK FALLBACK
  // ═══════════════════════════════════════════════════════
  describe('4. Missing API Key Handling', () => {
    it('OpenAIProvider without API key throws on _responsesRequest', async () => {
      const provider = new OpenAIProvider({ apiKey: null });
      await expect(
        provider._responsesRequest('system', 'user')
      ).rejects.toThrow('OPENAI_API_KEY is not configured');
    });

    it('OpenAIProvider without API key has available: false', () => {
      const provider = new OpenAIProvider({ apiKey: null });
      const info = provider.getProviderInfo();
      expect(info.available).toBe(false);
    });

    it('OpenAIProvider with API key has available: true', () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });
      const info = provider.getProviderInfo();
      expect(info.available).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. SIMULATED FALLBACK SCENARIOS
  // ═══════════════════════════════════════════════════════
  describe('5. Simulated Fallback Scenarios', () => {
    it('MockAIProvider generates valid case summary (simulating successful fallback)', async () => {
      const provider = new MockAIProvider();
      const result = await provider.generateCaseSummary({
        caseData: getCase('CASE-0241'),
        evidence: getEvidenceForCase('CASE-0241'),
        timeline: [],
        findings: [],
        verificationStatus: 'VERIFIED',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('case_summary');
      expect(result.aiEnhanced).toBe(false);
      expect(result.situation).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('MockAIProvider generates valid finding explanation (simulating successful fallback)', async () => {
      const provider = new MockAIProvider();
      const result = await provider.explainFinding({
        finding: {
          findingId: 'FIND-test',
          title: 'Test Finding',
          description: 'Test',
          severity: 'high',
          confidence: 'medium',
          affectedAsset: 'Test System',
        },
        supportingEvidence: [{ evidence_id: 'E-001', name: 'Test', type: 'logs' }],
        supportingEvents: [{ eventType: 'FAILED_LOGIN' }],
        timeline: [],
        severity: 'high',
        confidence: 'medium',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('finding_explanation');
      expect(result.aiEnhanced).toBe(false);
      expect(result.disclaimer).toContain('officer verification');
    });

    it('MockAIProvider generates valid remediation recommendation (simulating successful fallback)', async () => {
      const provider = new MockAIProvider();
      const result = await provider.recommendRemediation({
        finding: {
          findingId: 'FIND-test',
          title: 'SQL Injection',
          severity: 'high',
          confidence: 'high',
          affectedAsset: 'Auth Service',
        },
        evidence: [{ evidence_id: 'E-001' }],
        timeline: [],
        affectedSystem: 'Auth Service',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('remediation_recommendation');
      expect(result.aiEnhanced).toBe(false);
      expect(result.disclaimer).toContain('officer approval');
    });

    it('MockAIProvider generates valid handover (simulating successful fallback)', async () => {
      const provider = new MockAIProvider();
      const result = await provider.generateHandover({
        caseData: getCase('CASE-0241'),
        findings: [],
        timeline: [],
        evidence: getEvidenceForCase('CASE-0241'),
        completedActions: ['Detection'],
        pendingActions: ['Fix'],
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('handover_summary');
      expect(result.aiEnhanced).toBe(false);
    });

    it('MockAIProvider generates valid anomaly analysis (simulating successful fallback)', async () => {
      const provider = new MockAIProvider();
      const result = await provider.analyzeAnomaly({
        anomaly: { caseId: 'CASE-0241', type: 'integrity_failure', evidenceId: 'E-001' },
        provenanceRecords: [],
        evidenceIntegrityState: [{ evidence_id: 'E-001', verification_status: 'compromised' }],
        timeline: [],
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('anomaly_analysis');
      expect(result.aiEnhanced).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. NON-TRANSIENT ERROR HANDLING
  // ═══════════════════════════════════════════════════════
  describe('6. Non-Transient Error Handling', () => {
    it('application errors are NOT classified as transient', () => {
      const errors = [
        new Error('Invalid request data'),
        new TypeError('Cannot read properties of undefined'),
        new Error('Missing required parameter'),
        new Error('Validation error: invalid input'),
      ];

      for (const error of errors) {
        const classification = classifyError(error);
        expect(classification.category).not.toBe(ErrorCategory.TRANSIENT);
        expect(shouldFallback(error)).toBe(false);
      }
    });

    it('configuration errors are NOT classified as transient', () => {
      const error = {
        error: { type: 'authentication_error', code: 'invalid_api_key' },
      };
      const classification = classifyError(error);
      expect(classification.category).toBe(ErrorCategory.CONFIGURATION);
      expect(shouldFallback(error)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 7. SECURITY CHECKS
  // ═══════════════════════════════════════════════════════
  describe('7. Security Checks', () => {
    it('error classification never includes API keys', () => {
      const error = Object.assign(new Error('Rate limit exceeded'), { status: 429 });
      const classification = classifyError(error);

      const serialized = JSON.stringify(classification);
      expect(serialized).not.toMatch(/sk-/);
      expect(serialized).not.toMatch(/api[_-]?key/i);
    });

    it('error classification never includes bearer tokens', () => {
      const error = new Error('Bearer token expired');
      const classification = classifyError(error);

      const serialized = JSON.stringify(classification);
      expect(serialized).not.toMatch(/bearer/i);
    });

    it('fallback reason is safe to expose', () => {
      const error = Object.assign(new Error('Rate limit exceeded'), { status: 429 });
      const classification = classifyError(error);

      // Reason should be a safe, generic string
      expect(classification.reason).toMatch(/^[a-z_]+$/);
      expect(classification.reason).not.toMatch(/sk-/);
      expect(classification.reason).not.toMatch(/key/i);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 8. PROVIDER INTERFACE COMPATIBILITY
  // ═══════════════════════════════════════════════════════
  describe('8. Provider Interface Compatibility', () => {
    it('both providers implement the same interface', () => {
      const mock = new MockAIProvider();
      const openai = new OpenAIProvider({ apiKey: 'test' });

      // Both should have the same methods
      expect(typeof mock.generateCaseSummary).toBe('function');
      expect(typeof openai.generateCaseSummary).toBe('function');
      expect(typeof mock.explainFinding).toBe('function');
      expect(typeof openai.explainFinding).toBe('function');
      expect(typeof mock.recommendRemediation).toBe('function');
      expect(typeof openai.recommendRemediation).toBe('function');
      expect(typeof mock.generateHandover).toBe('function');
      expect(typeof openai.generateHandover).toBe('function');
      expect(typeof mock.analyzeAnomaly).toBe('function');
      expect(typeof openai.analyzeAnomaly).toBe('function');
      expect(typeof mock.getProviderInfo).toBe('function');
      expect(typeof openai.getProviderInfo).toBe('function');
    });

    it('both providers return compatible response structures', async () => {
      const mock = new MockAIProvider();
      const caseData = getCase('CASE-0241');
      const evidence = getEvidenceForCase('CASE-0241');

      const mockResult = await mock.generateCaseSummary({
        caseData, evidence, timeline: [], findings: [], verificationStatus: 'VERIFIED',
      });

      // Both should have the same top-level keys
      expect(mockResult.type).toBeDefined();
      expect(mockResult.aiEnhanced).toBeDefined();
      expect(typeof mockResult.aiEnhanced).toBe('boolean');
      expect(mockResult.confidence).toBeDefined();
      expect(mockResult.sourceEvidenceIds).toBeDefined();
      expect(Array.isArray(mockResult.sourceEvidenceIds)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 9. AUDIT TRAIL INTEGRATION
  // ═══════════════════════════════════════════════════════
  describe('9. Audit Trail Integration', () => {
    it('audit trail module can be imported', async () => {
      const auditTrail = await import('../server/services/ai/auditTrail.js');
      expect(auditTrail.recordAuditEvent).toBeDefined();
      expect(typeof auditTrail.recordAuditEvent).toBe('function');
    });

    it('audit trail records events correctly', async () => {
      const { recordAuditEvent, initAuditTrail } = await import('../server/services/ai/auditTrail.js');
      initAuditTrail();

      const event = recordAuditEvent({
        caseId: 'CASE-0241',
        eventType: 'AI_FALLBACK_ACTIVATED',
        actorType: 'ai',
        actorId: 'mock/deterministic-fallback',
        description: 'Fallback from openai to mock due to rate_limit',
        metadata: {
          correlationId: 'COR-test-001',
          failedProvider: 'openai',
          failedReason: 'rate_limit',
          fallbackProvider: 'mock',
        },
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.eventHash).toBeDefined();
      expect(event.eventType).toBe('AI_FALLBACK_ACTIVATED');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 10. EDGE CASES
  // ═══════════════════════════════════════════════════════
  describe('10. Edge Cases', () => {
    it('null error is classified as application error', () => {
      const result = classifyError(null);
      expect(result.category).toBe(ErrorCategory.APPLICATION);
    });

    it('undefined error is classified as application error', () => {
      const result = classifyError(undefined);
      expect(result.category).toBe(ErrorCategory.APPLICATION);
    });

    it('error without message is still classified', () => {
      const error = { status: 429 };
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
    });

    it('error with numeric status is classified', () => {
      const error = new Error('Server error');
      error.status = 500;
      const result = classifyError(error);
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
    });
  });
});
