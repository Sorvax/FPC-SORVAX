import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function ExpandableSection({ title, defaultOpen = false, children, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`border border-slate-200 rounded-lg overflow-hidden ${className}`}>
      <button 
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-slate-800 text-sm">{title}</span>
        {open ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
      </button>
      {open && (
        <div className="p-4 border-t border-slate-200 bg-white animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
