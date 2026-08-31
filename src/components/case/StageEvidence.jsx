import React, { useState } from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { ExpandableSection } from '../ui/ExpandableSection';
import { Check, ShieldCheck, ShieldAlert, Plus, FolderLock, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AddEvidenceModal } from './AddEvidenceModal';
import { EvidenceDetail } from './EvidenceDetail';

export const StageEvidence = ({ evidenceIds, evidenceVerified, caseId }) => {
  const { evidenceItems } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  // Get evidence for this case
  const caseEvidence = evidenceItems.filter(e => e.caseId === caseId);
  const allEvidence = caseEvidence.length > 0 ? caseEvidence : (evidenceIds || []).map(id => {
    const found = evidenceItems.find(e => e.id === id);
    return found || { id, type: 'System information', label: 'Evidence Item', description: 'Collected evidence data.', collectedAt: 'Unknown', fingerprint: 'pending', verified: false };
  });

  const uniqueTypes = [...new Set(allEvidence.map(e => e.type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-wider text-sm">Evidence Collected</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Evidence
        </button>
      </div>

      {allEvidence.length === 0 ? (
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm text-center">
          <FolderLock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-900 mb-1">No Evidence Yet</h4>
          <p className="text-sm text-slate-500 mb-4">Start collecting evidence for this case.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Evidence
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">{allEvidence.length} evidence items</h4>
              <ul className="space-y-2">
                {uniqueTypes.map((type, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-600">
                    <Check size={16} className="text-emerald-500" /> {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-sm font-medium text-slate-500 uppercase">Integrity Status</span>
              <StatusBadge
                status={evidenceVerified ? 'verified' : 'pending'}
                label={evidenceVerified ? 'Verified' : 'Pending Verification'}
                size="md"
              />
            </div>
          </div>

          <ExpandableSection title={`View all ${allEvidence.length} evidence items`} defaultOpen={true}>
            <div className="space-y-4">
              {allEvidence.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvidence(ev)}
                  className="w-full text-left border border-slate-200 rounded-lg p-4 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{ev.id}</span>
                        <span className="text-xs text-slate-400 uppercase">{(ev.type || '').replace(/_/g, ' ')}</span>
                      </div>
                      <h5 className="font-semibold text-slate-900 mt-1">{ev.label}</h5>
                      <p className="text-sm text-slate-600">{ev.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ev.verified ? (
                        <><ShieldCheck size={16} className="text-emerald-500" /> <span className="text-sm text-emerald-600 font-medium">Evidence fingerprint verified</span></>
                      ) : (
                        <><ShieldAlert size={16} className="text-amber-500" /> <span className="text-sm text-amber-600 font-medium">Verification pending</span></>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{ev.collectedAt}</span>
                  </div>
                  {ev.fingerprint && ev.fingerprint !== 'pending' && (
                    <div className="mt-2">
                      <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        SHA-256 {ev.fingerprint.substring(0, 16)}...
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ExpandableSection>
        </>
      )}

      <AddEvidenceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultCaseId={caseId}
      />

      {selectedEvidence && (
        <EvidenceDetail
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  );
};
