import React, { useState, useEffect } from 'react';
import { AICard } from './AICard';
import { ExpandableSection } from '../ui/ExpandableSection';
import { api } from '../../api/client.js';

/**
 * AIAnomalyAnalysis - Displays AI-analyzed anomaly with real backend support.
 */
export const AIAnomalyAnalysis = ({ caseId, type }) => {
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    api.analyzeAnomaly({ caseId, anomalyType: type || 'integrity_failure' })
      .then(result => { setAiResult(result); setLoading(false); })
      .catch(() => setLoading(false));
  }, [caseId, type]);

  if (loading) {
    return (
      <AICard title="Anomaly Analysis" subtitle="Analyzing anomaly..." className="border-rose-200 bg-rose-50/30">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          <span className="text-sm">AI analyzing integrity issue...</span>
        </div>
      </AICard>
    );
  }

  const analysis = aiResult;

  return (
    <AICard
      title="Anomaly Analysis"
      subtitle="AI-assisted investigation of the integrity issue"
      confidence={analysis?.confidence || 'High'}
      provider={analysis}
      className="border-rose-200 bg-rose-50/30"
    >
      <div className="space-y-4">
        <p className="text-slate-700 text-sm">
          {analysis?.whatHappened || 'The system identified when the inconsistency appeared and related it to the case history. The stored investigation record no longer matches its original verified fingerprint.'}
        </p>

        {analysis?.whyUnusual && (
          <p className="text-slate-700 text-sm">
            <strong className="text-slate-900">Why unusual:</strong> {analysis.whyUnusual}
          </p>
        )}

        {analysis?.evidenceSupporting && (
          <p className="text-slate-700 text-sm">
            <strong className="text-slate-900">Evidence:</strong> {analysis.evidenceSupporting}
          </p>
        )}
        
        <ExpandableSection title="View analysis details">
          <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs space-y-2 overflow-x-auto">
            <p className="text-rose-400"># INTEGRITY MISMATCH DETECTED</p>
            <p>Target Case ID: {caseId}</p>
            {analysis?.officerCheckNext && analysis.officerCheckNext.map((step, i) => (
              <p key={i} className="text-indigo-400"># STEP {i + 1}: {step}</p>
            ))}
          </div>
        </ExpandableSection>

        {analysis?.correlationId && (
          <p className="text-[10px] text-slate-400 font-mono">Correlation ID: {analysis.correlationId}</p>
        )}
        {analysis?.disclaimer && (
          <p className="text-xs text-amber-600 font-medium">{analysis.disclaimer}</p>
        )}
      </div>
    </AICard>
  );
};
