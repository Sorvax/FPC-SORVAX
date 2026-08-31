import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { ExpandableSection } from '../ui/ExpandableSection';
import { Rocket, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StageDeployment = ({ deployment, caseId }) => {
  const { updateCase, showToast } = useApp();
  const [deploying, setDeploying] = useState(false);
  const [deployPhase, setDeployPhase] = useState(0);

  const isDeployed = deployment?.status === 'completed' || deployment?.status === 'deployed';
  const isPending = !isDeployed && !deploying;

  const deployPhases = [
    'Initializing deployment',
    'Deploying to target',
    'Running post-deployment checks',
    'Verifying security state'
  ];

  const startDeployment = () => {
    setDeploying(true);
    setDeployPhase(0);
  };

  // Deployment animation
  useEffect(() => {
    if (!deploying) return;

    const totalPhases = deployPhases.length;

    if (deployPhase >= totalPhases) {
      updateCase(caseId, {
        deployment: {
          ...deployment,
          status: 'completed',
          postDeployCheck: 'completed',
          securityState: 'completed'
        }
      });
      setDeploying(false);
      showToast('Deployment completed successfully', 'success');
      return;
    }

    const timer = setTimeout(() => {
      setDeployPhase(prev => prev + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [deploying, deployPhase, caseId, deployment, updateCase, showToast]);

  if (!deployment) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm">Deployment</h3>

      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <Rocket className="w-5 h-5 text-indigo-600" />
          <div>
            <span className="text-sm font-semibold text-slate-900">{deployment.change || 'Security Patch'}</span>
            <span className="text-sm text-slate-500 ml-2">→ {deployment.target || 'Production'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Target Environment</span>
            <span className="text-slate-900 font-medium">{deployment.target || 'Production'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Change Scope</span>
            <span className="text-slate-900">{deployment.change}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Deployment Status</span>
            <StatusBadge
              status={isDeployed ? 'completed' : deploying ? 'active' : 'pending'}
              label={isDeployed ? 'Deployed' : deploying ? 'Deploying' : 'Pending'}
              size="sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Post-Deployment Check</span>
            <StatusBadge
              status={deployment.postDeployCheck === 'completed' || deployment.postDeployCheck === 'passed' ? 'verified' : 'pending'}
              label={deployment.postDeployCheck === 'completed' ? 'Passed' : 'Pending'}
              size="sm"
            />
          </div>
        </div>

        {/* Deployment progress */}
        {deploying && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-sm font-semibold text-indigo-900">Deploying...</span>
            </div>
            <div className="space-y-2">
              {deployPhases.map((phase, idx) => {
                const isDone = idx < deployPhase;
                const isCurrent = idx === deployPhase;
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
                      {phase}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isDeployed && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-emerald-800 font-medium">✓ Successfully deployed to {deployment.target}. Post-deployment verification passed.</p>
          </div>
        )}

        {/* Deploy button */}
        {isPending && !deploying && (
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Ready to deploy verified remediation</span>
            </div>
            <button
              onClick={startDeployment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Deploy Fix
            </button>
          </div>
        )}

        <ExpandableSection title="View deployment details">
          <div className="bg-slate-900 p-4 rounded-lg text-slate-300 font-mono text-sm">
            <p className="text-indigo-400"># DEPLOYMENT LOG</p>
            <p>Target: {deployment.target}</p>
            <p>Change: {deployment.change}</p>
            <p>Commit: {deployment.commitHash || 'a1b2c3d4'}</p>
            <p>Pipeline: {deployment.pipelineId || 'pipe-88392'}</p>
            <p className={`mt-2 ${isDeployed ? 'text-emerald-400' : 'text-amber-400'}`}>Status: {isDeployed ? 'SUCCESS' : deploying ? 'IN PROGRESS' : 'PENDING'}</p>
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
};
