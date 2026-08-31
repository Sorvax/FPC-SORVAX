/**
 * AI API Routes
 *
 * POST /api/ai/cases/:caseId/summary       - Case summary
 * POST /api/ai/findings/:findingId/explain  - Finding explanation
 * POST /api/ai/findings/:findingId/remediation - Remediation recommendation
 * POST /api/ai/cases/:caseId/handover       - Handover summary
 * POST /api/ai/anomalies/analyze            - Anomaly analysis
 * GET  /api/ai/provider                     - Current provider info
 *
 * All AI calls happen server-side. API keys never reach the frontend.
 */

import { Router } from 'express';
import {
  generateCaseSummary,
  explainFinding,
  recommendRemediation,
  generateHandover,
  analyzeAnomaly,
  getAIProviderInfo,
  getAIProviderStatus,
} from '../services/ai/AIService.js';
import { getCase } from '../services/case.js';
import { getEvidenceForCase, getEvidence } from '../services/evidence.js';
import { getEventsForCase } from '../services/provenance.js';
import { getLatestInvestigation, getInvestigationEvents, getFindings, getFindingsForInvestigation } from '../services/investigation.js';
import { getDb } from '../db.js';

const router = Router();

// GET /api/ai/provider - Get current AI provider info and status
router.get('/provider', (req, res) => {
  try {
    const info = getAIProviderInfo();
    const status = getAIProviderStatus();
    res.json({
      ...info,
      ...status,
      // Never expose API key or key fragments
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI provider info', detail: err.message });
  }
});

// POST /api/ai/cases/:caseId/summary - Generate case summary
router.post('/cases/:caseId/summary', async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const evidence = getEvidenceForCase(caseId);
    const events = getEventsForCase(caseId);
    const investigation = getLatestInvestigation(caseId);
    const findings = investigation ? getFindings(caseId, investigation.investigationId) : [];

    const verificationStatus = evidence.every(e => e.verified) ? 'VERIFIED'
      : evidence.some(e => e.verification_status === 'compromised') ? 'COMPROMISED'
      : 'PENDING';

    const result = await generateCaseSummary(caseId, {
      caseData, evidence, timeline: events, findings, verificationStatus,
    });

    res.json(result);
  } catch (err) {
    console.error('AI case summary failed:', err);
    res.status(500).json({ error: 'AI case summary failed', detail: err.message });
  }
});

// POST /api/ai/findings/:findingId/explain - Explain a finding
router.post('/findings/:findingId/explain', async (req, res) => {
  try {
    const { findingId } = req.params;
    const db = getDb();

    // Find the finding
    const findingRow = db.prepare('SELECT * FROM findings WHERE finding_id = ?').get(findingId);
    if (!findingRow) return res.status(404).json({ error: 'Finding not found' });

    const caseId = findingRow.case_id;
    const finding = {
      findingId: findingRow.finding_id,
      id: findingRow.finding_id,
      title: findingRow.title,
      description: findingRow.description,
      severity: findingRow.severity,
      confidence: findingRow.confidence,
      affectedAsset: findingRow.affected_asset,
      recommendedNextStep: findingRow.recommended_next_step,
    };

    const supportingEvidenceIds = JSON.parse(findingRow.supporting_evidence_json || '[]');
    const supportingEvidence = supportingEvidenceIds.map(id => getEvidence(id)).filter(Boolean);

    const events = getEventsForCase(caseId);
    const investigation = getLatestInvestigation(caseId);
    const investigationEvents = investigation
      ? getInvestigationEvents(caseId, investigation.investigationId)
      : [];

    const result = await explainFinding(caseId, findingId, {
      finding,
      supportingEvidence,
      supportingEvents: investigationEvents,
      timeline: events,
      severity: findingRow.severity,
      confidence: findingRow.confidence,
    });

    res.json(result);
  } catch (err) {
    console.error('AI finding explanation failed:', err);
    res.status(500).json({ error: 'AI finding explanation failed', detail: err.message });
  }
});

// POST /api/ai/findings/:findingId/remediation - Recommend remediation
router.post('/findings/:findingId/remediation', async (req, res) => {
  try {
    const { findingId } = req.params;
    const db = getDb();

    const findingRow = db.prepare('SELECT * FROM findings WHERE finding_id = ?').get(findingId);
    if (!findingRow) return res.status(404).json({ error: 'Finding not found' });

    const caseId = findingRow.case_id;
    const finding = {
      findingId: findingRow.finding_id,
      id: findingRow.finding_id,
      title: findingRow.title,
      description: findingRow.description,
      severity: findingRow.severity,
      confidence: findingRow.confidence,
      affectedAsset: findingRow.affected_asset,
      recommendedNextStep: findingRow.recommended_next_step,
    };

    const supportingEvidenceIds = JSON.parse(findingRow.supporting_evidence_json || '[]');
    const evidence = supportingEvidenceIds.map(id => getEvidence(id)).filter(Boolean);
    const timeline = getEventsForCase(caseId);

    const result = await recommendRemediation(caseId, {
      finding,
      evidence,
      timeline,
      affectedSystem: findingRow.affected_asset,
    });

    res.json(result);
  } catch (err) {
    console.error('AI remediation recommendation failed:', err);
    res.status(500).json({ error: 'AI remediation recommendation failed', detail: err.message });
  }
});

// POST /api/ai/cases/:caseId/handover - Generate handover summary
router.post('/cases/:caseId/handover', async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const evidence = getEvidenceForCase(caseId);
    const events = getEventsForCase(caseId);
    const investigation = getLatestInvestigation(caseId);
    const findings = investigation ? getFindings(caseId, investigation.investigationId) : [];

    // Build completed/pending actions from case state
    const completedActions = [];
    const pendingActions = [];
    const stages = caseData.stages || [];

    for (const stage of stages) {
      if (stage.status === 'completed') {
        completedActions.push(`${stage.label} completed`);
      } else if (stage.status === 'active') {
        pendingActions.push(`${stage.label} in progress`);
      } else {
        pendingActions.push(`${stage.label} pending`);
      }
    }

    const result = await generateHandover(caseId, {
      caseData, findings, timeline: events, evidence, completedActions, pendingActions,
    });

    res.json(result);
  } catch (err) {
    console.error('AI handover generation failed:', err);
    res.status(500).json({ error: 'AI handover generation failed', detail: err.message });
  }
});

// POST /api/ai/anomalies/analyze - Analyze an anomaly
router.post('/anomalies/analyze', async (req, res) => {
  try {
    const { caseId, anomalyType, evidenceId } = req.body || {};
    if (!caseId) return res.status(400).json({ error: 'caseId is required' });

    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const evidence = getEvidenceForCase(caseId);
    const events = getEventsForCase(caseId);

    const anomaly = {
      caseId,
      type: anomalyType || 'integrity_failure',
      evidenceId: evidenceId || null,
      description: `Anomaly detected on case ${caseId}`,
    };

    const result = await analyzeAnomaly(caseId, {
      anomaly,
      provenanceRecords: events,
      evidenceIntegrityState: evidence,
      timeline: events,
    });

    res.json(result);
  } catch (err) {
    console.error('AI anomaly analysis failed:', err);
    res.status(500).json({ error: 'AI anomaly analysis failed', detail: err.message });
  }
});

export default router;
