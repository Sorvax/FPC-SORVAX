import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './AppContext';
import { api } from '../api/client.js';

const DemoContext = createContext();

export const demoSteps = [
  'Suspicious activity detected',
  'Evidence collected and verified',
  'Evidence integrity confirmed',
  'Investigation completed',
  'Security issue identified',
  'AI recommends a fix',
  'Officer approves remediation',
  'Fix is being applied',
  'Fix verified successfully',
  'System deployed securely',
  'Runtime audit confirms security',
  'Final report generated',
  'Tamper event simulated'
];

export function DemoProvider({ children }) {
  const { updateCase, setCases, setTamper, resetState, setEvidenceDetail, addNotification, clearNotification, cases } = useApp();
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(-1);
  const navigate = useNavigate();

  const buildStages = (currentStage) => {
    const stageIds = ['detected', 'evidence', 'investigation', 'finding', 'remediation', 'verification', 'deployment', 'monitoring', 'complete'];
    const stageLabels = ['Detected', 'Evidence', 'Investigated', 'Issue Found', 'Fix', 'Verify', 'Deploy', 'Monitor', 'Complete'];
    const now = new Date().toISOString();
    return stageIds.map((id, idx) => ({
      id,
      label: stageLabels[idx],
      status: idx < currentStage ? 'completed' : idx === currentStage ? 'active' : 'pending',
      timestamp: idx < currentStage ? now : null
    }));
  };

  const buildTimeline = (upToStep) => {
    const events = [
      { time: '10:42', title: 'Suspicious activity identified', description: 'Security scan detected anomalous behavior on authentication endpoint', type: 'detection', date: 'August 30, 2026' },
    ];
    if (upToStep >= 1) events.push({ time: '10:44', title: 'Evidence collection started', description: '8 evidence items queued for collection from Demo Server 01', type: 'evidence', date: 'August 30, 2026' });
    if (upToStep >= 2) events.push({ time: '10:47', title: 'Evidence integrity verified', description: 'All evidence items fingerprinted with SHA-256 and integrity confirmed', type: 'verified', date: 'August 30, 2026' });
    if (upToStep >= 3) events.push({ time: '10:51', title: 'Investigation completed', description: 'AI analysis correlated evidence and identified SQL injection vulnerability', type: 'investigation', date: 'August 30, 2026' });
    if (upToStep >= 4) events.push({ time: '10:55', title: 'Finding created', description: 'SQL Injection — High severity — Authentication Service affected', type: 'finding', date: 'August 30, 2026' });
    if (upToStep >= 5) events.push({ time: '11:03', title: 'Remediation recommended', description: 'AI recommends parameterized query patch for authentication service', type: 'recommendation', date: 'August 30, 2026' });
    if (upToStep >= 6) events.push({ time: '11:10', title: 'Remediation approved', description: 'Officer Martinez approved the recommended fix', type: 'system', date: 'August 30, 2026' });
    if (upToStep >= 7) events.push({ time: '11:15', title: 'Fix applied', description: 'Security patch applied to authentication service successfully', type: 'system', date: 'August 30, 2026' });
    if (upToStep >= 8) events.push({ time: '11:17', title: 'Fix independently verified', description: 'Security test, regression test, system check, and independent verification all passed', type: 'verified', date: 'August 30, 2026' });
    if (upToStep >= 9) events.push({ time: '11:20', title: 'Deployment completed', description: 'Verified fix deployed to Demo Server 01 — post-deployment check passed', type: 'system', date: 'August 30, 2026' });
    if (upToStep >= 10) events.push({ time: '11:25', title: 'Runtime audit completed', description: 'Authentication Service, Configuration, Security Patch, Processes, and Controls all verified', type: 'verified', date: 'August 30, 2026' });
    if (upToStep >= 12) events.push({ time: '11:30', title: 'Tamper event detected', description: 'Investigation record no longer matches original verified fingerprint', type: 'finding', date: 'August 30, 2026' });
    return events;
  };

  const startDemo = useCallback(async () => {
    // Reset and reload fresh data from backend
    await resetState();
    setEvidenceDetail(null);

    // Wait a moment for state to settle
    await new Promise(r => setTimeout(r, 100));

    // Apply initial demo state
    const caseId = 'CASE-0241';
    const updates = {
      currentStage: 0,
      stages: buildStages(0),
      evidenceVerified: false,
      timeline: buildTimeline(0),
      remediation: { approved: false, appliedAt: null, recommendation: '', rationale: '', expectedResult: '', risk: 'medium', rollbackAvailable: true },
      fixSteps: [
        { label: 'Preparing change', status: 'pending' },
        { label: 'Applying patch', status: 'pending' },
        { label: 'Running checks', status: 'pending' },
        { label: 'Preparing verification', status: 'pending' }
      ],
      verification: {
        securityTest: { label: 'Security Test', detail: 'Vulnerability no longer detected', status: 'pending' },
        regressionTest: { label: 'Regression Tests', detail: 'Application behaviour normal', status: 'pending' },
        systemCheck: { label: 'System Check', detail: 'Expected state confirmed', status: 'pending' },
        independentVerification: { label: 'Independent Verification', detail: 'Passed', status: 'pending' },
        overallResult: 'pending'
      },
      deployment: { target: 'Demo Server 01', change: 'Security Patch v1.2', status: 'pending', postDeployCheck: 'pending', securityState: 'pending' },
      monitoring: { lastCheck: null, systemState: 'pending', securityState: 'pending', evidenceIntegrity: 'pending', consistency: 'pending', runtimeAudit: 'pending' },
    };

    updateCase(caseId, updates);
    setTamper(false, null);
    setDemoActive(true);
    setDemoStep(0);
    navigate('/cases/CASE-0241');
  }, [resetState, setCases, setTamper, navigate, setEvidenceDetail, updateCase]);

  const nextStep = useCallback(() => {
    setDemoStep(prev => {
      if (prev < demoSteps.length - 1) {
        const next = prev + 1;
        applyStepLogic(next);
        return next;
      }
      return prev;
    });
  }, []);

  const previousStep = useCallback(() => {
    setDemoStep(prev => {
      if (prev > 0) {
        const prevStep = prev - 1;
        applyStepLogic(prevStep);
        return prevStep;
      }
      return prev;
    });
  }, []);

  const resetDemo = useCallback(async () => {
    setDemoActive(false);
    setDemoStep(-1);
    await resetState();
    navigate('/');
  }, [resetState, navigate]);

  const goToStep = useCallback((step) => {
    if (step >= 0 && step < demoSteps.length) {
      setDemoStep(step);
      applyStepLogic(step);
    }
  }, []);

  const applyStepLogic = (step) => {
    const caseId = 'CASE-0241';

    // Navigation
    if (step <= 10) {
      navigate('/cases/CASE-0241');
    } else if (step === 11) {
      navigate('/reports');
    } else if (step === 12) {
      navigate('/cases/CASE-0241');
    }

    // Build stage states
    let currentStage = 0;
    if (step >= 1) currentStage = 1;
    if (step >= 3) currentStage = 2;
    if (step >= 4) currentStage = 3;
    if (step >= 5) currentStage = 4;
    if (step >= 7) currentStage = 4;
    if (step >= 8) currentStage = 5;
    if (step >= 9) currentStage = 6;
    if (step >= 10) currentStage = 7;
    if (step >= 11) currentStage = 8;

    const stages = buildStages(currentStage);
    const timeline = buildTimeline(step);

    const updates = {
      currentStage,
      stages,
      timeline,
    };

    // Step 0: Detected
    if (step === 0) {
      updates.evidenceVerified = false;
      updates.remediation = { approved: false, appliedAt: null };
      updates.fixSteps = [
        { label: 'Preparing change', status: 'pending' },
        { label: 'Applying patch', status: 'pending' },
        { label: 'Running checks', status: 'pending' },
        { label: 'Preparing verification', status: 'pending' }
      ];
      updates.verification = {
        securityTest: { label: 'Security Test', detail: 'Vulnerability no longer detected', status: 'pending' },
        regressionTest: { label: 'Regression Tests', detail: 'Application behaviour normal', status: 'pending' },
        systemCheck: { label: 'System Check', detail: 'Expected state confirmed', status: 'pending' },
        independentVerification: { label: 'Independent Verification', detail: 'Passed', status: 'pending' },
        overallResult: 'pending'
      };
      updates.deployment = { target: 'Demo Server 01', change: 'Security Patch v1.2', status: 'pending', postDeployCheck: 'pending', securityState: 'pending' };
      updates.monitoring = { lastCheck: null, systemState: 'pending', securityState: 'pending', evidenceIntegrity: 'pending', consistency: 'pending', runtimeAudit: 'pending' };
    }

    // Step 1: Evidence collected
    if (step >= 1) {
      updates.evidenceVerified = false;
    }

    // Step 2: Evidence integrity confirmed
    if (step >= 2) {
      updates.evidenceVerified = true;
    }

    // Step 3: Investigation completed
    if (step >= 3) {
      updates.investigation = {
        finding: 'The system identified suspicious activity associated with the authentication service.',
        cause: 'The investigation found that user input was not being handled safely — input was passed directly to SQL queries without parameterization.',
        confidence: 'high',
        supportingEvidence: ['E-001', 'E-003', 'E-005'],
        aiReasoning: 'The system correlated the available evidence and identified that the authentication endpoint accepts unvalidated user input in SQL queries. This pattern is consistent with SQL injection vulnerability.'
      };
    }

    // Step 4: Finding
    if (step >= 4) {
      updates.finding = {
        name: 'SQL Injection',
        severity: 'high',
        affected: 'Authentication Service',
        status: 'open',
        evidenceCount: 3,
        description: 'User input is passed directly to database queries without parameterization, allowing SQL injection attacks.',
        recommendedAction: 'Apply parameterized query fix'
      };
    }

    // Step 5: AI recommendation
    if (step >= 5) {
      updates.remediation = {
        recommendation: 'The affected component should be updated to safely handle user input using parameterized queries.',
        rationale: 'It removes the identified unsafe input handling by ensuring all database queries use safe parameterized statements.',
        expectedResult: 'SQL injection test should no longer succeed. All authentication queries will use safe parameterized inputs.',
        risk: 'medium',
        approved: false,
        appliedAt: null,
        rollbackAvailable: true
      };
    }

    // Step 6: Officer approves
    if (step >= 6) {
      updates.remediation = {
        ...updates.remediation,
        approved: true,
        appliedAt: '11:10 AM',
      };
    }

    // Step 7: Fix applied
    if (step >= 7) {
      updates.fixSteps = [
        { label: 'Preparing change', status: 'completed' },
        { label: 'Applying patch', status: 'completed' },
        { label: 'Running checks', status: 'completed' },
        { label: 'Preparing verification', status: 'completed' }
      ];
    }

    // Step 8: Verification passed
    if (step >= 8) {
      updates.verification = {
        securityTest: { label: 'Security Test', detail: 'Vulnerability no longer detected', status: 'completed' },
        regressionTest: { label: 'Regression Tests', detail: 'Application behaviour normal', status: 'completed' },
        systemCheck: { label: 'System Check', detail: 'Expected state confirmed', status: 'completed' },
        independentVerification: { label: 'Independent Verification', detail: 'Passed', status: 'completed' },
        overallResult: 'verified'
      };
    }

    // Step 9: Deployment
    if (step >= 9) {
      updates.deployment = {
        target: 'Demo Server 01',
        change: 'Security Patch v1.2',
        status: 'completed',
        postDeployCheck: 'completed',
        securityState: 'completed'
      };
    }

    // Step 10: Runtime audit
    if (step >= 10) {
      updates.monitoring = {
        lastCheck: '2 minutes ago',
        systemState: 'verified',
        securityState: 'verified',
        evidenceIntegrity: 'verified',
        consistency: 'verified',
        runtimeAudit: 'verified'
      };
    }

    // Step 11: Report (just navigate, no state change needed)
    // Step 12: Tamper event - use real backend tamper simulation
    if (step === 12) {
      // Use the real backend tamper simulation
      (async () => {
        try {
          const evidence = await api.getEvidenceForCase(caseId);
          if (evidence.length > 0) {
            await api.simulateTamper(evidence[0].id);
          }
        } catch (err) {
          console.error('Tamper simulation failed:', err);
        }
      })();

      setTamper(true, caseId);
      addNotification({
        id: 99,
        type: 'alert',
        message: 'Integrity issue detected on CASE-0241',
        caseId: caseId,
        read: false
      });
    } else if (step < 12) {
      setTamper(false, null);
    }

    updateCase(caseId, updates);
  };

  return (
    <DemoContext.Provider value={{
      demoActive,
      demoStep,
      demoSteps,
      startDemo,
      nextStep,
      previousStep,
      resetDemo,
      goToStep
    }}>
      {children}
    </DemoContext.Provider>
  );
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used within DemoProvider');
  return context;
}
