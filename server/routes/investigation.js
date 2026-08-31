import { Router } from 'express';
import {
  runInvestigation,
  getInvestigation,
  getLatestInvestigation,
  getInvestigationEvents,
  getFindings,
  getFindingsForInvestigation,
} from '../services/investigation.js';
import { getCase } from '../services/case.js';
import {
  summarizeInvestigation,
  explainCorrelation,
  generateCaseHandover,
} from '../services/ai.js';

const router = Router();

// POST /api/investigation/:caseId/run - Run an investigation on a case
router.post('/:caseId/run', (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const { adapter, scenario } = req.body || {};
    const result = runInvestigation(caseId, {
      adapterName: adapter || 'mock',
      scenario: scenario || 'suspicious-data-access',
    });

    res.json(result);
  } catch (err) {
    console.error('Investigation failed:', err);
    res.status(500).json({ error: 'Investigation failed', detail: err.message });
  }
});

// GET /api/investigation/:caseId - Get latest investigation for a case
router.get('/:caseId', (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const investigation = getLatestInvestigation(caseId);
    if (!investigation) {
      return res.status(404).json({ error: 'No investigation found for this case' });
    }

    // Enrich with AI summary (stub)
    const aiSummary = summarizeInvestigation(investigation);

    res.json({
      ...investigation,
      aiSummary,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve investigation', detail: err.message });
  }
});

// GET /api/investigation/:caseId/timeline - Get investigation timeline
router.get('/:caseId/timeline', (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const investigation = getLatestInvestigation(caseId);
    const events = getInvestigationEvents(caseId, investigation?.investigationId);

    res.json({
      caseId,
      investigationId: investigation?.investigationId || null,
      events,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve timeline', detail: err.message });
  }
});

// GET /api/investigation/:caseId/findings - Get findings for a case
router.get('/:caseId/findings', (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const investigation = getLatestInvestigation(caseId);
    const findings = getFindings(caseId, investigation?.investigationId);

    res.json({
      caseId,
      investigationId: investigation?.investigationId || null,
      findings,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve findings', detail: err.message });
  }
});

// POST /api/investigation/events - Ingest normalized events (future use)
router.post('/events', (req, res) => {
  try {
    const { events } = req.body;
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Events array is required' });
    }

    // Future: Accept events from external adapters (webhooks, streams, etc.)
    // For now, acknowledge receipt
    res.json({
      status: 'received',
      count: events.length,
      message: 'Events received. Ingestion pipeline not yet implemented.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process events', detail: err.message });
  }
});

// GET /api/investigation/:caseId/handover - Get AI-generated case handover
router.get('/:caseId/handover', (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const investigation = getLatestInvestigation(caseId);
    const findings = getFindings(caseId, investigation?.investigationId);
    const events = getInvestigationEvents(caseId, investigation?.investigationId);

    const handover = generateCaseHandover(caseData, findings, events);

    res.json(handover);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate handover', detail: err.message });
  }
});

export default router;
