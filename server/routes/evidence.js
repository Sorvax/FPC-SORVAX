import { Router } from 'express';
import { registerEvidence, getEvidence, getEvidenceForCase, getAllEvidence, verifyEvidence, simulateTamper } from '../services/evidence.js';

const router = Router();

// GET /api/evidence - List all evidence items
router.get('/', (req, res) => {
  try {
    const items = getAllEvidence();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve evidence', detail: err.message });
  }
});

// GET /api/evidence/:id - Get a single evidence item
router.get('/:id', (req, res) => {
  try {
    const item = getEvidence(req.params.id);
    if (!item) return res.status(404).json({ error: 'Evidence not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve evidence', detail: err.message });
  }
});

// POST /api/evidence/case/:caseId - Register new evidence for a case
router.post('/case/:caseId', (req, res) => {
  try {
    const { caseId } = req.params;
    const { name, type, source, collectedBy, content, description, contentEncoding, fileName, fileSize, mimeType } = req.body;
    if (!name) return res.status(400).json({ error: 'Evidence name is required' });
    if (!content) return res.status(400).json({ error: 'Evidence content is required' });

    const evidence = registerEvidence({
      caseId,
      name,
      type,
      source,
      collectedBy,
      content,
      description,
      contentEncoding,
      fileName,
      fileSize,
      mimeType,
    });

    res.status(201).json(evidence);
  } catch (err) {
    res.status(500).json({ error: 'Failed to register evidence', detail: err.message });
  }
});

// GET /api/cases/:caseId/evidence - Get evidence for a case
router.get('/case/:caseId', (req, res) => {
  try {
    const items = getEvidenceForCase(req.params.caseId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve evidence', detail: err.message });
  }
});

// POST /api/evidence/:id/verify - Verify evidence integrity
router.post('/:id/verify', (req, res) => {
  try {
    const result = verifyEvidence(req.params.id);
    if (result.status === 'error') return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Verification failed', detail: err.message });
  }
});

// POST /api/evidence/:id/tamper - Simulate tamper (demo only)
router.post('/:id/tamper', (req, res) => {
  try {
    const result = simulateTamper(req.params.id);
    if (result.status === 'error') return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Tamper simulation failed', detail: err.message });
  }
});

export default router;
