import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { ChevronRight } from 'lucide-react';

export const CaseCard = ({ caseData, onClick }) => {
  const getSeverityStatus = (severity) => {
    if (severity === 'high') return 'failed';
    if (severity === 'medium') return 'attention';
    return 'active';
  };

  return (
    <div onClick={() => onClick && onClick(caseData.id)} className="cursor-pointer transition-shadow hover:shadow-md">
      <Card
        title={caseData.title}
        subtitle={caseData.subtitle}
        headerAction={<span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{caseData.id}</span>}
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={getSeverityStatus(caseData.severity)} label={caseData.severity.toUpperCase()} size="sm" />
            <span className="text-sm text-slate-500">System: {caseData.system || 'Unknown'}</span>
            <span className="text-sm text-slate-500">Officer: {caseData.assignedTo || 'Unassigned'}</span>
          </div>
          
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              {caseData.stages && caseData.stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center gap-1.5">
                  <div 
                    className={`w-2.5 h-2.5 rounded-full ${
                      stage.status === 'completed' ? 'bg-emerald-500' :
                      stage.status === 'active' ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-300'
                    }`}
                    title={stage.label}
                  />
                  {idx < caseData.stages.length - 1 && <div className="w-4 h-px bg-slate-200" />}
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Open Case <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
