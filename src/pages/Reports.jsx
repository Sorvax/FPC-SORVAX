import React, { useState, useEffect } from 'react';
import { Search, Wrench, ShieldCheck, FileText, ChevronDown, Download, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDemo } from '../context/DemoContext';
import { FinalCaseReport } from '../components/reports/FinalCaseReport';

export const Reports = () => {
  const { cases } = useApp();
  const { demoStep } = useDemo();
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [generatedReport, setGeneratedReport] = useState(null);

  useEffect(() => {
    if (demoStep >= 11) {
      const case241 = cases.find(c => c.id === 'CASE-0241');
      if (case241) {
        setSelectedCaseId(case241.id);
        setGeneratedReport({ type: 'final', caseId: case241.id });
      }
    }
  }, [demoStep, cases]);

  // Always use the latest case data from context
  const selectedCase = selectedCaseId ? cases.find(c => c.id === selectedCaseId) : null;

  const handleGenerate = (type) => {
    if (!selectedCaseId) return;
    setGeneratedReport({ type, caseId: selectedCaseId });
  };

  const reportTypes = [
    { id: 'investigation', title: 'Investigation Report', desc: 'Summary of findings and evidence collected', icon: Search },
    { id: 'remediation', title: 'Remediation Report', desc: 'Actions taken and results achieved', icon: Wrench },
    { id: 'assurance', title: 'Assurance Report', desc: 'Verification and monitoring results', icon: ShieldCheck },
    { id: 'final', title: 'Final Case Report', desc: 'Complete case lifecycle narrative', icon: FileText, primary: true }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">Generate reports for completed investigations</p>
      </div>

      {/* Case Selection */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Case for Reporting</label>
        <div className="relative max-w-md">
          <select
            value={selectedCaseId}
            onChange={(e) => {
              setSelectedCaseId(e.target.value);
              setGeneratedReport(null);
            }}
            className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2.5 pl-3 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">-- Select a Case --</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.id} — {c.title}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {selectedCase && (
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
            <span>Stage: <strong className="text-slate-700">{selectedCase.stages[selectedCase.currentStage]?.label || 'Complete'}</strong></span>
            <span>Evidence: <strong className="text-slate-700">{selectedCase.evidenceItems?.length || 0} items</strong></span>
            <span className={`font-medium ${selectedCase.verification?.overallResult === 'verified' ? 'text-emerald-600' : 'text-slate-600'}`}>
              Verification: {selectedCase.verification?.overallResult === 'verified' ? '✓ Verified' : 'Pending'}
            </span>
          </div>
        )}
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map(rt => (
          <div key={rt.id} className={`bg-white border rounded-xl shadow-sm p-5 flex flex-col ${rt.primary ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${rt.primary ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                <rt.icon className={`h-5 w-5 ${rt.primary ? 'text-indigo-600' : 'text-slate-600'}`} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">{rt.title}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 flex-grow">{rt.desc}</p>
            <button
              onClick={() => handleGenerate(rt.id)}
              disabled={!selectedCaseId}
              className={`w-full py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 ${
                selectedCaseId
                  ? rt.primary
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Generate
            </button>
          </div>
        ))}
      </div>

      {/* Generated Report */}
      {generatedReport && generatedReport.type === 'final' && selectedCase && (
        <div className="mt-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">Generated Report</h2>
            <button className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
          <FinalCaseReport caseData={selectedCase} />
        </div>
      )}

      {generatedReport && generatedReport.type !== 'final' && (
        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">Report type '{generatedReport.type}' is a preview.</p>
          <p className="text-sm text-slate-400">Use "Final Case Report" for the complete demo output.</p>
        </div>
      )}

      {!generatedReport && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Report Generated</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Select a case above and choose a report type to generate a detailed investigation report.
          </p>
        </div>
      )}
    </div>
  );
};
