import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Overview } from './pages/Overview';
import { Cases } from './pages/Cases';
import { CaseDetail } from './pages/CaseDetail';
import { Evidence } from './pages/Evidence';
import { Verification } from './pages/Verification';
import { Reports } from './pages/Reports';
import { System } from './pages/System';
import { Investigation } from './pages/Investigation';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:caseId" element={<CaseDetail />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/investigation/:caseId" element={<Investigation />} />
        <Route path="/system" element={<System />} />
      </Routes>
    </AppShell>
  );
}
