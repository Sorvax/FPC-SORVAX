import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDemo } from '../context/DemoContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TamperAlert } from '../components/alerts/TamperAlert';
import { TamperInvestigation } from '../components/alerts/TamperInvestigation';
import { CaseWorkflow } from '../components/case/CaseWorkflow';
import { CaseHandover } from '../components/case/CaseHandover';
import { Timeline } from '../components/ui/Timeline';
import { EvidenceDetail } from '../components/case/EvidenceDetail';
import { getActiveStageId } from '../data/cases';
import { Shield, CheckCircle2, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';

export const CaseDetail = () => {
  const { caseId } = useParams();
  const { cases, tamperDetected, tamperedCaseId, evidenceItems } = useApp();
  const { demoStep } = useDemo();

  const caseData = cases.find(c => c.id === caseId);
  const [activeStageId, setActiveStageId] = useState('detected');
  const [activeTab, setActiveTab] = useState('workflow');
  const [showReconstruction, setShowReconstruction] = useState(false);

  useEffect(() => {
    if (caseData) {
      setActiveStageId(getActiveStageId(caseData));
    }
  }, [caseData, demoStep]);

  if (!caseData) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg">
          Case {caseId} not found.
        </div>
      </div>
    );
  }

  const isTampered = tamperDetected && tamperedCaseId === caseId;
  const caseEvidence = evidenceItems.filter(e => e.caseId === caseData.id);
  const timeline = caseData.timeline || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm font-medium text-slate-500">
        <Link to="/cases" className="hover:text-indigo-600 transition-colors">Cases</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-slate-900">{caseData.id}</span>
      </nav>

      {/* Case Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{caseData.id}</span>
              <StatusBadge
                status={caseData.severity === 'high' ? 'failed' : caseData.severity === 'medium' ? 'attention' : 'active'}
                label={caseData.severity.toUpperCase()}
                size="sm"
              />
              {isTampered && (
                <StatusBadge status="failed" label="TAMPER DETECTED" size="sm" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{caseData.title}</h1>
            <p className="text-slate-500 mt-1">{caseData.subtitle}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              <span>Assigned to: <strong className="text-slate-700">{caseData.assignedTo}</strong></span>
              <span>System: <strong className="text-slate-700">{caseData.system}</strong></span>
              <span>Evidence: <strong className="text-slate-700">{caseEvidence.length} items</strong></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge
              status={caseData.stages[caseData.currentStage]?.status || 'active'}
              label={caseData.stages[caseData.currentStage]?.label}
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Shield className="w-3.5 h-3.5" />
              Stage {caseData.currentStage + 1} of {caseData.stages.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tamper Alert */}
      {isTampered && (
        <div className="space-y-6">
          <TamperAlert caseId={caseId} />
          <TamperInvestigation caseId={caseId} />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'workflow', label: 'Workflow' },
            { id: 'handover', label: 'Handover Brief' },
            { id: 'history', label: 'Investigation History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'workflow' && (
          <CaseWorkflow
            caseData={caseData}
            activeStageId={activeStageId}
            onStageChange={setActiveStageId}
          />
        )}
        {activeTab === 'handover' && (
          <CaseHandover caseData={caseData} />
        )}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900">Investigation Timeline</h3>
              <button
                onClick={() => setShowReconstruction(!showReconstruction)}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {showReconstruction ? 'Hide Reconstruction' : 'Reconstruct Investigation'}
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {showReconstruction
                ? 'Chronological reconstruction of the investigation. Click any event for details.'
                : 'Click any event to view technical details'}
            </p>

            {/* Investigation Reconstruction */}
            {showReconstruction && (
              <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Reconstructed Investigation</h4>
                <div className="space-y-4">
                  {timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-4 group">
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-xs font-semibold text-slate-500 w-12 text-right shrink-0">{event.time}</span>
                        {idx < timeline.length - 1 && <div className="w-px h-full bg-slate-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-medium text-slate-900">{event.title}</h5>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            event.type === 'detection' ? 'bg-amber-100 text-amber-700' :
                            event.type === 'evidence' ? 'bg-sky-100 text-sky-700' :
                            event.type === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                            event.type === 'investigation' ? 'bg-indigo-100 text-indigo-700' :
                            event.type === 'finding' ? 'bg-rose-100 text-rose-700' :
                            event.type === 'recommendation' ? 'bg-violet-100 text-violet-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {event.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">{event.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span>Case: {caseData.id}</span>
                          <span>•</span>
                          <span className="text-emerald-600">✓ Verified</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Consistency Check */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Consistency Check</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-slate-700">Evidence timeline consistent</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-slate-700">Case timestamps consistent</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-slate-700">Investigation sequence consistent</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-slate-700">Action sequence consistent</span>
                    </div>
                  </div>
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 italic">
                      AI: "All investigation records, evidence timestamps, and action sequences are internally consistent. No anomalies detected in the case timeline."
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Timeline events={timeline} />
          </div>
        )}
      </div>
    </div>
  );
};
