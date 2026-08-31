import React from 'react';
import { Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

/**
 * AICard - Displays AI-generated content with provider indicator.
 *
 * Props:
 *   title       - Card title
 *   subtitle    - Optional subtitle
 *   children    - Card content
 *   confidence  - Confidence level badge
 *   provider    - AI provider info: { type, model, aiEnhanced, cached, fallbackUsed, fallbackReason }
 *   className   - Additional CSS classes
 */
export const AICard = ({ title, children, confidence, className = '', subtitle, provider }) => {
  const isRealAI = provider?.aiEnhanced === true;
  const providerName = provider?.provider || provider?.type || 'mock';
  const modelName = provider?.model || '';
  const isCached = provider?.cached === true;
  const isFallback = provider?.fallbackUsed === true;
  const fallbackReason = provider?.fallbackReason || '';

  return (
    <div className={`bg-indigo-50/50 border border-indigo-100 rounded-xl shadow-sm p-6 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
      
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tracking-wide ${
          isRealAI ? 'text-emerald-700 bg-emerald-100' : 'text-indigo-600 bg-indigo-100'
        }`}>
          <Sparkles size={12} />
          {isRealAI ? 'REAL AI ASSISTANCE' : 'SIMULATED AI ASSISTANCE'}
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Provider: {providerName}{modelName ? ` / ${modelName}` : ''}
        </span>
        {isCached && (
          <span className="text-[10px] text-slate-400 font-mono">(cached)</span>
        )}
      </div>

      {isFallback && (
        <div className="flex items-center gap-1.5 mt-1 mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          <AlertTriangle size={12} className="shrink-0" />
          <span>
            Real AI temporarily unavailable. This analysis was generated using the system fallback.
            {fallbackReason && <span className="font-mono text-amber-500 ml-1">({fallbackReason})</span>}
          </span>
        </div>
      )}
      
      <h4 className="font-semibold text-slate-900 mt-2">{title}</h4>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      
      <div className="text-slate-700 mt-3">
        {children}
      </div>
      
      {confidence && (
        <div className="mt-4 pt-4 border-t border-indigo-100/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Confidence</span>
          <StatusBadge status="verified" label={confidence} size="sm" />
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-indigo-100/50 flex items-center gap-1.5">
        <ShieldCheck size={12} className="text-amber-500" />
        <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">
          AI ASSISTANCE — Human approval required
        </span>
      </div>
    </div>
  );
};
