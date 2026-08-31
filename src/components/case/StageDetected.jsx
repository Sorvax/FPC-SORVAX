import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { ExpandableSection } from '../ui/ExpandableSection';

export const StageDetected = ({ detection, severity }) => {
  if (!detection) return null;

  const getSeverityStatus = (sev) => {
    if (sev === 'high') return 'failed';
    if (sev === 'medium') return 'attention';
    return 'active';
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm">What Was Detected</h3>
      
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <p className="text-lg text-slate-800 font-medium mb-5">
          {detection.description}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Detected</span>
            <span className="text-slate-800">{detection.time || detection.date}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">System</span>
            <span className="text-slate-800">{detection.system || 'N/A'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Detection Method</span>
            <span className="text-slate-800">{detection.method}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Severity</span>
            <div className="mt-1">
              <StatusBadge status={getSeverityStatus(severity)} label={severity.toUpperCase()} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {detection.technicalDetails && (
        <ExpandableSection title="View technical details">
          <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            {Object.entries(detection.technicalDetails).map(([key, value]) => (
              <div key={key} className="mb-2 last:mb-0">
                <span className="text-slate-500">{key}: </span>
                <span className="text-emerald-400">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
};
