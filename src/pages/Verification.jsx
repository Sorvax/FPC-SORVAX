import React from 'react';
import { useApp } from '../context/AppContext';
import { systemTrust } from '../data/system';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { CheckCircle2, AlertTriangle, ShieldAlert, Shield } from 'lucide-react';

export const Verification = () => {
  const { cases, tamperDetected } = useApp();
  
  const verificationCases = cases.filter(c => c.currentStage >= 6);
  const pendingCases = cases.filter(c => c.currentStage > 0 && c.currentStage < 6);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Verification Dashboard</h1>
        <p className="text-slate-500 mt-1">Independent verification that fixes actually work</p>
      </div>

      {/* System Trust Overview */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">Overall System Trust</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(systemTrust).map(([key, value]) => {
            const isFailed = tamperDetected && key === 'evidenceIntegrity';
            return (
              <div key={key} className={`p-4 rounded-lg border ${isFailed ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-sm text-slate-500 mb-1">{value.label}</div>
                <div className="flex items-center space-x-2">
                  {isFailed ? <ShieldAlert className="h-5 w-5 text-rose-600" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  <span className={`font-semibold ${isFailed ? 'text-rose-700' : 'text-slate-900'}`}>
                    {isFailed ? 'FAILED' : value.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{value.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Case Verification */}
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Case Verification</h2>
      
      {verificationCases.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No Cases in Verification</h3>
          <p className="text-sm text-slate-500">Cases will appear here once they reach the verification stage.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verificationCases.map(c => {
            const isComplete = c.currentStage > 6;
            const checks = c.verification ? [
              { label: 'Security Test', status: c.verification.securityTest?.status },
              { label: 'Regression Tests', status: c.verification.regressionTest?.status },
              { label: 'System Check', status: c.verification.systemCheck?.status },
              { label: 'Independent Audit', status: c.verification.independentVerification?.status },
            ] : [];

            return (
              <Card key={c.id} className="p-6">
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{c.id}: {c.title}</h3>
                    <p className="text-slate-500 text-sm mt-1">Verification Phase</p>
                  </div>
                  <StatusBadge status={isComplete ? 'verified' : 'active'} label={isComplete ? 'Verified' : 'In Progress'} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {checks.map(check => {
                    const passed = check.status === 'completed' || check.status === 'passed';
                    return (
                      <div key={check.label} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                        <span className="text-slate-600">{check.label}</span>
                        <span className={`font-medium ${passed ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {passed ? '✓ Passed' : '○ Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {isComplete && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-emerald-800 font-medium">✓ FIX VERIFIED — Issue no longer detected after remediation</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {pendingCases.length > 0 && (
        <div className="mt-8 pt-8 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Verification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingCases.map(c => (
              <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="font-medium text-slate-900">{c.id}</div>
                <div className="text-sm text-slate-500 truncate">{c.title}</div>
                <div className="mt-2 text-xs text-amber-600 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Awaiting earlier stages
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
