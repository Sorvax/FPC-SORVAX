import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

const styles = {
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', iconColor: 'text-amber-500', icon: AlertTriangle },
  danger: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', iconColor: 'text-rose-500', icon: XCircle },
  info: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', iconColor: 'text-sky-500', icon: Info },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', iconColor: 'text-emerald-500', icon: CheckCircle }
};

export function AlertBanner({ type = 'info', title, message, actionLabel, onAction, onDismiss }) {
  const config = styles[type] || styles.info;
  const Icon = config.icon;

  return (
    <div className={`w-full border-b px-6 py-4 flex items-start sm:items-center justify-between gap-4 ${config.bg} ${config.border}`}>
      <div className="flex items-start sm:items-center gap-3">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 sm:mt-0 ${config.iconColor}`} />
        <div>
          <h4 className={`text-sm font-semibold ${config.text}`}>{title}</h4>
          {message && <p className={`text-sm mt-0.5 ${config.text} opacity-90`}>{message}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {actionLabel && (
          <button 
            onClick={onAction}
            className={`text-sm font-medium px-3 py-1.5 rounded-md bg-white shadow-sm border ${config.border} hover:bg-slate-50 transition-colors ${config.text}`}
          >
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className={`p-1 rounded-md hover:bg-white/50 transition-colors ${config.text}`}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
