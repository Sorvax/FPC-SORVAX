import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StageVerification = ({ verification, caseId }) => {
  const { updateCase, showToast } = useApp();
  const [running, setRunning] = useState(false);
  const [currentCheck, setCurrentCheck] = useState(-1);

  const checks = [
    { key: 'securityTest', label: 'Security Test', defaultDetail: 'Vulnerability no longer detected' },
    { key: 'regressionTest', label: 'Regression Tests', defaultDetail: 'Application behaviour normal' },
    { key: 'systemCheck', label: 'System Check', defaultDetail: 'Expected state confirmed' },
    { key: 'independentVerification', label: 'Independent Verification', defaultDetail: 'Passed' },
  ];

  const allPassed = verification?.overallResult === 'passed' || verification?.overallResult === 'verified' ||
    checks.every(c => {
      const data = verification?.[c.key];
      return data && (data.status === 'passed' || data.status === 'completed');
    });

  const allPending = checks.every(c => {
    const data = verification?.[c.key];
    return !data || data.status === 'pending';
  });

  // If we reach this stage with all pending, start running
  useEffect(() => {
    if (allPending && !allPassed && caseId && verification?.overallResult === 'pending') {
      // Don't auto-start, wait for explicit trigger
    }
  }, [allPending, allPassed, caseId, verification]);

  const startVerification = () => {
    setRunning(true);
    setCurrentCheck(0);
  };

  // Verification animation
  useEffect(() => {
    if (!running || currentCheck < 0) return;

    const totalChecks = 4;

    if (currentCheck >= totalChecks) {
      // All checks passed
      updateCase(caseId, {
        verification: {
          securityTest: { label: 'Security Test', detail: 'Vulnerability no longer detected', status: 'completed' },
          regressionTest: { label: 'Regression Tests', detail: 'Application behaviour normal', status: 'completed' },
          systemCheck: { label: 'System Check', detail: 'Expected state confirmed', status: 'completed' },
          independentVerification: { label: 'Independent Verification', detail: 'Passed', status: 'completed' },
          overallResult: 'verified'
        }
      });
      setRunning(false);
      showToast('Fix verified — all checks passed', 'success');
      return;
    }

    // Complete current check after delay
    const timer = setTimeout(() => {
      const checkKey = checks[currentCheck].key;
      const currentData = verification?.[checkKey] || {};
      updateCase(caseId, {
        verification: {
          ...verification,
          [checkKey]: { ...currentData, status: 'completed', detail: checks[currentCheck].defaultDetail }
        }
      });
      setCurrentCheck(prev => prev + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [running, currentCheck, caseId, verification, updateCase, showToast]);

  if (!verification) return null;

  const renderIcon = (status, checkIdx) => {
    if (status === 'passed' || status === 'completed') return <CheckCircle2 className="text-emerald-500" size={24} />;
    if (status === 'failed') return <XCircle className="text-rose-500" size={24} />;
    if (running && currentCheck === checkIdx) return <Loader2 className="text-indigo-500 animate-spin" size={24} />;
    if (running && currentCheck > checkIdx) return <CheckCircle2 className="text-emerald-500" size={24} />;
    return <Clock className="text-slate-400" size={24} />;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm mb-4">Independent Verification</h3>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <p className="text-sm text-slate-600">FPC–SORVAX independently checks that the fix worked. The system did not just apply a fix — it verified the result.</p>
        </div>

        <div className="divide-y divide-slate-100">
          {checks.map((check, idx) => {
            const data = verification[check.key] || { status: 'pending', detail: check.defaultDetail };
            const isPassed = data.status === 'passed' || data.status === 'completed';
            const isRunningCheck = running && currentCheck === idx;
            return (
              <div key={check.key} className={`p-4 flex items-center justify-between transition-colors ${isRunningCheck ? 'bg-indigo-50/50' : ''}`}>
                <div className="flex items-center gap-4">
                  {renderIcon(data.status, idx)}
                  <div>
                    <h5 className="font-semibold text-slate-900">{check.label}</h5>
                    <p className="text-sm text-slate-500">
                      {isRunningCheck ? 'Running...' : data.detail || check.defaultDetail}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold uppercase tracking-wider ${isPassed ? 'text-emerald-600' : isRunningCheck ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {isPassed ? 'Passed' : isRunningCheck ? 'Running' : data.status}
                </span>
              </div>
            );
          })}
        </div>

        {allPassed ? (
          <div className="p-6 bg-emerald-500 text-white flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={32} />
              <span className="text-xl font-bold tracking-wide">FIX VERIFIED</span>
            </div>
            <p className="text-emerald-100 text-sm text-center">
              The issue was no longer detected after remediation. The fix has been independently verified.
            </p>
          </div>
        ) : running ? (
          <div className="p-6 bg-indigo-50 border-t border-indigo-200 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="font-medium text-indigo-700">Running verification checks...</span>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock size={20} />
              <span className="font-medium">Ready to verify</span>
            </div>
            {allPending && (
              <button
                onClick={startVerification}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Run Verification
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
