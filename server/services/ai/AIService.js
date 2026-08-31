/**
 * AIService — Provider-agnostic AI integration for FPC–SORVAX.
 *
 * Architecture:
 *   Investigation Data → AIService → AIProvider → Response
 *                                  ↓
 *                          Provenance Event
 *                          Audit Trail Event
 *
 * Fallback:
 *   If the primary provider (OpenAI) fails with a transient error,
 *   AIService automatically falls back to the configured fallback
 *   provider (MockAIProvider) so the application remains functional.
 *
 *   Fallback is NEVER triggered for application/programming errors.
 *   Fallback metadata is included in every response.
 *
 * Environment Variables:
 *   AI_PROVIDER=mock|openai (default: mock)
 *   OPENAI_API_KEY=sk-... (required for openai)
 *   OPENAI_MODEL=gpt-4o (optional, default: gpt-4o)
 *   AI_FALLBACK_ENABLED=true|false (default: true)
 *   AI_FALLBACK_PROVIDER=mock|openai (default: mock)
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { MockAIProvider } from './providers/MockAIProvider.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { classifyError, shouldFallback, ErrorCategory } from './errors.js';
import { getDb } from '../../db.js';
import { createProvenanceEvent } from '../provenance.js';
import { recordAuditEvent } from './auditTrail.js';

// ═══════════════════════════════════════════════════════
// Provider Factory
// ═══════════════════════════════════════════════════════

/**
 * Create an AI provider instance based on environment configuration.
 *
 * Provider selection:
 *   AI_PROVIDER=openai + OPENAI_API_KEY set → OpenAIProvider
 *   AI_PROVIDER=openai + no key              → MockAIProvider (with warning)
 *   AI_PROVIDER=mock (default)               → MockAIProvider
 */
function createProvider(providerType) {
  const type = (providerType || process.env.AI_PROVIDER || 'mock').toLowerCase();

  if (type === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('AI_PROVIDER=openai but OPENAI_API_KEY not set. Falling back to MockAIProvider.');
      return { provider: new MockAIProvider(), type: 'mock' };
    }
    const model = process.env.OPENAI_MODEL;
    const config = { apiKey };
    if (model) config.model = model;
    return { provider: new OpenAIProvider(config), type: 'openai' };
  }

  return { provider: new MockAIProvider(), type: 'mock' };
}

// ═══════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════

function isFallbackEnabled() {
  return (process.env.AI_FALLBACK_ENABLED || 'true').toLowerCase() !== 'false';
}

function getFallbackProviderType() {
  return (process.env.AI_FALLBACK_PROVIDER || 'mock').toLowerCase();
}

// ═══════════════════════════════════════════════════════
// Provider Status
// ═══════════════════════════════════════════════════════

/**
 * Get AI provider status (safe — no secrets exposed).
 */
export function getAIProviderStatus() {
  const providerType = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || (providerType === 'openai' ? 'gpt-4.1-nano' : null);

  return {
    provider: providerType,
    model: providerType === 'openai' ? model : null,
    available: providerType === 'mock' || hasApiKey,
    apiKeyConfigured: hasApiKey,
    fallbackActive: providerType === 'openai' && !hasApiKey,
    fallbackEnabled: isFallbackEnabled(),
    fallbackProvider: getFallbackProviderType(),
  };
}

/**
 * Get the current AI provider info.
 */
export function getAIProviderInfo() {
  const { provider } = createProvider();
  return provider.getProviderInfo();
}

// ═══════════════════════════════════════════════════════
// Input Fingerprinting & Caching
// ═══════════════════════════════════════════════════════

function computeInputFingerprint(operation, inputData) {
  const sorted = sortObjectKeys({ operation, data: inputData });
  const canonical = JSON.stringify(sorted);
  return createHash('sha256').update(canonical).digest('hex');
}

function sortObjectKeys(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  return sorted;
}

function getCachedResponse(fingerprint) {
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM ai_interactions WHERE input_fingerprint = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
    ).get(fingerprint, 'success');
    return row || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Interaction Storage
// ═══════════════════════════════════════════════════════

