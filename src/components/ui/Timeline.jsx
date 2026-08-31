import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function Timeline({ events }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const getDotColor = (type) => {
    switch(type) {
      case 'detection': return 'bg-amber-500';
      case 'evidence': return 'bg-sky-500';
      case 'verified': return 'bg-emerald-500';
      case 'investigation': return 'bg-indigo-500';
      case 'finding': return 'bg-rose-500';
      case 'recommendation': return 'bg-violet-500';
      case 'system': return 'bg-slate-400';
      default: return 'bg-slate-300';
    }
  };

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6 py-2">
      {events.map((event, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div key={index} className="relative animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <div className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white ring-1 ring-slate-200 ${getDotColor(event.type)}`} />
            
            <button 
              onClick={() => toggleExpand(index)}
              className="w-full text-left group"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-500 w-12 shrink-0">{event.time}</span>
                <h4 className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  {event.title}
                  <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </h4>
              </div>
              <p className="text-sm text-slate-600 sm:ml-14 mb-1">{event.description}</p>
            </button>

            {isExpanded && (
              <div className="sm:ml-14 mt-3 bg-slate-50 border border-slate-200 rounded-lg p-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-semibold">Action ID</span>
                    <p className="text-slate-700 font-mono text-xs mt-0.5">ACT-{String(index + 1).padStart(3, '0')}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-semibold">Actor</span>
                    <p className="text-slate-700 mt-0.5">{event.type === 'detection' ? 'System' : event.type === 'investigation' ? 'AI Analysis' : 'Officer'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-semibold">Timestamp</span>
                    <p className="text-slate-700 mt-0.5">{event.time} — {event.date || 'Today'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-semibold">Verification</span>
                    <p className="text-emerald-600 font-medium mt-0.5">✓ Verified</p>
                  </div>
                </div>
                {event.technical && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Technical Details</span>
                    <pre className="text-xs text-slate-700 bg-white p-2 rounded mt-1 overflow-x-auto border border-slate-200">
                      {typeof event.technical === 'string' ? event.technical : JSON.stringify(event.technical, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
