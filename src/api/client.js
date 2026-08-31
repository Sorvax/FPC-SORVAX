/**
 * API Client for FPC-SORVAX backend
 * All backend communication goes through this module.
 */

const API_BASE = '/api';

async function request(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || 'Request failed');
  }
  return res.json();
}

// ─── Cases ──────────────────────────────────────
export const api = {
  // Cases
  getCases: () => request('GET', '/cases'),
  getCase: (id) => request('GET', `/cases/${id}`),
  createCase: (data) => request('POST', '/cases', data),
  updateCase: (id, data) => request('PUT', `/cases/${id}`, data),
  getCaseIntegrity: (id) => request('GET', `/cases/${id}/integrity`),

  // Evidence
  getAllEvidence: () => request('GET', '/evidence'),
  getEvidence: (id) => request('GET', `/evidence/${id}`),
  getEvidenceForCase: (caseId) => request('GET', `/evidence/case/${caseId}`),
  registerEvidence: (caseId, data) => request('POST', `/evidence/case/${caseId}`, data),
  verifyEvidence: (id) => request('POST', `/evidence/${id}/verify`),
  simulateTamper: (id) => request('POST', `/evidence/${id}/tamper`),

  /**
   * Upload a real evidence file.
   * Reads the file as base64 and sends it to the backend for SHA-256 hashing.
   */
  uploadEvidenceFile: async (caseId, file, metadata) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Extract base64 data from data URL
          const base64Data = reader.result.split(',')[1] || reader.result;
          const result = await request('POST', `/evidence/case/${caseId}`, {
            ...metadata,
            content: base64Data,
            contentEncoding: 'base64',
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // Provenance
  getProvenanceForCase: (caseId) => request('GET', `/provenance/case/${caseId}`),
  verifyProvenanceChain: (caseId) => request('POST', `/provenance/case/${caseId}/verify`),
  getProvenanceForEvidence: (evidenceId) => request('GET', `/provenance/evidence/${evidenceId}`),

  // Investigation
  runInvestigation: (caseId, options = {}) => request('POST', `/investigation/${caseId}/run`, options),
  getInvestigation: (caseId) => request('GET', `/investigation/${caseId}`),
  getInvestigationTimeline: (caseId) => request('GET', `/investigation/${caseId}/timeline`),
  getInvestigationFindings: (caseId) => request('GET', `/investigation/${caseId}/findings`),
  getCaseHandover: (caseId) => request('GET', `/investigation/${caseId}/handover`),

  // AI
  getAIProviderInfo: () => request('GET', '/ai/provider'),
  getAICaseSummary: (caseId) => request('POST', `/ai/cases/${caseId}/summary`),
  explainFinding: (findingId) => request('POST', `/ai/findings/${findingId}/explain`),
  recommendRemediation: (findingId) => request('POST', `/ai/findings/${findingId}/remediation`),
  getAIHandover: (caseId) => request('POST', `/ai/cases/${caseId}/handover`),
  analyzeAnomaly: (data) => request('POST', '/ai/anomalies/analyze', data),
};
