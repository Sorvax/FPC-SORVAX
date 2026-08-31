import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { AlertTriangle, Shield, Eye, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext';

export const TamperInvestigation = ({ caseId }) => {
  const { evidenceItems } = useApp();
  const [chainResult, setChainResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyChain = async () => {
      try {
        const result = await api.verifyProvenanceChain(caseId);
        setChainResult(result);
      } catch (err) {
        console.error('Chain verification failed:', err);
      }
      setLoading(false);
    };
    verifyChain();
  }, [caseId]);

  const caseEvidence = evidenceItems.filter(e => e.caseId === caseId);
  const compromisedEvidence = caseEvidence.filter(e => !e.verified);

  return (
    <Card className="border-rose-200 shadow-md">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <AlertTriangle className="text-rose-500" size={24} />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Integrity Investigation</h2>
          <p className="text-sm text-slate-500">Cryptographic verification detected an inconsistency</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* What Happened */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">What Happened</h3>
          </div>
          <p className="text-lg text-slate-800 font-medium bg-rose-50 p-4 rounded-lg border border-rose-100">
            A stored evidence record no longer matches its original verified fingerprint.
          </p>
          <p className="text-sm text-slate-600 mt-2">
            FPC–SORVAX detected that stored evidence no longer matches its original SHA-256 fingerprint. This was caught through cryptographic hash comparison — the system's integrity verification mechanism.
          </p>

          {compromisedEvidence.length > 0 && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
              <p><strong className="text-slate-700">Case:</strong> <span className="font-mono">{caseId}</span></p>
              {compromisedEvidence.map(ev => (
                <p key={ev.id}>
                  <strong className="text-slate-700">Affected Evidence:</strong> <span className="font-mono">{ev.id}</span> — {ev.label}
                </p>
              ))}
              <p><strong className="text-slate-700">Reason:</strong> Evidence content no longer matches its original hash.</p>
            </div>
          )}
        </section>

        {/* Provenance Chain Verification */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Provenance Chain Verification</h3>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Verifying provenance chain...</p>
          ) : chainResult ? (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${chainResult.chain_valid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                {chainResult.chain_valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500" />
                )}
                <span className={`font-medium ${chainResult.chain_valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {chainResult.chain_valid ? '✓ Provenance Chain Verified' : '⚠ Provenance Chain Integrity Issue'}
                </span>
                <span className="text-xs text-slate-500 ml-auto">{chainResult.event_count} events</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Event Chain</h4>
                <div className="space-y-1">
                  {chainResult.events?.map((event, i) => (
                    <div key={event.event_id} className="flex items-center gap-2 text-sm">
                      {event.overall_valid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="font-mono text-xs text-slate-400">{event.event_id}</span>
                      <span className="text-slate-700">{event.event_type}</span>
                      {i > 0 && !event.chain_link_valid && (
                        <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">chain broken</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Unable to verify provenance chain.</p>
          )}
        </section>

        {/* AI Analysis placeholder */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Analysis</h3>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            The system identified the affected evidence and verified the surrounding case history to help understand what happened.
          </p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <p className="text-sm text-slate-700">
              Cryptographic verification detected a mismatch between the stored evidence hash and the recalculated hash.
              The provenance chain has been checked for consistency.
              The investigation should not proceed until the integrity issue is understood and resolved.
            </p>
            <p className="text-xs text-slate-500 italic mt-2">
              Note: AI analysis assists the investigation but is not the final authority. Officer judgment determines response.
            </p>
          </div>
        </section>

        {/* Recommended Action */}
        <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Recommended Action</h3>
          </div>
          <p className="text-slate-700 mb-4">
            Review the affected evidence before continuing the investigation. The investigation should not proceed until the integrity issue is understood and resolved.
          </p>

          <div className="flex flex-wrap gap-3">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium transition-colors">
              Review Evidence
            </button>
            <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 font-medium transition-colors">
              View Investigation History
            </button>
          </div>
        </section>
      </div>
    </Card>
  );
};
