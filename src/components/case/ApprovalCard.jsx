import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { ShieldCheck } from 'lucide-react';

export const ApprovalCard = ({ change, risk, impact, rollbackAvailable, onApprove }) => {
  const getRiskStatus = (r) => {
    const rLower = (r || '').toLowerCase();
    if (rLower.includes('high')) return 'failed';
    if (rLower.includes('medium')) return 'attention';
    return 'active';
  };

  return (
    <Card className="border-amber-200 shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
      
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm">Remediation Ready</h3>
        <StatusBadge status="attention" label="Awaiting Approval" size="sm" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Recommended Fix</span>
          <span className="text-slate-900 font-medium">{change}</span>
        </div>
        
        <div className="p-3">
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Risk Level</span>
          <StatusBadge status={getRiskStatus(risk)} label={risk || 'Unknown'} size="sm" />
        </div>
        
        <div className="p-3">
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Rollback Available</span>
          <span className={`font-medium ${rollbackAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
            {rollbackAvailable ? 'Yes — rollback strategy in place' : 'No'}
          </span>
        </div>

        <div className="col-span-1 md:col-span-2 p-3">
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Expected Impact</span>
          <span className="text-slate-800">{impact}</span>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-800">
          <strong>Independent verification required.</strong> FPC–SORVAX will automatically verify the fix after it is applied.
        </p>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button 
          onClick={onApprove}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-8 py-3 font-bold transition-colors w-full md:w-auto shadow-sm"
        >
          Approve & Apply
        </button>
      </div>
    </Card>
  );
};
