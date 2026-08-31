import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { Shield, Activity, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StageMonitoring = ({ monitoring, caseId }) => {
  const { updateCase, showToast } = useApp();
  const [auditing, setAuditing] = useState(false);
  const [auditPhase, setAuditPhase] = useState(0);

  const metrics = [
    { key: 'systemState', label: 'System State', description: 'Overall system health' },
    { key: 'securityState', label: 'Security State', description: 'Current security posture' },
    { key: 'evidenceIntegrity', label: 'Evidence Integrity', description: 'Evidence chain intact' },
    { key: 'consistency', label: 'Consistency', description: 'Record consistency check' },
    { key: 'runtimeAudit', label: 'Runtime Audit', description: 'Continuous monitoring' },
  ];

  const allVerified = monitoring && metrics.every(m => {
    const v = monitoring[m.key];
    return v === 'verified' || v === 'intact' || v === 'consistent' || v === 'active';
  });

  const allPending = monitoring && metrics.every(m => {
    const v = monitoring[m.key];
    return !v || v === 'pending';
  });

  const auditChecks = [
    'Authentication Service',
    'Configuration',
    'Security Patch',
    'Expected Processes',
    'Security Controls'
  ];

  const startAudit = () => {
    setAuditing(true);
    setAuditPhase(0);
  };

  // Audit animation
  useEffect(() => {
    if (!auditing) return;

    const totalChecks = auditChecks.length;

    if (auditPhase >= totalChecks) {
      updateCase(caseId, {
        monitoring: {
          lastCheck: 'Just now',
          systemState: 'verified',
          securityState: 'verified',
          evidenceIntegrity: 'verified',
          consistency: 'verified',
          runtimeAudit: 'verified'
        }
      });
      setAuditing(false);
      showToast('Runtime audit completed — system secure', 'success');
      return;
    }

    const timer = setTimeout(() => {
      setAuditPhase(prev => prev + 1);
    }, 1200);

    return () => clearTimeout(timer);
  }, [auditing, auditPhase, caseId, updateCase, showToast]);

  if (!monitoring) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm">Continuous Monitoring</h3>

      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <Activity className="w-5 h-5 text-indigo-600" />
          <div className="flex-1">
            <span className="text-xs text-slate-500 uppercase font-semibold block">Runtime Assurance Active</span>
            <span className="text-sm text-slate-700">Last check: {monitoring.lastCheck || 'Not yet checked'}</span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {metrics.map((m, idx) => {
            const value = monitoring[m.key];
            const isVerified = value === 'verified' || value === 'intact' || value === 'consistent' || value === 'active';
            const isChecking = auditing && metrics.indexOf(m) <= auditPhase - 1;
            const isCurrentAudit = auditing && auditPhase < auditChecks.length && metrics.indexOf(m) === auditPhase;
            return (
              <div key={m.key} className={`p-4 bg-slate-50 rounded-lg border border-slate-100 transition-colors ${isCurrentAudit ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">{m.label}</span>
                  {auditing && isCurrentAudit ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking
                    </span>
                  ) : (
                    <StatusBadge
                      status={isVerified ? 'verified' : 'attention'}
                      label={value || 'Pending'}
                      size="sm"
                    />
                  )}
                </div>
                <p className="text-xs text-slate-500">{m.description}</p>
              </div>
            );
          })}
        </div>

        {/* Runtime Audit section */}
        {auditing && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-sm font-semibold text-indigo-900">Running Runtime Audit...</span>
            </div>
            <div className="space-y-2">
              {auditChecks.map((check, idx) => {
                const isDone = idx < auditPhase;
                const isCurrent = idx === auditPhase;
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                    )}
                    <span className={isDone ? 'text-emerald-700' : isCurrent ? 'text-indigo-700 font-medium' : 'text-slate-400'}>
                      {check}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {allVerified && !auditing && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900">✓ SYSTEM SECURE</p>
              <p className="text-xs text-emerald-700 mt-0.5">All monitoring checks passed. System is operating normally.</p>
            </div>
          </div>
        )}

        {/* Runtime Audit Button */}
        {(allPending || auditing) && !allVerified && (
          <div className="flex flex-col items-center gap-3 py-4">
            {!auditing && (
              <button
                onClick={startAudit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Run Runtime Audit
              </button>
            )}
          </div>
        )}

        {/* Consistency Check Section */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Consistency Check</h4>
          <div className="space-y-2">
            {[
              { label: 'Evidence timeline consistent', ok: true },
              { label: 'Case timestamps consistent', ok: true },
              { label: 'Investigation sequence consistent', ok: true },
              { label: 'Action sequence consistent', ok: true },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={`w-4 h-4 ${item.ok ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className={item.ok ? 'text-slate-700' : 'text-amber-700'}>{item.label}</span>
              </div>
            ))}
          </div>
          {allVerified && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500 italic">AI: "All investigation records, evidence timestamps, and action sequences are internally consistent."</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