function storeInteraction({ caseId, operation, provider, model, inputReference, output, outputHash, fingerprint, status, errorMessage }) {
  try {
    const db = getDb();
    const id = `AI-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    const computedHash = createHash('sha256').update(outputStr).digest('hex');

    db.prepare(`
      INSERT INTO ai_interactions (
        id, case_id, operation, provider, model, input_reference,
        input_fingerprint, output, output_hash, status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, caseId, operation, provider, model,
      inputReference || null, fingerprint, outputStr,
      outputHash || computedHash, status || 'success',
      errorMessage || null, now
    );

    return id;
  } catch (err) {
    console.error('Failed to store AI interaction:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Provenance Recording
// ═══════════════════════════════════════════════════════

function recordAIOperation({ caseId, operation, provider, model, inputReference, outputHash, correlationId }) {
  try {
    createProvenanceEvent({
      caseId,
      eventType: operation,
      actorType: 'ai',
      actorId: `${provider}/${model}`,
      description: `AI ${operation.replace('AI_', '').toLowerCase().replace(/_/g, ' ')} generated`,
      metadataJson: {
        correlation_id: correlationId,
        provider,
        model,
        input_reference: inputReference,
        output_hash: outputHash,
      },
    });
  } catch (err) {
    console.error('Failed to record AI provenance event:', err.message);
  }
}

// ═══════════════════════════════════════════════════════
// Audit Trail Recording
// ═══════════════════════════════════════════════════════

function recordAudit({ caseId, eventType, provider, model, operation, metadata }) {
  try {
    recordAuditEvent({
      caseId,
      eventType,
      actorType: 'ai',
      actorId: `${provider}/${model}`,
      description: `AI ${operation} via ${provider}`,
      metadata,
    });
  } catch (err) {
    console.error('Failed to record AI audit event:', err.message);
  }
}

// ═══════════════════════════════════════════════════════
// Fallback Orchestration
// ═══════════════════════════════════════════════════════

/**
 * Execute an AI operation with automatic fallback.
 *
 * This is the core orchestration function. It:
 * 1. Creates the primary provider
 * 2. Attempts the operation
 * 3. If it fails with a transient error AND fallback is enabled:
 *    a. Creates the fallback provider
 *    b. Retries with the fallback
 *    c. Records the fallback event in audit trail
 * 4. Returns the result with metadata
 *
 * @param {string} caseId - Case identifier
 * @param {string} operation - Operation name (e.g., 'generateCaseSummary')
 * @param {Function} primaryFn - Function that calls the primary provider
 * @param {Object} inputRef - Input reference for tracking
 * @returns {Object} Result with fallback metadata
 */
async function executeWithFallback(caseId, operation, primaryFn, inputRef) {
  const correlationId = `COR-${uuidv4().substring(0, 8)}`;
  const startTime = Date.now();

  // Record audit: request started
  const { provider: primaryProvider, type: primaryType } = createProvider();
  const primaryInfo = primaryProvider.getProviderInfo();

  recordAudit({
    caseId,
    eventType: 'AI_REQUEST_STARTED',
    provider: primaryType,
    model: primaryInfo.model || 'unknown',
    operation,
    metadata: {
      correlationId,
      operation,
      inputReference: inputRef,
    },
  });

  try {
    // Attempt primary provider
    const result = await primaryFn(primaryProvider, correlationId);

    // Record audit: provider used successfully
    recordAudit({
      caseId,
      eventType: 'AI_PROVIDER_USED',
      provider: primaryType,
      model: primaryInfo.model || 'unknown',
      operation,
      metadata: {
        correlationId,
        operation,
        success: true,
        durationMs: Date.now() - startTime,
      },
    });

    return {
      result,
      metadata: {
        provider: primaryType,
        model: primaryInfo.model || null,
        aiEnhanced: primaryType !== 'mock',
        fallbackUsed: false,
        correlationId,
      },
    };
  } catch (primaryError) {
    // Classify the error
    const classification = classifyError(primaryError);

    // Record audit: request failed
    recordAudit({
      caseId,
      eventType: 'AI_REQUEST_FAILED',
      provider: primaryType,
      model: primaryInfo.model || 'unknown',
      operation,
      metadata: {
        correlationId,
        operation,
        errorCategory: classification.category,
        errorReason: classification.reason,
        durationMs: Date.now() - startTime,
      },
    });

    // Check if fallback is appropriate
    const fallbackEnabled = isFallbackEnabled();
    const canFallback = shouldFallback(primaryError) && fallbackEnabled;

    if (!canFallback) {
      // Application/config error OR fallback disabled — surface the error
      throw primaryError;
    }

    // Activate fallback
    const fallbackType = getFallbackProviderType();
    const { provider: fallbackProvider } = createProvider(fallbackType);
    const fallbackInfo = fallbackProvider.getProviderInfo();

    console.warn(
      `[AIService] Primary provider (${primaryType}) failed with ${classification.reason}. ` +
      `Falling back to ${fallbackType}.`
    );

    // Record audit: fallback activated
    recordAudit({
      caseId,
      eventType: 'AI_FALLBACK_ACTIVATED',
      provider: fallbackType,
      model: fallbackInfo.model || 'deterministic-fallback',
      operation,
      metadata: {
        correlationId,
        operation,
        failedProvider: primaryType,
        failedReason: classification.reason,
        fallbackProvider: fallbackType,
      },
    });

    try {
      // Attempt with fallback provider
      const fallbackResult = await primaryFn(fallbackProvider, correlationId);

      // Record audit: fallback used successfully
      recordAudit({
        caseId,
        eventType: 'AI_PROVIDER_USED',
        provider: fallbackType,
        model: fallbackInfo.model || 'deterministic-fallback',
        operation,
        metadata: {
          correlationId,
          operation,
          success: true,
          wasFallback: true,
          durationMs: Date.now() - startTime,
        },
      });

      return {
        result: fallbackResult,
        metadata: {
          provider: fallbackType,
          model: fallbackInfo.model || 'deterministic-fallback',
          aiEnhanced: false,
          fallbackUsed: true,
          fallbackReason: classification.reason,
          failedProvider: primaryType,
          correlationId,
        },
      };
    } catch (fallbackError) {
      // Fallback also failed — surface the original error
      console.error('[AIService] Fallback provider also failed:', fallbackError.message);
      throw primaryError;
    }
  }
}

// ═══════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════

/**
 * Generate a case summary.
 */
export async function generateCaseSummary(caseId, { caseData, evidence, timeline, findings, verificationStatus }) {
  const operation = 'AI_CASE_SUMMARY_GENERATED';
  const inputData = { caseData, evidence, timeline, findings, verificationStatus };
  const fingerprint = computeInputFingerprint('case_summary', inputData);

  // Check cache
  const cached = getCachedResponse(fingerprint);
  if (cached) {
    return {
      ...JSON.parse(cached.output),
      cached: true,
      cachedAt: cached.created_at,
      correlationId: cached.id,
    };
  }

  const inputRef = JSON.stringify({ caseId, findingIds: (findings || []).map(f => f.findingId || f.id) });

  const { result, metadata } = await executeWithFallback(
    caseId,
    operation,
    async (provider, corrId) => {
      const providerInfo = provider.getProviderInfo();
      const res = await provider.generateCaseSummary(inputData);

      // Store interaction
      const interactionId = storeInteraction({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, output: res, fingerprint,
      });

      // Record provenance
      recordAIOperation({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, outputHash: res.output_hash, correlationId: interactionId || corrId,
      });

      return res;
    },
    inputRef,
  );

  // Merge metadata into result
  const merged = {
    ...result,
    ...metadata,
    correlationId: metadata.correlationId,
    timestamp: new Date().toISOString(),
  };

  // If fallback was used, update the stored interaction
  if (metadata.fallbackUsed) {
    storeInteraction({
      caseId, operation, provider: metadata.provider, model: metadata.model,
      inputReference: inputRef, output: merged, fingerprint,
    });
  }

  return merged;
}

/**
 * Explain a finding.
 */
export async function explainFinding(caseId, findingId, { finding, supportingEvidence, supportingEvents, timeline, severity, confidence }) {
  const operation = 'AI_FINDING_EXPLAINED';
  const inputData = { finding, supportingEvidence, supportingEvents, timeline, severity, confidence };
  const fingerprint = computeInputFingerprint('finding_explanation', inputData);

  const cached = getCachedResponse(fingerprint);
  if (cached) {
    return {
      ...JSON.parse(cached.output),
      cached: true,
      cachedAt: cached.created_at,
      correlationId: cached.id,
    };
  }

  const inputRef = JSON.stringify({ caseId, findingId });

  const { result, metadata } = await executeWithFallback(
    caseId,
    operation,
    async (provider, corrId) => {
      const providerInfo = provider.getProviderInfo();
      const res = await provider.explainFinding(inputData);

      const interactionId = storeInteraction({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, output: res, fingerprint,
      });

      recordAIOperation({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, correlationId: interactionId || corrId,
      });

      return res;
    },
    inputRef,
  );

  return {
    ...result,
    ...metadata,
    correlationId: metadata.correlationId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Recommend remediation.
 */
export async function recommendRemediation(caseId, { finding, evidence, timeline, affectedSystem }) {
  const operation = 'AI_REMEDIATION_RECOMMENDED';
  const inputData = { finding, evidence, timeline, affectedSystem };
  const fingerprint = computeInputFingerprint('remediation', inputData);

  const cached = getCachedResponse(fingerprint);
  if (cached) {
    return {
      ...JSON.parse(cached.output),
      cached: true,
      cachedAt: cached.created_at,
      correlationId: cached.id,
    };
  }

  const inputRef = JSON.stringify({ caseId, findingId: finding?.findingId || finding?.id });

  const { result, metadata } = await executeWithFallback(
    caseId,
    operation,
    async (provider, corrId) => {
      const providerInfo = provider.getProviderInfo();
      const res = await provider.recommendRemediation(inputData);

      const interactionId = storeInteraction({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, output: res, fingerprint,
      });

      recordAIOperation({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, correlationId: interactionId || corrId,
      });

      return res;
    },
    inputRef,
  );

  return {
    ...result,
    ...metadata,
    correlationId: metadata.correlationId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a case handover summary.
 */
export async function generateHandover(caseId, { caseData, findings, timeline, evidence, completedActions, pendingActions }) {
  const operation = 'AI_HANDOVER_GENERATED';
  const inputData = { caseData, findings, timeline, evidence, completedActions, pendingActions };
  const fingerprint = computeInputFingerprint('handover', inputData);

  const cached = getCachedResponse(fingerprint);
  if (cached) {
    return {
      ...JSON.parse(cached.output),
      cached: true,
      cachedAt: cached.created_at,
      correlationId: cached.id,
    };
  }

  const inputRef = JSON.stringify({ caseId, findingCount: (findings || []).length });

  const { result, metadata } = await executeWithFallback(
    caseId,
    operation,
    async (provider, corrId) => {
      const providerInfo = provider.getProviderInfo();
      const res = await provider.generateHandover(inputData);

      const interactionId = storeInteraction({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, output: res, fingerprint,
      });

      recordAIOperation({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, correlationId: interactionId || corrId,
      });

      return res;
    },
    inputRef,
  );

  return {
    ...result,
    ...metadata,
    correlationId: metadata.correlationId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Analyze an anomaly.
 */
export async function analyzeAnomaly(caseId, { anomaly, provenanceRecords, evidenceIntegrityState, timeline }) {
  const operation = 'AI_ANOMALY_ANALYZED';
  const inputData = { anomaly, provenanceRecords, evidenceIntegrityState, timeline };
  const fingerprint = computeInputFingerprint('anomaly', inputData);

  const cached = getCachedResponse(fingerprint);
  if (cached) {
    return {
      ...JSON.parse(cached.output),
      cached: true,
      cachedAt: cached.created_at,
      correlationId: cached.id,
    };
  }

  const inputRef = JSON.stringify({ caseId, anomalyType: anomaly?.type || anomaly?.event_type });

  const { result, metadata } = await executeWithFallback(
    caseId,
    operation,
    async (provider, corrId) => {
      const providerInfo = provider.getProviderInfo();
      const res = await provider.analyzeAnomaly(inputData);

      const interactionId = storeInteraction({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, output: res, fingerprint,
      });

      recordAIOperation({
        caseId, operation, provider: providerInfo.type, model: providerInfo.model,
        inputReference: inputRef, correlationId: interactionId || corrId,
      });

      return res;
    },
    inputRef,
  );

  return {
    ...result,
    ...metadata,
    correlationId: metadata.correlationId,
    timestamp: new Date().toISOString(),
  };
}
