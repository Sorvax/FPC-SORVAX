import React, { useState, useEffect } from 'react';
import { AICard } from './AICard';
import { api } from '../../api/client.js';

/**
 * AIInvestigationSummary - Displays AI-generated case summary.
 *
 * Attempts to fetch a real AI summary from the backend.
 * Falls back to deterministic data from the case if the AI call fails.
 */
export const AIInvestigationSummary = ({ caseData }) => {
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!caseData?.id) return;

    setLoading(true);
    setError(null);

    api.getAICaseSummary(caseData.id)
      .then(result => {
        setAiSummary(result);
        setLoading(false);
      })
      .catch(err => {
        console.warn('AI summary fetch failed, using fallback:', err.message);
        setError(err.message);
        setLoading(false);
      });
  }, [caseData?.id]);

  if (!caseData) {
    return (
      <AICard title="Investigation Summary" subtitle="AI-generated case summary">
        <p className="text-slate-600 text-sm italic">Summary not available yet.</p>
      </AICard>
    );
  }

  // If AI summary is available, use it
  if (aiSummary) {
    return (
      <AICard
        title="Case Summary"
        subtitle="AI-generated summary for handover"
        confidence={aiSummary.confidence}
        provider={aiSummary}
      >
        <div className="space-y-3">
          {aiSummary.situation && (
            <p className="text-slate-700 leading-relaxed text-sm">
              <strong className="text-slate-900">Situation:</strong> {aiSummary.situation}
            </p>
          )}
          {aiSummary.importantEvidence && aiSummary.importantEvidence.length > 0 && (
            <div>
              <strong className="text-slate-900 text-sm">Important Evidence:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {aiSummary.importantEvidence.map(ev => (
                  <span key={ev.id} className="font-mono text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{ev.id}</span>
                ))}
              </div>
            </div>
          )}
          {aiSummary.recommendedNextStep && (
            <p className="text-slate-700 leading-relaxed text-sm">
              <strong className="text-slate-900">Recommended Next Step:</strong> {aiSummary.recommendedNextStep}
            </p>
          )}
          {aiSummary.correlationId && (
            <p className="text-[10px] text-slate-400 font-mono mt-2">Correlation ID: {aiSummary.correlationId}</p>
          )}
        </div>
      </AICard>
    );
  }

  // Loading state
  if (loading) {
    return (
      <AICard title="Case Summary" subtitle="Generating AI summary...">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          <span className="text-sm">Analyzing case data...</span>
        </div>
      </AICard>
    );
  }

  // Fallback: deterministic case data
  const { finding, investigation, detection, remediation } = caseData;
  return (
    <AICard title="Case Summary" subtitle="Case data summary (AI unavailable)">
      <div className="space-y-3">
        <p className="text-slate-700 leading-relaxed text-sm">
          <strong className="text-slate-900">What happened:</strong> {detection?.description || 'An issue was detected.'}
        </p>
        {finding?.name && (
          <p className="text-slate-700 leading-relaxed text-sm">
            <strong className="text-slate-900">What was found:</strong> {finding.name} affecting {finding.affected || 'components'}. {investigation?.finding || ''}
          </p>
        )}
        {investigation?.cause && (
          <p className="text-slate-700 leading-relaxed text-sm">
            <strong className="text-slate-900">Root cause:</strong> {investigation.cause}
          </p>
        )}
        {remediation?.recommendation && (
          <p className="text-slate-700 leading-relaxed text-sm">
            <strong className="text-slate-900">Recommended action:</strong> {remediation.recommendation}
          </p>
        )}
      </div>
    </AICard>
  );
};
