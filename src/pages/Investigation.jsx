import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ExpandableSection } from '../components/ui/ExpandableSection';
import {
  Search, AlertTriangle, CheckCircle2, ChevronRight,
  RefreshCw, Shield, FileText, Clock, ArrowRight
} from 'lucide-react';

export const Investigation = () => {
  const { caseId } = useParams();
  const [investigation, setInvestigation] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasRun, setHasRun] = useState(false);

  // Try to load existing investigation on mount
  useEffect(() => {
    if (caseId) {
      loadExistingInvestigation();
    }
  }, [caseId]);

  const loadExistingInvestigation = async () => {
    try {
      const inv = await api.getInvestigation(caseId);
      setInvestigation(inv);
      setHasRun(true);

      const [tl, fd] = await Promise.all([
        api.getInvestigationTimeline(caseId),
        api.getInvestigationFindings(caseId),
      ]);
      setTimeline(tl.events || []);
      setFindings(fd.findings || []);
    } catch (err) {
      // No existing investigation - that's fine
      setHasRun(false);
    }
  };

  const runInvestigation = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.runInvestigation(caseId, {
        adapter: 'mock',
        scenario: 'suspicious-data-access',
      });
      setInvestigation(result);
      setTimeline(result.timeline || []);
      setFindings(result.findings || []);
      setHasRun(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'low': return 'bg-sky-100 text-sky-800 border-sky-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'FAILED_LOGIN': return '🔴';
      case 'SUCCESSFUL_LOGIN': return '🟢';
      case 'PRIVILEGE_ESCALATION': return '🟠';
      case 'USB_CONNECTED': return '🔌';
      case 'SENSITIVE_FILE_ACCESS': return '📁';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm font-medium text-slate-500">
        <Link to="/cases" className="hover:text-indigo-600 transition-colors">Cases</Link>
        <span className="mx-2">&gt;</span>
        <Link to={`/cases/${caseId}`} className="hover:text-indigo-600 transition-colors">{caseId}</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-slate-900">Investigation</span>
      </nav>

      {/* Investigation Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{caseId}</span>
              <StatusBadge
                status={investigation?.status === 'completed' ? 'completed' : 'pending'}
                label={investigation?.status === 'completed' ? 'Completed' : 'Not Run'}
                size="sm"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Investigation</h1>
            <p className="text-slate-500 mt-1">
              {investigation?.summary || 'Run an investigation to analyze evidence and identify findings.'}
            </p>
          </div>
          <button
            onClick={runInvestigation}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {hasRun ? 'Re-run Investigation' : 'Run Investigation'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg">
          Investigation failed: {error}
        </div>
      )}

      {/* Investigation Results */}
      {hasRun && investigation && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center">
              <div className="text-3xl font-bold text-indigo-600">{investigation.evidenceReviewed}</div>
              <div className="text-sm text-slate-500 mt-1">Evidence Reviewed</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center">
              <div className="text-3xl font-bold text-indigo-600">{investigation.eventsCorrelated}</div>
              <div className="text-sm text-slate-500 mt-1">Events Correlated</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center">
              <div className="text-3xl font-bold text-indigo-600">{investigation.findingsCount}</div>
              <div className="text-sm text-slate-500 mt-1">Findings</div>
            </div>
          </div>

          {/* What Happened? */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">What Happened?</h2>
            <p className="text-slate-700 leading-relaxed">
              {investigation.summary}
            </p>
          </div>

          {/* Investigation Timeline */}
          {timeline.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Investigation Timeline</h2>
              <div className="space-y-1">
                {timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex items-start gap-4 group">
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-xs font-semibold text-slate-500 w-12 text-right shrink-0">
                        {event.time}
                      </span>
                      {idx < timeline.length - 1 && <div className="w-px h-full bg-slate-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getEventIcon(event.eventType)}</span>
                        <h4 className="text-sm font-medium text-slate-900">{event.title}</h4>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 ml-7">{event.description}</p>
                      {event.evidenceId && (
                        <div className="flex items-center gap-2 mt-1 ml-7 text-xs text-slate-400">
                          <FileText className="w-3 h-3" />
                          <span>Evidence: {event.evidenceId}</span>
                          <span>•</span>
                          <span className="text-emerald-600">✓ Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Findings</h2>
              {findings.map((finding) => (
                <div key={finding.findingId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{finding.title}</h3>
                          <StatusBadge status={finding.severity} label={finding.severity.toUpperCase()} size="sm" />
                        </div>
                        <p className="text-slate-700 mb-4">{finding.description}</p>

                        {/* Supporting Evidence */}
                        {finding.supportingEvidence && finding.supportingEvidence.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              Supported Evidence
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {finding.supportingEvidence.map(evId => (
                                <span
                                  key={evId}
                                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-mono"
                                >
                                  <FileText className="w-3 h-3" />
                                  {evId}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Affected Asset */}
                        {finding.affectedAsset && (
                          <div className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">Affected Asset:</span> {finding.affectedAsset}
                          </div>
                        )}

                        {/* Confidence */}
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Confidence:</span>{' '}
                          <span className={finding.confidence === 'high' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                            {finding.confidence}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Next Step */}
                  {finding.recommendedNextStep && (
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            What Happens Next
                          </h4>
                          <p className="text-sm text-slate-700">{finding.recommendedNextStep}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Technical Details (Expandable) */}
          <ExpandableSection title="Technical Details" defaultOpen={false}>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Investigation Metadata
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Investigation ID:</span>
                    <span className="ml-2 font-mono text-slate-700">{investigation.investigationId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Adapter Used:</span>
                    <span className="ml-2 font-mono text-slate-700">{investigation.adapterUsed}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Started:</span>
                    <span className="ml-2 text-slate-700">{investigation.startedAt}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Completed:</span>
                    <span className="ml-2 text-slate-700">{investigation.completedAt}</span>
                  </div>
                </div>
              </div>

              {/* Raw Events */}
              {investigation.events && investigation.events.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Normalized Events ({investigation.events.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-slate-500 font-semibold">Time</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-semibold">Event</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-semibold">Source</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-semibold">Actor</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-semibold">Target</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-semibold">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investigation.events.map((event, idx) => (
                          <tr key={event.id || idx} className="border-b border-slate-100">
                            <td className="py-2 px-3 font-mono text-slate-600">{event.timestamp?.substring(11, 16)}</td>
                            <td className="py-2 px-3 text-slate-700">{event.eventType}</td>
                            <td className="py-2 px-3 text-slate-600">{event.source}</td>
                            <td className="py-2 px-3 text-slate-600">{event.actor}</td>
                            <td className="py-2 px-3 text-slate-600">{event.target}</td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${getSeverityColor(event.severity)}`}>
                                {event.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </ExpandableSection>
        </>
      )}
    </div>
  );
};
