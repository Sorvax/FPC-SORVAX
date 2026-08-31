import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ArrowRight, Repeat, Shield, CheckCircle2, Clock } from 'lucide-react';

/**
 * StageDecision — Continue Case or Transfer Case
 *
 * After the Initial Case Report, the officer has two clear choices:
 *
 * OPTION A: CONTINUE CASE
 *   The current officer continues with remediation.
 *
 * OPTION B: TRANSFER CASE
 *   The current officer transfers to another officer/department.
 *   This is OPTIONAL — not a required step.
 *
 * The decision is stored in caseData.decision and triggers
 * the appropriate next stage.
 */
export const StageDecision = ({ caseData, onStageChange }) => {
  const [decision, setDecision] = useState(null);
  const [transferData, setTransferData] = useState({
    receivingOfficer: '',
    receivingDepartment: '',
    reason: '',
  });
  const [showTransferForm, setShowTransferForm] = useState(false);

  const handleContinue = () => {
    setDecision('continue');
  };

  const handleTransferSelect = () => {
    setDecision('transfer');
    setShowTransferForm(true);
  };

  const officerOptions = [
    'Officer Martinez',
    'Officer Chen',
    'Officer Rivera',
    'Officer Reyes',
    'Officer Thompson',
    'Cyber Operations Team',
    'Network Security Team',
  ];

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

        <div className="flex items-center gap-2 mb-6">
          <ArrowRight className="text-indigo-600" size={20} />
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm">
            Case Ready for Next Action
          </h3>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          The initial case report has been generated. Choose how to proceed:
        </p>

        {/* Decision Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Continue Case */}
          <button
            onClick={handleContinue}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              decision === 'continue'
                ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                decision === 'continue' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <ArrowRight size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Continue Case</h4>
                <p className="text-xs text-slate-500">Current officer proceeds</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Continue with remediation and fix the identified issue.
            </p>
            {decision === 'continue' && (
              <div className="mt-3 flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <CheckCircle2 size={14} />
                Selected
              </div>
            )}
          </button>

          {/* Transfer Case */}
          <button
            onClick={handleTransferSelect}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              decision === 'transfer'
                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                decision === 'transfer' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'
              }`}>
                <Repeat size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Transfer Case</h4>
                <p className="text-xs text-slate-500">Optional — hand off to another officer</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Transfer the case to another officer or department.
            </p>
            {decision === 'transfer' && (
              <div className="mt-3 flex items-center gap-2 text-amber-700 text-sm font-medium">
                <CheckCircle2 size={14} />
                Selected
              </div>
            )}
          </button>
        </div>

        {/* Transfer Form */}
        {showTransferForm && decision === 'transfer' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <h4 className="font-bold text-slate-900 mb-4">Transfer Case</h4>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-semibold block mb-1">
                  Current Officer
                </label>
                <span className="text-sm text-slate-900 font-medium">
                  {caseData.assignedTo || 'Unassigned'}
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase font-semibold block mb-1">
                  Transfer To *
                </label>
                <select
                  value={transferData.receivingOfficer}
                  onChange={(e) => setTransferData(prev => ({
                    ...prev,
                    receivingOfficer: e.target.value,
                    receivingDepartment: e.target.value,
                  }))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                >
                  <option value="">Select officer / department</option>
                  {officerOptions.map(officer => (
                    <option key={officer} value={officer}>{officer}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase font-semibold block mb-1">
                  Transfer Reason (optional)
                </label>
                <textarea
                  value={transferData.reason}
                  onChange={(e) => setTransferData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Why is this case being transferred?"
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
              </div>

              {/* Case Status Summary */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h5 className="text-xs text-slate-500 uppercase font-semibold mb-2">Case Status</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Completed:</p>
                    <div className="space-y-1">
                      {['Evidence collected', 'Integrity verified', 'Investigation completed', 'Finding identified', 'Initial report generated'].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-emerald-700">
                          <CheckCircle2 size={10} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Pending:</p>
                    <div className="space-y-1">
                      {['Remediation', 'Verification', 'Deployment', 'Runtime monitoring'].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start gap-3">
          <Shield className="text-indigo-600 shrink-0 mt-0.5" size={16} />
          <div>
            <span className="text-xs font-semibold text-indigo-900 uppercase block mb-1">Transfer is Optional</span>
            <p className="text-sm text-indigo-800">
              You can continue the case yourself or transfer it to another officer. Either choice is valid.
            </p>
          </div>
        </div>

        {/* Continue/Transfer Actions */}
        {decision && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => { setDecision(null); setShowTransferForm(false); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (onStageChange) {
                  // Store decision in case data for the workflow to use
                  onStageChange(decision === 'transfer' ? 'transfer' : 'remediation', {
                    decision,
                    transferData: decision === 'transfer' ? transferData : null,
                  });
                }
              }}
              disabled={decision === 'transfer' && !transferData.receivingOfficer}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2 ${
                decision === 'continue'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : decision === 'transfer' && transferData.receivingOfficer
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {decision === 'continue' ? (
                <>
                  <ArrowRight size={14} />
                  Continue Case
                </>
              ) : (
                <>
                  <Repeat size={14} />
                  Transfer Case
                </>
              )}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
