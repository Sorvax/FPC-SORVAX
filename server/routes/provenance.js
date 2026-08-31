import { Router } from 'express';
import { getEventsForCase, getEventsForEvidence, verifyChain } from '../services/provenance.js';

const router = Router();

// GET /api/cases/:caseId/provenance - Get provenance events for a case
router.get('/case/:caseId', (req, res) => {
  try {
    const events = getEventsForCase(req.params.caseId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve provenance events', detail: err.message });
  }
});

// POST /api/cases/:caseId/provenance/verify - Verify provenance chain
router.post('/case/:caseId/verify', (req, res) => {
  try {
    const result = verifyChain(req.params.caseId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Chain verification failed', detail: err.message });
  }
});

// GET /api/evidence/:evidenceId/provenance - Get provenance events for evidence
router.get('/evidence/:evidenceId', (req, res) => {
  try {
    const events = getEventsForEvidence(req.params.evidenceId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve provenance events', detail: err.message });
  }
});

export default router;
