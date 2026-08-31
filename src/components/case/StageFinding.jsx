import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StageFinding = ({ finding, caseId }) => {
  const { evidenceItems, setEvidenceDetail } = useApp();

  if (!finding) return null;

  const getSeverityStatus = (sev) => {
    if (sev === 'high') return 'failed';
    if (sev === 'medium') return 'attention';
    return 'active';
  };

  const getStatusBadge = (status) => {
    if (status === 'open') return 'attention';
    if (status === 'resolved') return 'completed';
    return 'pending';
  };

  // Get supporting evidence items
  const supportingEvidenceIds = finding.supportingEvidence || ['E-001', 'E-003', 'E-005'];
  const supportingEvidence = supportingEvidenceIds.map(id => {
    const item = evidenceItems.find(e => e.id === id);
    return item || { id, label: id, type: 'unknown', verified: false };
  });

  const handleEvidenceClick = (item) => {
    setEvidenceDetail(item);
  };

  return (
    <div className="space-y-6">
      <Card className="border-rose-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>

        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-rose-500" size={20} />
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm">Security Issue Found</h3>
        </div>

        <div className="mb-6">
          <h4 className="text-2xl font-bold text-slate-900 mb-2">{finding.name}</h4>
          <p className="text-slate-600 leading-relaxed">{finding.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Severity</span>
            <StatusBadge status={getSeverityStatus(finding.severity)} label={finding.severity.toUpperCase()} size="sm" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Affected</span>
            <span className="text-slate-800 font-medium text-sm">{finding.affected}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Status</span>
            <StatusBadge status={getStatusBadge(finding.status)} label={finding.status.toUpperCase()} size="sm" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Evidence</span>
            <span className="text-slate-800 font-medium text-sm">{finding.evidenceCount || supportingEvidence.length} verified items</span>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
          <span className="text-sm font-semibold text-indigo-900 block mb-1">Recommended Action</span>
          <p className="text-indigo-800 text-sm">{finding.recommendedAction}</p>
        </div>

        {/* Supporting Evidence */}
        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Supporting Evidence</h4>
          <div className="space-y-2">
            {supportingEvidence.map((ev) => (
              <button
                key={ev.id}
                onClick={() => handleEvidenceClick(ev)}
                className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">{ev.id}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{ev.label || ev.id}</p>
                    {ev.type && <p className="text-xs text-slate-500 uppercase">{ev.type}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ev.verified ? (
                    <span className="text-xs text-emerald-600 font-medium">✓ Verified</span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Pending</span>
                  )}
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
