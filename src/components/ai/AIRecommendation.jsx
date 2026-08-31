import React, { useState, useEffect } from 'react';
import { AICard } from './AICard';
import { StatusBadge } from '../ui/StatusBadge';
import { api } from '../../api/client.js';

/**
 * AIRecommendation - Displays AI-generated remediation recommendation.
 *
 * If findingId is provided, fetches real AI recommendation from backend.
 * Otherwise falls back to static props.
 */
export const AIRecommendation = ({ recommendation, rationale, expectedResult, risk, findingId }) => {
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!findingId) return;
    setLoading(true);
    api.recommendRemediation(findingId)
      .then(result => { setAiResult(result); setLoading(false); })
      .catch(() => setLoading(false));
  }, [findingId]);

  const data = aiResult || {};
  const rec = data.recommendedAction || recommendation;
  const rat = data.rationale || rationale;
  const exp = data.expectedSecurityImprovement || expectedResult;
  const rsk = data.potentialRisks ? `Risk: ${data.potentialRisks}` : risk;

  const getRiskStatus = (r) => {
    const rLower = (r || '').toLowerCase();
    if (rLower.includes('high')) return 'failed';
    if (rLower.includes('medium')) return 'attention';
    return 'active';
  };

  if (loading) {
    return (
      <AICard title="Recommended Action" subtitle="Generating recommendation...">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          <span className="text-sm">AI analyzing finding...</span>
        </div>
      </AICard>
    );
  }

  return (
    <AICard
      title="Recommended Action"
      subtitle="AI-assisted recommendation"
      provider={aiResult}
    >
      <div className="space-y-5">
        <div>
          <h5 className="text-sm font-semibold text-slate-900 mb-2">What to do</h5>
          <p className="text-lg font-medium text-slate-900 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
            {rec}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-100">
            <h5 className="text-sm font-semibold text-slate-900 mb-1">Why this fix?</h5>
            <p className="text-sm text-slate-600">{rat}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-100">
            <h5 className="text-sm font-semibold text-slate-900 mb-1">Expected result</h5>
            <p className="text-sm text-slate-600">{exp}</p>
          </div>
        </div>
        
        {data.verificationStepsAfterRemediation && data.verificationStepsAfterRemediation.length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-slate-100">
            <h5 className="text-sm font-semibold text-slate-900 mb-2">Verification Steps After Remediation</h5>
            <ul className="text-sm text-slate-600 space-y-1">
              {data.verificationStepsAfterRemediation.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Risk level:</span>
            <StatusBadge status={getRiskStatus(rsk)} label={rsk || 'Low'} size="sm" />
          </div>
        </div>

        {data.disclaimer && (
          <p className="text-xs text-amber-600 font-medium border-t border-indigo-100 pt-3">
            {data.disclaimer}
          </p>
        )}
        <p className="text-xs text-slate-500 italic">
          FPC–SORVAX will verify the result independently after the fix is applied.
        </p>
        {data.correlationId && (
          <p className="text-[10px] text-slate-400 font-mono">Correlation ID: {data.correlationId}</p>
        )}
      </div>
    </AICard>
  );
};
