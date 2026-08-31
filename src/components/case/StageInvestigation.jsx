import React from 'react';
import { ExpandableSection } from '../ui/ExpandableSection';
import { AICard } from '../ai/AICard';
import { Search, Lightbulb, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StageInvestigation = ({ investigation, caseId }) => {
  const { evidenceItems, setEvidenceDetail } = useApp();

  if (!investigation) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm text-center">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-900 mb-1">Investigation Not Yet Started</h4>
          <p className="text-sm text-slate-500">The investigation will begin once evidence is collected and verified.</p>
        </div>
      </div>
    );
  }

  const handleEvidenceClick = (evId) => {
    const item = evidenceItems.find(e => e.id === evId);
    if (item) {
      setEvidenceDetail(item);
    }
  };

  return (
    <div className="space-y-8">
      {/* What We Found */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm">What Did We Find</h3>
        </div>
        <p className="text-lg text-slate-800 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          {investigation.finding}
        </p>
      </section>

      {/* What Caused It */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm">Likely Cause</h3>
        </div>
        <p className="text-md text-slate-700 leading-relaxed bg-amber-50 p-5 rounded-xl border border-amber-100">
          {investigation.cause}
        </p>
      </section>

      {/* Supporting Evidence */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm mb-3">Supporting Evidence</h3>
        <div className="space-y-2">
          {investigation.supportingEvidence && investigation.supportingEvidence.map((evId, idx) => {
            const item = evidenceItems.find(e => e.id === evId);
            return (
              <button
                key={idx}
                onClick={() => handleEvidenceClick(evId)}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left group w-full"
              >
                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">{evId}</span>
                <span className="text-sm text-slate-700">{item?.label || evId}</span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors ml-auto" />
              </button>
            );
          })}
        </div>
      </section>

      {/* AI Analysis */}
      <AICard title="AI Investigation Summary" confidence={investigation.confidence} subtitle="What did the system find?">
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-semibold text-slate-900 mb-1">What the system found</h5>
            <p className="text-slate-700 text-sm">{investigation.finding}</p>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-900 mb-1">Likely cause</h5>
            <p className="text-slate-700 text-sm">{investigation.cause}</p>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-900 mb-2">Supporting evidence</h5>
            <div className="flex flex-wrap gap-1.5">
              {investigation.supportingEvidence?.map((evId, idx) => (
                <span key={idx} className="font-mono text-xs bg-white text-indigo-700 border border-indigo-100 px-2 py-1 rounded">
                  {evId}
                </span>
              ))}
            </div>
          </div>

          {investigation.aiReasoning && (
            <ExpandableSection title="View AI reasoning">
              <div className="bg-white/50 p-4 rounded-lg text-sm text-slate-600 border border-indigo-100">
                {investigation.aiReasoning}
              </div>
            </ExpandableSection>
          )}
        </div>
      </AICard>

      {/* Next Recommended Step */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-indigo-600 font-bold text-sm">→</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Next Recommended Step</span>
          <p className="text-sm font-medium text-indigo-900 mt-0.5">Review the security finding and remediation recommendation.</p>
        </div>
      </div>
    </div>
  );
};
