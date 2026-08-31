import React from 'react';
import { ProgressSteps } from '../ui/ProgressSteps';
import { ExpandableSection } from '../ui/ExpandableSection';

export const StageFixProgress = ({ steps, onViewLog }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm mb-4">APPLYING FIX</h3>
      
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <ProgressSteps steps={steps || []} />
        
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
          <button 
            onClick={onViewLog}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 font-medium text-sm transition-colors"
          >
            View Technical Log
          </button>
        </div>

        <div className="mt-4">
          <ExpandableSection title="Terminal Output">
            <div className="bg-slate-900 p-4 rounded-lg text-emerald-400 font-mono text-sm overflow-x-auto whitespace-pre">
{`> Initializing deployment sequence... OK
> Verifying target system state... OK
> Creating backup point [BKP-29384]... OK
> Applying patch bundle fix-cve-2026-001.pkg... 
  [|||||||||||||||||||||||] 100%
> Restarting affected services... OK
> Running pre-flight checks... PASS
> Ready for full verification.`}
            </div>
          </ExpandableSection>
        </div>
      </div>
    </div>
  );
};
