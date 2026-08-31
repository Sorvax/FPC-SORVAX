import React from 'react';
import { systemComponents } from '../data/system';
import { CheckCircle2, Clock, Activity } from 'lucide-react';

export const System = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
        <p className="text-slate-500 mt-1">Operational status of all FPC–SORVAX components</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systemComponents.map(comp => (
          <div key={comp.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">{comp.name}</h3>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">Operational</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-4 min-h-[40px]">
              {comp.description}
            </p>
            
            <div className="flex items-center text-xs text-slate-400 border-t border-slate-100 pt-3">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Last check: {comp.lastCheck || 'Just now'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
