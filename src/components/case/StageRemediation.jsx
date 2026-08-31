import React, { useState, useEffect, useCallback } from 'react';
import { AIRecommendation } from '../ai/AIRecommendation';
import { Card } from '../ui/Card';
import { CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StageRemediation = ({ remediation, finding, caseId }) => {
  const { updateCase, showToast } = useApp();
  const [fixRunning, setFixRunning] = useState(false);
  const [fixStepIndex, setFixStepIndex] = useState(-1);
  const [fixComplete, setFixComplete] = useState(false);

  const isApproved = remediation?.approved;
  const fixSteps = [
    { label: 'Preparing change', status: 'pending' },
    { label: 'Applying patch', status: 'pending' },
    { label: 'Running checks', status: 'pending' },
    { label: 'Preparing verification', status: 'pending' }
  ];

  useEffect(() => {
    // If already approved from state (e.g. demo), show completed
    if (isApproved && !fixRunning) {
      setFixComplete(true);
    }
  }, [isApproved]);

  const handleApprove = useCallback(() => {
    if (isApproved || fixRunning) return;

    // First approve
    updateCase(caseId, {
      remediation: { ...remediation, approved: true, appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    });
    showToast('Remediation approved', 'success');

    // Then start fix animation
    setTimeout(() => {
      setFixRunning(true);
      setFixStepIndex(0);
    }, 500);
  }, [caseId, remediation, isApproved, fixRunning, updateCase, showToast]);

  // Fix progress animation
  useEffect(() => {
    if (!fixRunning || fixStepIndex < 0) return;

    const totalSteps = 4;
    if (fixStepIndex >= totalSteps) {
      // Fix complete
      updateCase(caseId, {
        fixSteps: [
          { label: 'Preparing change', status: 'completed' },
          { label: 'Applying patch', status: 'completed' },
          { label: 'Running checks', status: 'completed' },
          { label: 'Preparing verification', status: 'completed' }
        ]
      });
      setFixComplete(true);
      setFixRunning(false);
      showToast('Fix applied successfully', 'success');
      return;
    }

    const timer = setTimeout(() => {
      // Mark current step as completed, move to next
      const newSteps = [...fixSteps];
      for (let i = 0; i <= fixStepIndex; i++) {
        newSteps[i] = { ...newSteps[i], status: 'completed' };
      }
      if (fixStepIndex < totalSteps - 1) {
        newSteps[fixStepIndex + 1] = { ...newSteps[fixStepIndex + 1], status: 'active' };
      }
      updateCase(caseId, { fixSteps: newSteps });
      setFixStepIndex(prev => prev + 1);
    }, 1200);

    return () => clearTimeout(timer);
  }, [fixRunning, fixStepIndex, caseId, updateCase, showToast]);

  if (!remediation) return null;

  // Show fix progress
  if (fixRunning || (isApproved && !fixComplete)) {
    return (
      <div className="space-y-6">
        <AIRecommendation
          recommendation={remediation.recommendation}
          rationale={remediation.rationale}
          expectedResult={remediation.expectedResult}
          risk={remediation.risk}
        />
        <Card className="border-indigo-200">
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm">Applying Fix</h3>
          </div>
          <div className="space-y-4">
            {fixSteps.map((step, idx) => {
              const isCompleted = step.status === 'completed' || (fixRunning && idx < fixStepIndex);
              const isActive = fixRunning && idx === fixStepIndex;
              const isPending = !isCompleted && !isActive;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-400 w-6">{idx + 1}.</span>
                  <div className="flex items-center justify-center w-6 h-6">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-indigo-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  {isCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>

          {fixComplete && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">✓ Fix Applied</p>
                <p className="text-xs text-emerald-700 mt-0.5">All changes applied successfully. Ready for independent verification.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Show fix completed state (after fix is done)
  if (fixComplete && isApproved) {
    return (
      <div className="space-y-6">
        <AIRecommendation
          recommendation={remediation.recommendation}
          rationale={remediation.rationale}
          expectedResult={remediation.expectedResult}
          risk={remediation.risk}
        />
        <Card className="bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={24} />
            <div>
              <h4 className="text-emerald-900 font-bold">Remediation Approved & Applied</h4>
              <p className="text-emerald-700 text-sm mt-1">
                Approved at {remediation.appliedAt || 'recently'}. Fix has been applied successfully.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            FPC–SORVAX will independently verify the result.
          </div>
        </Card>
      </div>
    );
  }

  // Show approval card (default state)
  return (
    <div className="space-y-6">
      <AIRecommendation
        recommendation={remediation.recommendation}
        rationale={remediation.rationale}
        expectedResult={remediation.expectedResult}
        risk={remediation.risk}
      />

      <Card className="border-amber-200 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>

        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm">Remediation Ready</h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Awaiting Approval
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Recommended Fix</span>
            <span className="text-slate-900 font-medium">{remediation.recommendation}</span>
          </div>

          <div className="p-3">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Risk Level</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              remediation.risk === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {(remediation.risk || 'Low').toUpperCase()}
            </span>
          </div>

          <div className="p-3">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Rollback Available</span>
            <span className={`font-medium ${remediation.rollbackAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
              {remediation.rollbackAvailable ? 'Yes — rollback strategy in place' : 'No'}
            </span>
          </div>

          <div className="col-span-1 md:col-span-2 p-3">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Expected Impact</span>
            <span className="text-slate-800">{remediation.expectedResult}</span>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-800">
            <strong>Independent verification required.</strong> FPC–SORVAX will automatically verify the fix after it is applied.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            onClick={handleApprove}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-8 py-3 font-bold transition-colors w-full md:w-auto shadow-sm flex items-center gap-2 justify-center"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve & Apply
          </button>
        </div>
      </Card>
    </div>
  );
};
