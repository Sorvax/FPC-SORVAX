import React from 'react';

export function Card({ title, subtitle, icon, headerAction, className = '', children }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            {icon && <div className="text-slate-400">{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
