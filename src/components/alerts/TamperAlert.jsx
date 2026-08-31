import React, { useState } from 'react';
import { AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { api } from '../../api/client.js';

export const TamperAlert = ({ caseId, onInvestigate }) => {
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const handleSimulateTamper = async () => {
    setSimulating(true);
    try {
      // Tamper the first evidence item of this case
      const evidence = await api.getEvidenceForCase(caseId);
      if (evidence.length > 0) {
        const result = await api.simulateTamper(evidence[0].id);
        setSimResult(result);
      }
    } catch (err) {
      console.error('Tamper simulation failed:', err);
    }
    setSimulating(false);
  };

  return (
    <div className="border-l-4 border-rose-500 bg-rose-50 rounded-r-xl shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex gap-4">
        <div className="shrink-0 mt-1">
          <AlertTriangle className="text-rose-600" size={28} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-rose-900 mb-1">⚠ INTEGRITY ISSUE DETECTED</h3>
          <p className="text-rose-800 font-medium mb-2">An evidence record does not match its original verified fingerprint.</p>
          <div className="text-sm text-rose-700 space-y-1">
            <p><strong>Case:</strong> <span className="font-mono bg-rose-200/50 px-1 rounded">{caseId}</span></p>
            {simResult && (
              <p><strong>Affected Evidence:</strong> <span className="font-mono">{simResult.evidence_id}</span></p>
            )}
            <p className="mt-2 text-slate-600">Cryptographic verification detected the mismatch. Investigation is available to help understand what happened.</p>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-2">
        <button
          onClick={onInvestigate}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-6 py-2.5 font-medium transition-colors shadow-sm whitespace-nowrap w-full md:w-auto"
        >
          Investigate
        </button>
        <button
          onClick={handleSimulateTamper}
          disabled={simulating}
          className="flex items-center justify-center gap-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap w-full md:w-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
          Simulate Integrity Failure
        </button>
      </div>
    </div>
  );
};
