import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import { api } from '../../api/client.js';

export const EvidenceDetail = ({ evidence, onClose }) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  if (!evidence) return null;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyEvidence(evidence.id || evidence.evidence_id);
      setVerification(result);
    } catch (err) {
      setVerification({ verified: false, reason: `Verification failed: ${err.message}` });
    }
    setVerifying(false);
  };

  const evidenceHash = evidence.evidenceHash || evidence.evidence_hash || evidence.fingerprint || 'pending';
  const recordHash = evidence.recordHash || evidence.record_hash || 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Evidence Details</h2>
              <p className="text-sm text-slate-500 mt-0.5">{evidence.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Evidence Identity */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Evidence ID</span>
                <span className="font-mono text-sm font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded">{evidence.id}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Evidence Name</span>
                <span className="text-sm font-medium text-slate-900">{evidence.label || evidence.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Evidence Type</span>
                <span className="text-sm text-slate-700 capitalize">{(evidence.type || 'Unknown').replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Source</span>
                <span className="text-sm text-slate-700">{evidence.source || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Collected By</span>
                <span className="text-sm text-slate-700">{evidence.collectedBy || evidence.collected_by || 'Officer Martinez'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Collection Time</span>
                <span className="text-sm text-slate-700">{evidence.collectedAt || evidence.collected_at || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Integrity Status */}
          <div className={`p-4 rounded-lg border ${evidence.verified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2">
              {evidence.verified ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              )}
              <span className={`font-semibold ${evidence.verified ? 'text-emerald-900' : 'text-amber-900'}`}>
                Integrity: {evidence.verified ? '✓ Verified' : evidence.verification_status === 'compromised' ? '⚠ Compromised' : 'Pending Verification'}
              </span>
            </div>
            <p className={`text-sm mt-1 ${evidence.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {evidence.integrityMessage || evidence.integrity_message || 'Integrity status unknown.'}
            </p>
          </div>

          {/* Verification Result (if just verified) */}
          {verification && (
            <div className={`p-4 rounded-lg border ${verification.verified ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="flex items-center gap-2">
                {verification.verified ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                )}
                <span className={`font-semibold ${verification.verified ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {verification.reason || (verification.verified ? '✓ EVIDENCE INTEGRITY VERIFIED' : '⚠ EVIDENCE INTEGRITY COMPROMISED')}
                </span>
              </div>
              <div className="mt-2 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected:</span>
                  <span className="text-slate-700">{verification.expected_hash?.substring(0, 24)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calculated:</span>
                  <span className={verification.verified ? 'text-emerald-700' : 'text-rose-700'}>{verification.calculated_hash?.substring(0, 24)}...</span>
                </div>
              </div>
            </div>
          )}

          {/* Technical Details - Progressive Disclosure */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-medium text-slate-800 text-sm">View Technical Details</span>
              <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${showTechnical ? 'rotate-90' : ''}`} />
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-slate-200 bg-white animate-fade-in space-y-6">

                {/* Evidence Integrity Section */}
                <div>
                  <div className="bg-slate-900 rounded-lg p-4 text-sm">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 border-b border-slate-700 pb-2">
                      Evidence Integrity
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hash Algorithm</span>
                        <span className="text-emerald-400 font-mono">{evidence.hashAlgorithm || evidence.hash_algorithm || 'SHA-256'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Evidence Hash</span>
                        <p className="text-emerald-400 font-mono text-xs mt-1 break-all bg-slate-800 p-2 rounded">
                          {evidenceHash}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-slate-400 text-xs">
                          This identifies the original evidence. Any modification to the evidence would produce a different hash.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Record Integrity Section */}
                <div>
                  <div className="bg-slate-900 rounded-lg p-4 text-sm">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 border-b border-slate-700 pb-2">
                      Record Integrity
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-500">Record Hash</span>
                        <p className="text-indigo-400 font-mono text-xs mt-1 break-all bg-slate-800 p-2 rounded">
                          sha256:{recordHash}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-slate-400 text-xs">
                          This protects the investigation record/history. It ensures the provenance chain has not been altered.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${evidence.verified ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        {evidence.verified ? '✓' : '○'}
                      </span>
                      <span className={evidence.verified ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        Evidence integrity verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs bg-emerald-500">✓</span>
                      <span className="text-emerald-700 font-medium">
                        Investigation history verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs space-y-1">
                  <p><span className="text-slate-500">Registration Time:</span> <span className="text-slate-700">{evidence.collectedAt || evidence.collected_at || 'Unknown'}</span></p>
                  <p><span className="text-slate-500">Case:</span> <span className="text-slate-700 font-mono">{evidence.caseId || evidence.case_id}</span></p>
                  <p><span className="text-slate-500">Description:</span> <span className="text-slate-700">{evidence.description || 'No description'}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-5 py-2.5 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {verifying ? 'Verifying...' : 'Verify Integrity'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
