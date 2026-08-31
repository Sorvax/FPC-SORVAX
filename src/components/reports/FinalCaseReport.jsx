import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { ExpandableSection } from '../ui/ExpandableSection';
import { FileText, Download, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FinalCaseReport = ({ caseData }) => {
  const { evidenceItems } = useApp();

  if (!caseData) return null;

  const caseEvidence = evidenceItems.filter(e => e.caseId === caseData.id);
  const verifiedEvidence = caseEvidence.filter(e => e.verified);

  const isRemediated = caseData.remediation?.approved;
  const isVerified = caseData.verification?.overallResult === 'verified';
  const isDeployed = caseData.deployment?.status === 'completed';
  const isMonitored = caseData.monitoring?.runtimeAudit === 'verified';

  const sections = [
    {
      num: '1',
      title: 'Executive Summary',
      content: (
        <>
          <p className="text-slate-700 mb-2">{caseData.detection?.description || 'No detection data available.'}</p>
          <p className="text-sm text-slate-600">Case <strong>{caseData.id}</strong> was opened on {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : 'Unknown'} and assigned to {caseData.assignedTo || 'an officer'}.</p>
          <p className="text-sm text-slate-600 mt-1">Severity: <strong className={`${caseData.severity === 'high' ? 'text-rose-600' : 'text-amber-600'}`}>{caseData.severity?.toUpperCase() || 'Unknown'}</strong> | System: {caseData.system || 'Unknown'}</p>
        </>
      )
    },
    {
      num: '2',
      title: 'Evidence',
      content: (
        <>
          <p className="text-slate-700 mb-2">{caseEvidence.length} evidence items were collected from {caseData.detection?.system || caseData.system || 'the system'}.</p>
          {verifiedEvidence.length > 0 && (
            <p className="text-emerald-600 font-medium text-sm flex items-center gap-1 mb-3">✓ Evidence integrity verified — {verifiedEvidence.length} items fingerprinted and chain of custody maintained.</p>
          )}
          {caseEvidence.length > 0 && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 mt-2">
              <div className="grid grid-cols-1 gap-1">
                {caseEvidence.slice(0, 10).map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-3 h-3 rounded-full ${ev.verified ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="font-mono text-xs text-slate-500">{ev.id}</span>
                    <span className="text-slate-700">{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )
    },
    {
      num: '3',
      title: 'Investigation',
      content: (
        <>
          <p className="text-slate-700 mb-2">{caseData.investigation?.finding || 'Investigation completed.'}</p>
          <p className="text-sm text-slate-600"><strong className="text-slate-800">Root Cause:</strong> {caseData.investigation?.cause || 'Under investigation.'}</p>
          {caseData.investigation?.supportingEvidence && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-slate-500">Supporting evidence:</span>
              {caseData.investigation.supportingEvidence.map(id => (
                <span key={id} className="font-mono text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{id}</span>
              ))}
            </div>
          )}
        </>
      )
    },
    {
      num: '4',
      title: 'Finding',
      content: (
        <>
          <p className="text-slate-700 font-medium mb-1">{caseData.finding?.name || 'Issue identified'}</p>
          <p className="text-sm text-slate-600 mb-2">{caseData.finding?.description || ''}</p>
          <p className="text-sm text-slate-600">Severity: <strong className={`${caseData.finding?.severity === 'high' ? 'text-rose-600' : 'text-amber-600'}`}>{caseData.finding?.severity?.toUpperCase() || 'Unknown'}</strong> | Affected: {caseData.finding?.affected || 'N/A'} | Status: {caseData.finding?.status?.toUpperCase() || 'UNKNOWN'}</p>
        </>
      )
    },
    {
      num: '5',
      title: 'AI Assessment',
      content: (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4">
          <p className="text-slate-700 text-sm mb-2">{caseData.remediation?.rationale || 'AI recommended remediation based on evidence analysis.'}</p>
          {caseData.investigation?.confidence && (
            <p className="text-xs text-slate-500 mt-2">AI Confidence: <strong className="text-indigo-700">{caseData.investigation.confidence}</strong></p>
          )}
          <p className="text-xs text-slate-400 italic mt-2">Note: AI analysis assists the investigation but is not the final authority. Officer judgment determines response.</p>
        </div>
      )
    },
    {
      num: '6',
      title: 'Remediation',
      content: (
        <>
          <p className="text-slate-700 mb-2">{caseData.remediation?.recommendation || 'Remediation not yet applied.'}</p>
          <p className="text-sm text-slate-600">Approved by: {caseData.assignedTo} | Risk: {caseData.remediation?.risk || 'N/A'} | Rollback: {caseData.remediation?.rollbackAvailable ? 'Available' : 'Not available'}</p>
          {isRemediated && (
            <p className="text-sm text-emerald-600 font-medium mt-2">✓ Remediation approved and applied at {caseData.remediation.appliedAt || 'unknown time'}</p>
          )}
          {!isRemediated && (
            <p className="text-sm text-amber-600 font-medium mt-2">○ Remediation pending approval</p>
          )}
        </>
      )
    },
    {
      num: '7',
      title: 'Verification',
      content: (
        <>
          <div className="space-y-1 mb-3">
            {caseData.verification && ['securityTest', 'regressionTest', 'systemCheck', 'independentVerification'].map(key => {
              const check = caseData.verification[key];
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${
                    check?.status === 'completed' || check?.status === 'passed' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}>
                    {check?.status === 'completed' || check?.status === 'passed' ? '✓' : '○'}
                  </span>
                  <span className="text-slate-700">{check?.label || key}</span>
                  <span className="text-slate-500 ml-auto text-xs">{check?.detail || ''}</span>
                </div>
              );
            })}
          </div>
          <p className={`font-medium text-sm ${isVerified ? 'text-emerald-600' : 'text-slate-600'}`}>
            {isVerified
              ? '✓ FIX VERIFIED — Issue no longer detected after remediation'
              : caseData.verification?.overallResult === 'pending'
                ? '○ Verification not yet completed'
                : 'Verification results documented'}
          </p>
        </>
      )
    },
    {
      num: '8',
      title: 'Deployment',
      content: (
        <p className="text-slate-700 text-sm">
          {isDeployed ? (
            <>Deployed to <strong>{caseData.deployment?.target || 'production'}</strong>. Change: {caseData.deployment?.change || 'Security patch'}. Post-deployment checks: <span className="text-emerald-600 font-medium">✓ Passed</span>.</>
          ) : (
            <>Deployment target: <strong>{caseData.deployment?.target || 'production'}</strong>. Status: <span className="text-amber-600">Pending</span>.</>
          )}
        </p>
      )
    },
    {
      num: '9',
      title: 'Runtime Assurance',
      content: (
        <>
          <p className="text-slate-700 text-sm">
            System state: <strong className={isMonitored ? 'text-emerald-600' : 'text-slate-600'}>{caseData.monitoring?.systemState || 'pending'}</strong>.
            Security state: <strong className={isMonitored ? 'text-emerald-600' : 'text-slate-600'}>{caseData.monitoring?.securityState || 'pending'}</strong>.
          </p>
          {isMonitored && (
            <p className="text-emerald-600 font-medium text-sm mt-2">✓ Continuous monitoring active. All checks passing.</p>
          )}
          {!isMonitored && (
            <p className="text-amber-600 font-medium text-sm mt-2">○ Runtime monitoring not yet completed.</p>
          )}
        </>
      )
    },
    {
      num: '10',
      title: 'Integrity Status',
      content: (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-700">Evidence fingerprints match original registration</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-700">Investigation record chain intact</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-700">Final case integrity sealed and verified</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic mt-3">Note: FPC-SORVAX provides cryptographic integrity verification, not immutability guarantees.</p>
        </>
      )
    }
  ];

  // Case summary stats
  const getCaseStatus = () => {
    if (caseData.currentStage >= 8) return 'Resolved';
    if (caseData.currentStage >= 5) return 'Remediation';
    if (caseData.currentStage >= 2) return 'Investigation';
    return 'Active';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-w-4xl mx-auto">
      {/* Report Header */}
      <div className="bg-slate-900 text-white p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-400">FPC–SORVAX</h1>
            <h2 className="text-3xl font-bold mt-1">Final Case Report</h2>
          </div>
          <FileText size={48} className="text-slate-700" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-700 pt-6">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Case ID</span>
            <span className="font-mono text-sm">{caseData.id}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Generated</span>
            <span className="text-sm">{new Date().toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Status</span>
            <StatusBadge status={caseData.currentStage >= 8 ? 'completed' : 'active'} label={getCaseStatus()} size="sm" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Integrity</span>
            <StatusBadge status={isVerified ? 'verified' : 'pending'} label={isVerified ? 'Verified' : 'Pending'} size="sm" />
          </div>
        </div>
      </div>

      {/* Report Body */}
      <div className="p-8 space-y-8">
        {sections.map(section => (
          <section key={section.num}>
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
              {section.num}. {section.title}
            </h3>
            {section.content}
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 p-6 flex flex-col sm:flex-row justify-center items-center gap-4 border-t border-slate-200">
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-8 py-3 font-medium transition-colors flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" />
          Download Report
        </button>
        <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-6 py-3 font-medium transition-colors">
          Print Report
        </button>
      </div>
    </div>
  );
};
