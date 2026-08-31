import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, ShieldCheck, AlertCircle, Plus, FolderLock, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AddEvidenceModal } from '../components/case/AddEvidenceModal';
import { EvidenceDetail } from '../components/case/EvidenceDetail';

export const Evidence = () => {
  const { evidenceItems, tamperDetected, setEvidenceDetail } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const totalItems = evidenceItems.length;
  const verifiedItems = evidenceItems.filter(e => e.verified).length - (tamperDetected ? 1 : 0);
  const pendingItems = totalItems - verifiedItems;

  const getStatusColor = (item) => {
    if (tamperDetected && item.id === 'EV-0241-01') return 'bg-rose-50 border-rose-200';
    if (item.verified) return 'bg-white border-slate-200';
    return 'bg-amber-50/50 border-amber-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Evidence Locker</h1>
          <p className="text-slate-500 mt-1">All collected evidence with integrity verification</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Evidence
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex items-center">
          <div className="bg-slate-100 p-3 rounded-lg mr-4">
            <FileSearch className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalItems}</div>
            <div className="text-sm text-slate-500">Total Items</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex items-center">
          <div className="bg-emerald-100 p-3 rounded-lg mr-4">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{verifiedItems}</div>
            <div className="text-sm text-slate-500">Verified & Intact</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex items-center">
          <div className="bg-amber-100 p-3 rounded-lg mr-4">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{pendingItems}</div>
            <div className="text-sm text-slate-500">Pending / Anomalous</div>
          </div>
        </div>
      </div>

      {/* Evidence Lifecycle Visual */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Evidence Lifecycle</h3>
        <div className="flex items-center justify-between flex-wrap gap-2">
          {['Collect', 'Identify', 'Fingerprint', 'Verify', 'Store'].map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <span className="text-xs font-medium text-slate-600">{step}</span>
              </div>
              {i < 4 && <div className="flex-1 h-px bg-slate-200 min-w-[20px]" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Evidence List */}
      {totalItems === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FolderLock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Evidence Yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Evidence collected for this case will appear here. Start by adding evidence to a case.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Evidence
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {evidenceItems.map(item => {
            const isTamperedItem = tamperDetected && item.id === 'EV-0241-01';
            return (
              <button
                key={item.id}
                onClick={() => setSelectedEvidence(item)}
                className={`w-full text-left rounded-xl shadow-sm overflow-hidden border ${getStatusColor(item)} hover:shadow-md transition-shadow group`}
              >
                <div className="p-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-slate-700">{item.id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          isTamperedItem ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          item.verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isTamperedItem ? 'TAMPERED' : item.verified ? '✓ Verified' : 'Pending'}
                        </span>
                        <span className="text-xs text-slate-400 uppercase">{item.type}</span>
                      </div>
                      <h4 className="text-md font-medium text-slate-900">{item.label}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Case: <Link to={`/cases/${item.caseId}`} className="text-indigo-600 hover:underline" onClick={e => e.stopPropagation()}>{item.caseId}</Link></span>
                        <span>Collected: {item.collectedAt}</span>
                        {item.collectedBy && <span>By: {item.collectedBy}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.verified && !isTamperedItem ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                      <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200 max-w-[140px] truncate">
                        {item.fingerprint === 'pending' ? 'pending...' : `${item.fingerprint.substring(0, 12)}...`}
                      </span>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AddEvidenceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultCaseId=""
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
