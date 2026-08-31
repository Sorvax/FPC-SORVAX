import { Router } from 'express';
import { getCase, getCases, createCase, updateCase, getCaseIntegrity, transferCase } from '../services/case.js';

const router = Router();

// GET /api/cases - List all cases
router.get('/', (req, res) => {
  try {
    const cases = getCases();
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve cases', detail: err.message });
  }
});

// POST /api/cases - Create a new case
router.post('/', (req, res) => {
  try {
    const { caseNumber, title, subtitle, description, severity, system, assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const newCase = createCase({ caseNumber, title, subtitle, description, severity, system, assignedTo });
    res.status(201).json(newCase);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create case', detail: err.message });
  }
});

// GET /api/cases/:id - Get a single case
router.get('/:id', (req, res) => {
  try {
    const caseData = getCase(req.params.id);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    res.json(caseData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve case', detail: err.message });
  }
});

// PUT /api/cases/:id - Update a case
router.put('/:id', (req, res) => {
  try {
    const caseData = getCase(req.params.id);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    const updated = updateCase(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update case', detail: err.message });
  }
});

// GET /api/cases/:id/integrity - Get case integrity summary
router.get('/:id/integrity', (req, res) => {
  try {
    const integrity = getCaseIntegrity(req.params.id);
    res.json(integrity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify integrity', detail: err.message });
  }
});

// POST /api/cases/:id/transfer - Transfer case to another officer
router.post('/:id/transfer', (req, res) => {
  try {
    const caseData = getCase(req.params.id);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    const { receivingOfficer, receivingDepartment, reason } = req.body;
    if (!receivingOfficer) return res.status(400).json({ error: 'receivingOfficer is required' });
    const result = transferCase(req.params.id, {
      receivingOfficer,
      receivingDepartment: receivingDepartment || receivingOfficer,
      reason: reason || 'Case transfer',
      previousOfficer: caseData.assignedTo,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transfer case', detail: err.message });
  }
});

export default router;
