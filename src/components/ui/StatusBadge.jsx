import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Circle, Clock, Loader2 } from 'lucide-react';

const configs = {
  verified: { icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  completed: { icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  active: { icon: Loader2, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', animate: true },
  attention: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  pending: { icon: Clock, bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
  failed: { icon: XCircle, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  open: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  high: { icon: AlertTriangle, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  medium: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { icon: Circle, bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' }
};

export function StatusBadge({ status, label, size = 'md' }) {
  const config = configs[status.toLowerCase()] || configs.pending;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}>
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} ${config.animate ? 'animate-spin' : ''}`} />
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
