import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { FileText, Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

/**
 * StageInitialReport — Initial Case Report
 *
 * Generated BEFORE remediation. Represents the state of the case
 * at the point of investigation completion.
 *
 * Includes:
 * - Case information
 * - Detection details
 * - Evidence collected + integrity status
 * - Investigation findings
 * - AI analysis
 * - Recommended remediation
 * - Risk assessment
 * - Current system state
 * - Pending actions
 * - Recommended next step
 */
export const StageInitialReport = ({ caseData, findings, evidence, timeline }) => {
  if (!caseData) return null;

  const severity = caseData.severity || 'medium';
  const assignedTo = caseData.assignedTo || 'Unassigned';
  const findingCount = findings?.length || 0;
  const evidenceCount = evidence?.length || 0;
  const verifiedCount = evidence?.filter(e => e.verified).length || 0;

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'critical': return 'failed';
      case 'high': return 'failed';
      case 'medium': return 'attention';
      case 'low': return 'active';
      default: return 'pending';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

        <div className="flex items-center gap-2 mb-6">
          <FileText className="text-indigo-600" size={20} />
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm">
            Initial Case Report
          </h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock size={10} />
            Generated Before Remediation
          </span>
        </div>

        {/* Case Summary */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Case Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Case ID</span>
              <span className="text-slate-900 font-mono text-sm">{caseData.id}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Severity</span>
              <StatusBadge status={getSeverityColor(severity)} label={severity.toUpperCase()} size="sm" />
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Assigned To</span>
              <span className="text-slate-900 text-sm">{assignedTo}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Status</span>
              <StatusBadge status="active" label="ACTIVE" size="sm" />
            </div>
          </div>
        </div>

        {/* Detection */}
        {caseData.detection && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Detection</h4>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-700">{caseData.detection.description || 'No detection details available.'}</p>
              {caseData.detection.method && (
                <p className="text-xs text-slate-500 mt-2">Method: {caseData.detection.method}</p>
              )}
            </div>
          </div>
        )}

        {/* Evidence */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Evidence Collected</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
              <span className="text-2xl font-bold text-slate-900 block">{evidenceCount}</span>
              <span className="text-xs text-slate-500">Items Collected</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
              <span className="text-2xl font-bold text-emerald-700 block">{verifiedCount}</span>
              <span className="text-xs text-emerald-600">Verified</span>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center">
              <span className="text-2xl font-bold text-indigo-700 block">{verifiedCount === evidenceCount ? '✓' : '!'}</span>
              <span className="text-xs text-indigo-600">{verifiedCount === evidenceCount ? 'Integrity OK' : 'Review Needed'}</span>
            </div>
          </div>
        </div>

        {/* Findings */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Findings</h4>
          {findingCount > 0 ? (
            <div className="space-y-2">
              {findings.map((f, idx) => (
                <div key={f.findingId || idx} className="bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-start gap-3">
                  <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{f.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Severity: {f.severity?.toUpperCase()} | Confidence: {f.confidence}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No findings identified yet.</p>
          )}
        </div>

        {/* AI Analysis & Recommendation */}
        {caseData.remediation && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Recommended Remediation</h4>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <p className="text-sm text-indigo-800 font-medium">{caseData.remediation.recommendation}</p>
              {caseData.remediation.rationale && (
                <p className="text-xs text-indigo-600 mt-2">{caseData.remediation.rationale}</p>
              )}
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Risk Assessment</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Risk Level</span>
              <StatusBadge
                status={caseData.remediation?.risk === 'high' ? 'failed' : 'attention'}
                label={(caseData.remediation?.risk || 'medium').toUpperCase()}
                size="sm"
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Rollback Available</span>
              <span className={`text-sm font-medium ${caseData.remediation?.rollbackAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
                {caseData.remediation?.rollbackAvailable ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Pending Actions</h4>
          <div className="space-y-2">
            {[
              { label: 'Remediation', done: false },
              { label: 'Verification', done: false },
              { label: 'Deployment', done: false },
              { label: 'Runtime Monitoring', done: false },
            ].map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full border-2 ${action.done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`} />
                <span className={action.done ? 'text-slate-900' : 'text-slate-500'}>{action.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Next Step */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start gap-3">
          <Shield className="text-indigo-600 shrink-0 mt-0.5" size={16} />
          <div>
            <span className="text-xs font-semibold text-indigo-900 uppercase block mb-1">Recommended Next Step</span>
            <p className="text-sm text-indigo-800">
              {findingCount > 0
                ? 'Review the recommended remediation and decide whether to continue or transfer the case.'
                : 'Continue monitoring or close the case.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
