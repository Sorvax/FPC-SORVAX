import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Shield, Clock, AlertTriangle, ChevronRight, ArrowRight, Search, ShieldCheck, Wrench, Eye, Activity, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDemo } from '../context/DemoContext';
import { systemTrust } from '../data/system';

export const Overview = () => {
  const navigate = useNavigate();
  const { cases, notifications, tamperDetected } = useApp();
  const { demoActive, demoStep, startDemo } = useDemo();

  const activeCases = cases.filter(c => c.currentStage < 8);
  const actionRequiredCount = notifications.filter(n => n.type === 'action' && !n.read).length;
  const integrityIssuesCount = tamperDetected ? 1 : 0;

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  const workflowSteps = [
    { icon: Search, label: 'Discover', color: 'text-amber-600 bg-amber-100' },
    { icon: ShieldCheck, label: 'Preserve', color: 'text-sky-600 bg-sky-100' },
    { icon: Eye, label: 'Understand', color: 'text-indigo-600 bg-indigo-100' },
    { icon: Wrench, label: 'Fix', color: 'text-violet-600 bg-violet-100' },
    { icon: ShieldCheck, label: 'Verify', color: 'text-emerald-600 bg-emerald-100' },
    { icon: Activity, label: 'Monitor', color: 'text-rose-600 bg-rose-100' },
    { icon: FileText, label: 'Report', color: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-1 font-semibold">FPC–SORVAX</h1>
        <h2 className="text-3xl font-bold text-slate-900">{greeting}, Officer.</h2>
        <p className="text-slate-500 mt-1">Digital Investigation & Security Assurance</p>
      </div>

      {/* Demo Launch */}
      {!demoActive && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl shadow-lg p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center">
              <Play className="h-6 w-6 ml-0.5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Start Interactive Demo</h3>
              <p className="text-indigo-200 text-sm mt-0.5">Experience the complete investigation workflow in 13 guided steps</p>
            </div>
          </div>
          <button
            onClick={startDemo}
            className="bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg px-6 py-3 font-semibold transition-colors shadow-sm flex items-center gap-2 shrink-0"
          >
            Launch Demo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attention Section */}
      {(actionRequiredCount > 0 || integrityIssuesCount > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Needs Your Attention
          </h3>
          <div className="space-y-3">
            {actionRequiredCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-amber-900">{actionRequiredCount} action{actionRequiredCount > 1 ? 's' : ''} require{actionRequiredCount === 1 ? 's' : ''} approval</span>
                </div>
                <button onClick={() => navigate('/cases/CASE-0241')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  Review <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {integrityIssuesCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-sm font-medium text-rose-900">Integrity issue detected</span>
                </div>
                <button onClick={() => navigate('/cases/CASE-0241')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  Investigate <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Cases */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Active Cases</h3>
          <button onClick={() => navigate('/cases')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
        </div>
        
        {activeCases.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-900 mb-1">No Active Cases</h4>
            <p className="text-sm text-slate-500">All clear. No security incidents are currently being investigated.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCases.map(c => {
              const activeStage = c.stages[c.currentStage];
              const nextStage = c.stages[c.currentStage + 1];
              return (
                <div 
                  key={c.id} 
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{c.id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          c.severity === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          c.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-sky-50 text-sky-700 border-sky-200'
                        }`}>
                          {c.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-500">{c.system}</span>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900">{c.title}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">{c.subtitle}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
                      {/* Stage Progress */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.stages.map((stage, idx) => (
                          <div key={stage.id} className="flex items-center gap-1">
                            <div 
                              className={`w-2 h-2 rounded-full ${
                                stage.status === 'completed' ? 'bg-emerald-500' :
                                stage.status === 'active' ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-300'
                              }`}
                              title={stage.label}
                            />
                            {idx < c.stages.length - 1 && <div className="w-3 h-px bg-slate-200" />}
                          </div>
                        ))}
                      </div>

                      {/* Next Step */}
                      {nextStage && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 min-w-[200px]">
                          <span className="text-xs text-indigo-600 font-semibold uppercase">Next</span>
                          <p className="text-sm font-medium text-indigo-900">{nextStage.label === 'Fix' ? 'Approve recommended fix' : nextStage.label === 'Verify' ? 'Verify the fix' : nextStage.label === 'Deploy' ? 'Deploy the fix' : nextStage.label === 'Monitor' ? 'Monitor system' : `Proceed to ${nextStage.label}`}</p>
                        </div>
                      )}

                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 hidden lg:block" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid: How It Works + System Trust */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* How FPC-SORVAX Works */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-5">How FPC–SORVAX Works</h3>
          <div className="space-y-3">
            {workflowSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step.color}`}>
                  <step.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">{step.label}</span>
                </div>
                {i < workflowSteps.length - 1 && (
                  <div className="absolute ml-4 mt-12 text-slate-300 text-xs">↓</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500 leading-relaxed">
              FPC–SORVAX preserves the evidence, helps investigate the issue, assists with remediation, independently verifies the result, and continuously monitors the system.
            </p>
          </div>
        </div>

        {/* System Trust */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-5 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-600" />
            System Trust
          </h3>
          <div className="space-y-4">
            {Object.entries(systemTrust).map(([key, value]) => {
              const isFailed = tamperDetected && key === 'evidenceIntegrity';
              return (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="text-slate-600 font-medium text-sm">{value.label}</span>
                  <div className="flex items-center gap-2">
                    {isFailed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Compromised
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {value.status === 'active' ? 'Active' : 'Verified'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
