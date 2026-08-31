import React from 'react';
import { Check } from 'lucide-react';

export function Stepper({ steps, activeStepId, onStepClick, orientation = 'vertical' }) {
  const isHorizontal = orientation === 'horizontal';
  const totalSteps = steps.length;

  if (isHorizontal) {
    return (
      <div className="overflow-x-auto">
        {/* Single grid container for both circles and labels */}
        <div
          className="grid items-center"
          style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
        >
          {/* Row 1: Connectors + Circles */}
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isActive = step.id === activeStepId || step.status === 'active';
            const isClickable = isCompleted || isActive;

            return (
              <div key={`circle-${step.id}`} className="flex flex-col items-center">
                {/* Connector (left half) + Circle + Connector (right half) */}
                <div className="flex items-center w-full">
                  {/* Left connector */}
                  {index > 0 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        steps[index - 1].status === 'completed'
                          ? 'bg-emerald-500'
                          : steps[index - 1].status === 'pending'
                            ? 'border-t-2 border-dashed border-slate-200 bg-transparent'
                            : 'bg-slate-200'
                      }`}
                    />
                  )}
                  {index === 0 && <div className="flex-1" />}

                  {/* Circle button */}
                  <button
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    disabled={!isClickable}
                    className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors shrink-0
                      ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                        isActive ? 'bg-white border-indigo-600 text-indigo-600' :
                        'bg-white border-slate-200 text-slate-400'}
                      ${isClickable ? 'cursor-pointer hover:ring-2 ring-offset-2 ring-indigo-200' : 'cursor-default'}
                    `}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
                    {isActive && <div className="absolute -inset-1.5 rounded-full border border-indigo-400 animate-ping opacity-20"></div>}
                  </button>

                  {/* Right connector */}
                  {index < totalSteps - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : step.status === 'pending'
                            ? 'border-t-2 border-dashed border-slate-200 bg-transparent'
                            : 'bg-slate-200'
                      }`}
                    />
                  )}
                  {index === totalSteps - 1 && <div className="flex-1" />}
                </div>
              </div>
            );
          })}

          {/* Row 2: Labels — same grid, same columns */}
          {steps.map((step, index) => {
            const isActive = step.id === activeStepId || step.status === 'active';
            const isCompleted = step.status === 'completed';

            return (
              <div key={`label-${step.id}`} className="flex justify-center mt-2 px-0.5">
                <p className={`text-xs font-medium text-center leading-tight whitespace-nowrap ${
                  isActive ? 'text-indigo-700' :
                  isCompleted ? 'text-slate-900' :
                  'text-slate-400'
                }`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical mode — unchanged
  return (
    <div className="flex flex-col">
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isActive = step.id === activeStepId || step.status === 'active';
        const isPending = step.status === 'pending';
        const isLast = index === steps.length - 1;
        const isClickable = isCompleted || isActive;

        return (
          <div
            key={step.id}
            className="flex flex-row items-start min-h-[60px]"
          >
            <div className="flex flex-col items-center h-full">
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors shrink-0
                  ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                    isActive ? 'bg-white border-indigo-600 text-indigo-600' :
                    'bg-white border-slate-200 text-slate-400'}
                  ${isClickable ? 'cursor-pointer hover:ring-2 ring-offset-2 ring-indigo-200' : 'cursor-default'}
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
                {isActive && <div className="absolute -inset-1.5 rounded-full border border-indigo-400 animate-ping opacity-20"></div>}
              </button>

              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1
                    ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}
                    ${isPending ? 'border-dashed border-t-2 border-slate-200 bg-transparent' : ''}
                  `}
                />
              )}
            </div>

            <div className="ml-4 pb-4">
              <p className={`text-sm font-medium ${isActive ? 'text-indigo-700' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(step.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
