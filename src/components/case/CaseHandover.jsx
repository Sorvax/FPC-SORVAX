import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { AICard } from '../ai/AICard';
import { CheckCircle2, Circle, ArrowRight, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client.js';

export const CaseHandover = ({ caseData }) => {
  const { evidenceItems } = useApp();

  if (!caseData) return null;

  const completedStages = caseData.stages.filter(s => s.status === 'completed');
  const activeStage = caseData.stages.find(s => s.status === 'active');
  const pendingStages = caseData.stages.filter(s => s.status === 'pending');

  // Dynamic evidence count
  const caseEvidence = evidenceItems.filter(e => e.caseId === caseData.id);
  const verifiedEvidence = caseEvidence.filter(e => e.verified).length;

  // Dynamic completed/pending items
  const completedItems = [];
  if (completedStages.length > 0) completedItems.push('Detection completed');
  if (caseData.evidenceVerified) completedItems.push('Evidence collected and verified');
  if (completedStages.find(s => s.id === 'investigation')) completedItems.push('Investigation completed');
  if (completedStages.find(s => s.id === 'finding')) completedItems.push('Finding confirmed');
  if (caseData.remediation?.approved) completedItems.push('Remediation approved');
  if (caseData.fixSteps?.every(s => s.status === 'completed')) completedItems.push('Fix applied');
  if (caseData.verification?.overallResult === 'verified') completedItems.push('Fix independently verified');
  if (caseData.deployment?.status === 'completed') completedItems.push('Deployment completed');
  if (caseData.monitoring?.runtimeAudit === 'verified') completedItems.push('Runtime audit completed');

  const pendingItems = [];
  if (!caseData.remediation?.approved) pendingItems.push('Remediation approval');
  if (caseData.remediation?.approved && !caseData.fixSteps?.every(s => s.status === 'completed')) pendingItems.push('Fix application');
  if (caseData.fixSteps?.every(s => s.status === 'completed') && caseData.verification?.overallResult !== 'verified') pendingItems.push('Independent verification');
  if (caseData.verification?.overallResult === 'verified' && caseData.deployment?.status !== 'completed') pendingItems.push('Deployment');
  if (caseData.deployment?.status === 'completed' && caseData.monitoring?.runtimeAudit !== 'verified') pendingItems.push('Runtime audit');

  const getNextStepText = () => {
    if (!activeStage) {
      if (caseData.currentStage >= 8) return 'Case is complete. No further action required.';
      return 'No pending actions.';
    }
    switch (activeStage.id) {
      case 'remediation': return 'Review and approve the proposed remediation.';
      case 'verification': return 'Run independent verification on the applied fix.';
      case 'deployment': return 'Deploy the verified fix to the target system.';
      case 'monitoring': return 'Run runtime audit to confirm system security.';
      default: return `Proceed to ${activeStage.label}.`;
    }
  };

  // Current status summary
  const getStatusSummary = () => {
    const stage = caseData.stages[caseData.currentStage];
    return stage ? stage.label : 'Complete';
  };

  return (
    <Card className="border-indigo-200 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Case Handover</h3>
          <p className="text-sm text-slate-500 mt-1">Dynamic briefing for the receiving officer</p>
        </div>
        <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{caseData.id}</span>
      </div>

      {/* Situation */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Situation</h4>
        <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
          {caseData.detection?.description || 'Investigation in progress.'}
        </p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div>
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Current Status</span>
          <span className="text-slate-900 font-medium text-sm">{getStatusSummary()}</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Evidence Count</span>
          <span className="text-slate-900 font-medium text-sm">{caseEvidence.length} items ({verifiedEvidence} verified)</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Verification</span>
          <span className={`font-medium text-sm ${caseData.verification?.overallResult === 'verified' ? 'text-emerald-600' : 'text-slate-600'}`}>
            {caseData.verification?.overallResult === 'verified' ? '✓ Verified' : 'Pending'}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Stage Progress</span>
          <span className="text-slate-900 font-medium text-sm">{completedStages.length}/{caseData.stages.length}</span>
        </div>
      </div>

      {/* Officer Transfer */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div>
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Current Officer</span>
          <span className="text-slate-900 font-medium">{caseData.assignedTo || 'Current User'}</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Receiving Officer</span>
          <input
            type="text"
            placeholder="Enter officer name"
            className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* AI Handover Summary */}
      <div className="mb-6">
        <AIHandoverSummary caseId={caseData.id} caseData={caseData} />
      </div>

      {/* Completed */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Completed</h4>
        {completedItems.length > 0 ? (
          <div className="space-y-2">
            {completedItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No completed items yet.</p>
        )}
      </div>

      {/* Pending */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Pending</h4>
        {pendingItems.length > 0 ? (
          <div className="space-y-2">
            {pendingItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-indigo-700 font-medium">
                <Circle size={18} className="text-indigo-500 fill-indigo-100 shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-600 font-medium">All items complete.</p>
        )}
      </div>

      {/* Recommended Next Step */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-indigo-900">Recommended Next Step</h4>
          <p className="text-sm text-indigo-700 mt-0.5">{getNextStepText()}</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 font-medium transition-colors flex items-center gap-2">
          Transfer Case
        </button>
      </div>
    </Card>
  );
};

/**
 * AIHandoverSummary - Fetches AI-generated handover from backend.
 */
const AIHandoverSummary = ({ caseId, caseData }) => {
  const [handover, setHandover] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    api.getAIHandover(caseId)
      .then(result => { setHandover(result); setLoading(false); })
      .catch(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <AICard title="AI Handover Summary" subtitle="Generating handover brief...">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          <span className="text-sm">Generating handover...</span>
        </div>
      </AICard>
    );
  }

  if (handover) {
    return (
      <AICard
        title="AI Handover Summary"
        subtitle="AI-generated brief for the receiving officer"
        confidence={handover.confidence}
        provider={handover}
      >
        <div className="space-y-3">
          {handover.situation && (
            <p className="text-slate-700 text-sm"><strong className="text-slate-900">Situation:</strong> {handover.situation}</p>
          )}
          {handover.evidenceCollected && (
            <p className="text-slate-700 text-sm"><strong className="text-slate-900">Evidence:</strong> {handover.evidenceCollected}</p>
          )}
          {handover.finding && (
            <p className="text-slate-700 text-sm"><strong className="text-slate-900">Finding:</strong> {handover.finding}</p>
          )}
          {handover.actionsAlreadyTaken && (
            <p className="text-slate-700 text-sm"><strong className="text-slate-900">Actions Taken:</strong> {handover.actionsAlreadyTaken}</p>
          )}
          {handover.pendingActions && (
            <p className="text-slate-700 text-sm"><strong className="text-slate-900">Pending:</strong> {handover.pendingActions}</p>
          )}
          {handover.recommendedNextStep && (
            <p className="text-slate-700 text-sm"><strong className="text-slate-900">Next Step:</strong> {handover.recommendedNextStep}</p>
          )}
          {handover.correlationId && (
            <p className="text-[10px] text-slate-400 font-mono mt-2">Correlation ID: {handover.correlationId}</p>
          )}
        </div>
      </AICard>
    );
  }

  // Fallback to static summary
  return (
    <AICard title="Case Summary" subtitle="Case data summary (AI unavailable)">
      <p className="text-slate-600 text-sm italic">Handover summary not available. The AI will generate a summary once connected.</p>
    </AICard>
  );
};
