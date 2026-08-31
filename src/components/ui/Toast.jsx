import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  info: 'bg-sky-50 border-sky-200 text-sky-800',
};

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map(toast => {
        const Icon = icons[toast.type] || icons.info;
        const style = styles[toast.type] || styles.info;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up min-w-[300px] ${style}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-white/50 rounded transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
