import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { FileText, CheckCircle2, ArrowRight, Shield } from 'lucide-react';

/**
 * StagePostPatchReport — Post-Patch Report
 *
 * Generated AFTER remediation, verification, deployment, and runtime audit.
 *
 * Compares BEFORE → AFTER state:
 * - Original finding
 * - Recommended remediation
 * - Approved remediation
 * - Action performed
 * - Verification result
 * - Deployment result
 * - Runtime audit result
 * - Remaining risks
 * - Final status
 */
export const StagePostPatchReport = ({ caseData, findings, evidence }) => {
  if (!caseData) return null;

  const finding = findings?.[0] || caseData.finding;
  const remediation = caseData.remediation;
  const verification = caseData.verification;
  const deployment = caseData.deployment;
  const monitoring = caseData.monitoring;

  const isVerified = verification?.overallResult === 'verified';
  const isDeployed = deployment?.status === 'completed';
  const isMonitored = monitoring?.runtimeAudit === 'verified';
  const allPassed = isVerified && isDeployed && isMonitored;

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>

        <div className="flex items-center gap-2 mb-6">
          <FileText className="text-emerald-600" size={20} />
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm">
            Post-Patch Report
          </h3>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            allPassed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {allPassed ? 'RESOLVED' : 'IN PROGRESS'}
          </span>
        </div>

        {/* Before → After Summary */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Before</span>
              <span className="text-sm font-medium text-slate-900">
                {finding?.title || 'Issue detected'}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Severity: {finding?.severity?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="text-slate-400" size={24} />
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs text-emerald-600 uppercase font-semibold block mb-1">After</span>
              <span className="text-sm font-medium text-emerald-900">
                {allPassed ? 'Issue Resolved' : 'Remediation Applied'}
              </span>
              <p className="text-xs text-emerald-600 mt-1">
                Final Status: {allPassed ? 'RESOLVED' : 'PENDING'}
              </p>
            </div>
          </div>
        </div>

        {/* Finding Details */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Original Finding</h4>
          <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
            <p className="text-sm font-medium text-slate-900">{finding?.title || 'Unknown finding'}</p>
            <p className="text-xs text-slate-500 mt-1">Severity: {finding?.severity?.toUpperCase()} | Confidence: {finding?.confidence}</p>
            <p className="text-sm text-slate-600 mt-2">{finding?.description || 'No description available.'}</p>
          </div>
        </div>

        {/* Remediation Comparison */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Remediation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <span className="text-xs text-indigo-600 uppercase font-semibold block mb-1">Recommended</span>
              <p className="text-sm text-indigo-800">{remediation?.recommendation || 'N/A'}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <span className="text-xs text-emerald-600 uppercase font-semibold block mb-1">Approved & Applied</span>
              <p className="text-sm text-emerald-800">{remediation?.recommendation || 'N/A'}</p>
              {remediation?.appliedAt && (
                <p className="text-xs text-emerald-600 mt-1">Applied at: {remediation.appliedAt}</p>
              )}
            </div>
          </div>
        </div>

        {/* Verification, Deployment, Monitoring Results */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Results</h4>
          <div className="space-y-3">
            {/* Verification */}
            <div className={`p-4 rounded-lg border ${
              isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">Independent Verification</span>
                <StatusBadge
                  status={isVerified ? 'verified' : 'pending'}
                  label={isVerified ? 'PASSED' : 'PENDING'}
                  size="sm"
                />
              </div>
              {verification?.securityTest && (
                <p className="text-xs text-slate-500 mt-1">{verification.securityTest.detail}</p>
              )}
            </div>

            {/* Deployment */}
            <div className={`p-4 rounded-lg border ${
              isDeployed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">Deployment</span>
                <StatusBadge
                  status={isDeployed ? 'verified' : 'pending'}
                  label={isDeployed ? 'SUCCESSFUL' : 'PENDING'}
                  size="sm"
                />
              </div>
              {deployment?.change && (
                <p className="text-xs text-slate-500 mt-1">{deployment.change}</p>
              )}
            </div>

            {/* Runtime Audit */}
            <div className={`p-4 rounded-lg border ${
              isMonitored ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">Runtime Audit</span>
                <StatusBadge
                  status={isMonitored ? 'verified' : 'pending'}
                  label={isMonitored ? 'PASSED' : 'PENDING'}
                  size="sm"
                />
              </div>
              {monitoring?.lastCheck && (
                <p className="text-xs text-slate-500 mt-1">Last check: {monitoring.lastCheck}</p>
              )}
            </div>
          </div>
        </div>

        {/* Final Status */}
        <div className={`p-4 rounded-lg border ${
          allPassed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            {allPassed ? (
              <CheckCircle2 className="text-emerald-500" size={24} />
            ) : (
              <Shield className="text-amber-500" size={24} />
            )}
            <div>
              <p className="text-sm font-bold text-slate-900">
                Final Status: {allPassed ? 'RESOLVED' : 'PENDING VERIFICATION'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {allPassed
                  ? 'The issue has been remediated, verified, deployed, and continuously monitored.'
                  : 'Remediation applied. Awaiting verification and deployment completion.'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
