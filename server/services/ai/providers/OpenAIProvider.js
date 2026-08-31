/**
 * OpenAIProvider - Real AI responses via official OpenAI SDK.
 *
 * Uses the OpenAI Responses API (not Chat Completions) for production-quality integration.
 *
 * Requires:
 *   AI_PROVIDER=openai
 *   OPENAI_API_KEY=sk-...
 *
 * All LLM calls happen server-side. API keys never reach the frontend.
 *
 * Safety:
 *   - All prompts instruct the model to use only supplied information
 *   - Never invent evidence
 *   - Distinguish facts from inference
 *   - Reference evidence IDs when making claims
 *   - Never execute or instruct automatic system modification
 */

import OpenAI from 'openai';
import { AIProvider } from './AIProvider.js';
import { buildCaseSummaryPrompt } from '../prompts/caseSummary.js';
import { buildFindingExplanationPrompt } from '../prompts/findingExplanation.js';
import { buildRemediationPrompt } from '../prompts/remediation.js';
import { buildHandoverPrompt } from '../prompts/handover.js';
import { buildAnomalyPrompt } from '../prompts/anomaly.js';

const DEFAULT_MODEL = 'gpt-4.1-nano';
const DEFAULT_TIMEOUT_MS = 60000;

export class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;

    // Initialize the OpenAI SDK client
    this._client = null;
    if (this.apiKey) {
      this._client = new OpenAI({
        apiKey: this.apiKey,
        timeout: this.timeout,
      });
    }
  }

  getProviderInfo() {
    return {
      name: 'OpenAI',
      type: 'openai',
      version: '2.0.0',
      model: this.model,
      description: 'Real AI responses via OpenAI Responses API (official SDK)',
      available: !!this.apiKey,
    };
  }

  /**
   * Ensure the client is initialized.
   */
  _ensureClient() {
    if (!this._client) {
      throw new Error(
        'OPENAI_API_KEY is not configured. Set AI_PROVIDER=mock to use mock AI, ' +
        'or provide OPENAI_API_KEY in your .env file.'
      );
    }
    return this._client;
  }

  /**
   * Send a request using the OpenAI Responses API.
   *
   * The Responses API is the current production API for OpenAI.
   * It uses `client.responses.create()` with an `input` field.
   */
  async _responsesRequest(systemPrompt, userPrompt) {
    const client = this._ensureClient();

    try {
      const response = await client.responses.create({
        model: this.model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_output_tokens: 2048,
        text: {
          format: { type: 'json_object' },
        },
      });

      // Extract the text output from the response
      const content = response.output_text;
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }

      return {
        content,
        model: response.model || this.model,
        usage: response.usage || {},
        responseId: response.id,
      };
    } catch (err) {
      // Enhance error messages for common failure modes
      if (err?.status === 401 || err?.code === 'invalid_api_key') {
        throw new Error(`Invalid OpenAI API key. Please check your OPENAI_API_KEY configuration.`);
      }
      if (err?.status === 429 || err?.code === 'rate_limit_exceeded') {
        throw new Error(`OpenAI rate limit exceeded. Please wait and try again.`);
      }
      if (err?.status === 408 || err?.code === 'timeout') {
        throw new Error(`OpenAI API request timed out after ${this.timeout}ms.`);
      }
      if (err?.status === 404 || err?.code === 'model_not_found') {
        throw new Error(`OpenAI model "${this.model}" not found. Check OPENAI_MODEL configuration.`);
      }
      // Re-throw with context
      throw new Error(`OpenAI API error: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Parse a JSON response from the LLM, with fallback handling.
   * Handles both direct JSON and markdown-wrapped JSON.
   */
  _parseJSON(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Empty or invalid response content');
    }

    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try direct JSON parse
    return JSON.parse(content);
  }

  // ═══════════════════════════════════════════════════════
  // Five AI Capabilities
  // ═══════════════════════════════════════════════════════

  async generateCaseSummary({ caseData, evidence, timeline, findings, verificationStatus }) {
    const { systemPrompt, userPrompt } = buildCaseSummaryPrompt({
      caseData, evidence, timeline, findings, verificationStatus,
    });

    const result = await this._responsesRequest(systemPrompt, userPrompt);

    let parsed;
    try {
      parsed = this._parseJSON(result.content);
    } catch {
      parsed = {
        situation: result.content,
        whatHappened: result.content,
        currentStatus: 'See situation description.',
        recommendedNextStep: 'Review the AI-generated summary.',
      };
    }

    return {
      type: 'case_summary',
      ...parsed,
      confidence: parsed.confidence || 'ai-generated',
      aiEnhanced: true,
      provider: 'openai',
      model: result.model,
      sourceFindingIds: (findings || []).map(f => f.findingId || f.id).filter(Boolean),
      sourceEvidenceIds: (evidence || []).map(e => e.evidence_id || e.id).filter(Boolean),
    };
  }

  async explainFinding({ finding, supportingEvidence, supportingEvents, timeline, severity, confidence }) {
    const { systemPrompt, userPrompt } = buildFindingExplanationPrompt({
      finding, supportingEvidence, supportingEvents, timeline, severity, confidence,
    });

    const result = await this._responsesRequest(systemPrompt, userPrompt);

    let parsed;
    try {
      parsed = this._parseJSON(result.content);
    } catch {
      parsed = {
        whatDetected: result.content,
        whySuspicious: 'See description.',
        evidenceSupporting: 'Review the supporting evidence.',
        likelyImpact: 'Impact assessment requires officer review.',
        nextInvestigationStep: 'Review the finding and supporting evidence.',
      };
    }

    return {
      type: 'finding_explanation',
      ...parsed,
      confidence: parsed.confidence || confidence || 'ai-generated',
      aiEnhanced: true,
      provider: 'openai',
      model: result.model,
      sourceFindingIds: [finding?.findingId || finding?.id].filter(Boolean),
      sourceEvidenceIds: (supportingEvidence || []).map(e => e.evidence_id || e.id || e).filter(Boolean),
      disclaimer: 'AI inference — requires officer verification.',
    };
  }

  async recommendRemediation({ finding, evidence, timeline, affectedSystem }) {
    const { systemPrompt, userPrompt } = buildRemediationPrompt({
      finding, evidence, timeline, affectedSystem,
    });

    const result = await this._responsesRequest(systemPrompt, userPrompt);

    let parsed;
    try {
      parsed = this._parseJSON(result.content);
    } catch {
      parsed = {
        recommendedAction: result.content,
        rationale: 'See recommended action.',
        expectedSecurityImprovement: 'The fix should address the identified vulnerability.',
        potentialRisks: 'Review with the officer before applying.',
        verificationStepsAfterRemediation: ['Run security scan', 'Execute regression tests'],
      };
    }

    return {
      type: 'remediation_recommendation',
      ...parsed,
      confidence: parsed.confidence || finding?.confidence || 'ai-generated',
      aiEnhanced: true,
      provider: 'openai',
      model: result.model,
      sourceFindingIds: [finding?.findingId || finding?.id].filter(Boolean),
      sourceEvidenceIds: (evidence || []).map(e => e.evidence_id || e.id || e).filter(Boolean),
      disclaimer: 'AI recommendation — requires officer approval before any action is taken. This recommendation will not be executed automatically.',
    };
  }

  async generateHandover({ caseData, findings, timeline, evidence, completedActions, pendingActions }) {
    const { systemPrompt, userPrompt } = buildHandoverPrompt({
      caseData, findings, timeline, evidence, completedActions, pendingActions,
    });

    const result = await this._responsesRequest(systemPrompt, userPrompt);

    let parsed;
    try {
      parsed = this._parseJSON(result.content);
    } catch {
      parsed = {
        situation: result.content,
        evidenceCollected: 'See situation description.',
        investigationCompleted: 'See findings.',
        finding: 'See investigation results.',
        actionsAlreadyTaken: (completedActions || []).join('; ') || 'See timeline.',
        pendingActions: (pendingActions || []).join('; ') || 'None specified.',
        recommendedNextStep: 'Review the case and proceed.',
      };
    }

    return {
      type: 'handover_summary',
      ...parsed,
      confidence: parsed.confidence || 'ai-generated',
      aiEnhanced: true,
      provider: 'openai',
      model: result.model,
      sourceFindingIds: (findings || []).map(f => f.findingId || f.id).filter(Boolean),
      sourceEvidenceIds: (evidence || []).map(e => e.evidence_id || e.id || e).filter(Boolean),
    };
  }

  async analyzeAnomaly({ anomaly, provenanceRecords, evidenceIntegrityState, timeline }) {
    const { systemPrompt, userPrompt } = buildAnomalyPrompt({
      anomaly, provenanceRecords, evidenceIntegrityState, timeline,
    });

    const result = await this._responsesRequest(systemPrompt, userPrompt);

    let parsed;
    try {
      parsed = this._parseJSON(result.content);
    } catch {
      parsed = {
        whatHappened: result.content,
        whyUnusual: 'An anomaly was detected that requires investigation.',
        evidenceSupporting: 'Review the provenance records and evidence.',
        officerCheckNext: ['Review affected evidence', 'Verify provenance chain'],
      };
    }

    return {
      type: 'anomaly_analysis',
      ...parsed,
      confidence: parsed.confidence || 'ai-generated',
      aiEnhanced: true,
      provider: 'openai',
      model: result.model,
      sourceEvidenceIds: (evidenceIntegrityState || []).map(e => e.evidence_id || e.id).filter(Boolean),
      disclaimer: 'AI inference — requires officer verification.',
    };
  }
}
