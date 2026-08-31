import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export function ProgressSteps({ steps }) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isActive = step.status === 'active';
        
        return (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-400 w-4">{index + 1}.</span>
            <div className="flex items-center justify-center w-6 h-6">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : isActive ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <span className={`text-sm font-medium ${isActive ? 'text-indigo-700' : isCompleted ? 'text-slate-700' : 'text-slate-500'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
