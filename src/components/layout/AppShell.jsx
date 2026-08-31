import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertBanner } from '../ui/AlertBanner';
import { ToastContainer } from '../ui/Toast';
import { EvidenceDetail } from '../case/EvidenceDetail';
import { useApp } from '../../context/AppContext';

export function AppShell({ children }) {
  const location = useLocation();
  const { tamperDetected, tamperedCaseId, evidenceDetailItem, setEvidenceDetail } = useApp();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path.startsWith('/cases')) return 'Case Management';
    if (path === '/evidence') return 'Evidence Locker';
    if (path === '/verification') return 'Verification & Auditing';
    if (path === '/reports') return 'Reports';
    if (path === '/system') return 'System Health';
    return 'FPC-SORVAX';
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-600">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={getPageTitle()} />

        {tamperDetected && (
          <AlertBanner
            type="danger"
            title="⚠ INTEGRITY ISSUE DETECTED"
            message={`An investigation record does not match its original verified fingerprint. Case: ${tamperedCaseId}`}
            actionLabel="View Details"
          />
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <ToastContainer />

      {/* Global Evidence Detail Modal */}
      {evidenceDetailItem && (
        <EvidenceDetail
          evidence={evidenceDetailItem}
          onClose={() => setEvidenceDetail(null)}
        />
      )}
    </div>
  );
}
