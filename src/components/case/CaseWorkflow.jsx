import React from 'react';
import { Stepper } from '../ui/Stepper';
import { StageDetected } from './StageDetected';
import { StageEvidence } from './StageEvidence';
import { StageInvestigation } from './StageInvestigation';
import { StageFinding } from './StageFinding';
import { StageInitialReport } from './StageInitialReport';
import { StageDecision } from './StageDecision';
import { StageRemediation } from './StageRemediation';
import { StageVerification } from './StageVerification';
import { StageDeployment } from './StageDeployment';
import { StageMonitoring } from './StageMonitoring';
import { StagePostPatchReport } from './StagePostPatchReport';
import { StageFixProgress } from './StageFixProgress';
import { Card } from '../ui/Card';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const nextStepMessages = {
  detected: { message: 'Begin collecting evidence for this case.', label: 'Go to Evidence' },
  evidence: { message: 'Evidence collected. Proceed to investigation.', label: 'View Investigation' },
  investigation: { message: 'Investigation complete. Review the recommended fix.', label: 'Review Finding' },
  finding: { message: 'Issue identified. Review the recommended fix.', label: 'Review Fix' },
  remediation: { message: 'Review the AI recommendation and approve the fix.', label: 'Review Recommendation' },
  verification: { message: 'Fix applied. Verify the result.', label: 'Verify Fix' },
  deployment: { message: 'Fix verified. Deploy to production.', label: 'Review Deployment' },
  monitoring: { message: 'Deployment complete. Monitor the system.', label: 'View Monitoring' },
  complete: { message: 'Case resolved successfully.', label: 'View Report' },
};

export const CaseWorkflow = ({ caseData, activeStageId, onStageChange }) => {
  const nextInfo = nextStepMessages[activeStageId];

  const renderStageContent = () => {
    switch (activeStageId) {
      case 'detected':
        return <StageDetected detection={caseData.detection} severity={caseData.severity} />;
      case 'evidence':
        return <StageEvidence evidenceIds={caseData.evidenceItems} evidenceVerified={caseData.evidenceVerified} caseId={caseData.id} />;
      case 'investigation':
        return <StageInvestigation investigation={caseData.investigation} caseId={caseData.id} />;
      case 'finding':
        return <StageFinding finding={caseData.finding} caseId={caseData.id} />;
      case 'report':
        return (
          <StageInitialReport
            caseData={caseData}
            findings={[]}
            evidence={(caseData.evidenceItems || []).map(id => ({ evidence_id: id, verified: true }))}
            timeline={caseData.timeline || []}
          />
        );
      case 'decision':
        return <StageDecision caseData={caseData} onStageChange={onStageChange} />;
      case 'remediation':
        // Show fix progress if fix is running or completed
        const fixStepsAllDone = caseData.fixSteps?.every(s => s.status === 'completed');
        const fixStarted = caseData.fixSteps?.some(s => s.status === 'completed' || s.status === 'active');

        if (fixStarted && !fixStepsAllDone) {
          return (
            <div className="space-y-6">
              <StageRemediation
                remediation={caseData.remediation}
                finding={caseData.finding}
                caseId={caseData.id}
              />
              {caseData.fixSteps && (
                <StageFixProgress steps={caseData.fixSteps} />
              )}
            </div>
          );
        }

        return (
          <StageRemediation
            remediation={caseData.remediation}
            finding={caseData.finding}
            caseId={caseData.id}
          />
        );
      case 'verification':
        return <StageVerification verification={caseData.verification} caseId={caseData.id} />;
      case 'deployment':
        return <StageDeployment deployment={caseData.deployment} caseId={caseData.id} />;
      case 'monitoring':
        return <StageMonitoring monitoring={caseData.monitoring} caseId={caseData.id} />;
      case 'postpatch':
        return (
          <StagePostPatchReport
            caseData={caseData}
            findings={[]}
            evidence={(caseData.evidenceItems || []).map(id => ({ evidence_id: id, verified: true }))}
          />
        );
      case 'complete':
        return (
          <Card className="border-emerald-200 bg-emerald-50">
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <CheckCircle2 size={48} className="text-emerald-500" />
              <h2 className="text-2xl font-bold text-slate-900">Case Resolved</h2>
              <p className="text-slate-600 max-w-md">
                The issue has been successfully remediated, verified, and continuous monitoring is active. No further action is required at this time.
              </p>
            </div>
          </Card>
        );
      default:
        return <div className="p-4 text-slate-500">Stage content not found.</div>;
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <Stepper
          steps={caseData.stages}
          activeStepId={activeStageId}
          onStepClick={onStageChange}
          orientation="horizontal"
        />
      </div>

      {/* Next Step Banner */}
      {nextInfo && activeStageId !== 'complete' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">What happens next</span>
              <p className="text-sm font-medium text-indigo-900 mt-0.5">{nextInfo.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="stage-content">
        {renderStageContent()}
      </div>
    </div>
  );
};
