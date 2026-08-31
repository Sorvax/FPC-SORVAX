export const initialCases = [
  {
    id: 'CASE-0241',
    title: 'Suspicious Activity Investigation',
    subtitle: 'Authentication service security concern on Demo Server 01',
    severity: 'high',
    currentStage: 5,
    system: 'Demo Server 01',
    assignedTo: 'Officer Martinez',
    createdAt: '2026-08-30T10:42:00',
    stages: [
      { id: 'detected', label: 'Detected', status: 'completed', timestamp: '2026-08-30T10:42:00' },
      { id: 'evidence', label: 'Evidence', status: 'completed', timestamp: '2026-08-30T10:44:00' },
      { id: 'investigation', label: 'Investigated', status: 'completed', timestamp: '2026-08-30T10:51:00' },
      { id: 'finding', label: 'Issue Found', status: 'completed', timestamp: '2026-08-30T10:55:00' },
      { id: 'remediation', label: 'Fix', status: 'active', timestamp: null },
      { id: 'verification', label: 'Verify', status: 'pending', timestamp: null },
      { id: 'deployment', label: 'Deploy', status: 'pending', timestamp: null },
      { id: 'monitoring', label: 'Monitor', status: 'pending', timestamp: null },
      { id: 'complete', label: 'Complete', status: 'pending', timestamp: null }
    ],
    detection: {
      description: 'Suspicious activity was detected on Demo Server 01.',
      method: 'Security scan',
      time: '10:42 AM',
      date: 'August 30, 2026',
      technicalDetails: {
        scanType: 'Dynamic Application Security Test',
        endpoint: '/api/auth/login',
        httpMethod: 'POST',
        parameter: 'username',
        payload: "admin' OR '1'='1' --",
        responseCode: 200,
        anomalyScore: 0.94
      }
    },
    evidenceItems: ['E-001', 'E-002', 'E-003', 'E-004', 'E-005', 'E-006', 'E-007', 'E-008'],
    evidenceVerified: true,
    investigation: {
      finding: 'The system identified suspicious activity associated with the authentication service.',
      cause: 'The investigation found that user input was not being handled safely.',
      confidence: 'high',
      supportingEvidence: ['E-001', 'E-003', 'E-005'],
      aiReasoning: 'The system correlated the available evidence and identified that the authentication endpoint accepts unvalidated user input in SQL queries. This pattern is consistent with SQL injection vulnerability. The evidence shows successful exploitation attempts in the access logs, confirmed by the security scan results, and corroborated by the application source code analysis.'
    },
    finding: {
      name: 'SQL Injection',
      severity: 'high',
      affected: 'Authentication Service',
      status: 'open',
      evidenceCount: 3,
      description: 'User input is passed directly to database queries without parameterization, allowing SQL injection attacks.',
      recommendedAction: 'Apply parameterized query fix'
    },
    remediation: {
      recommendation: 'The affected component should be updated to safely handle user input using parameterized queries.',
      rationale: 'It removes the identified unsafe input handling by ensuring all database queries use parameterized statements instead of string concatenation.',
      expectedResult: 'SQL injection test should no longer succeed. All authentication queries will use safe parameterized inputs.',
      risk: 'medium',
      approved: false,
      appliedAt: null,
      rollbackAvailable: true
    },
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
    deployment: {
      target: 'Demo Server 01',
      change: 'Security Patch v1.2',
      status: 'pending',
      postDeployCheck: 'pending',
      securityState: 'pending'
    },
    monitoring: {
      lastCheck: null,
      systemState: 'pending',
      securityState: 'pending',
      evidenceIntegrity: 'pending',
      consistency: 'pending',
      runtimeAudit: 'pending'
    },
    timeline: [
      { time: '10:42', title: 'Suspicious activity identified', description: 'Security scan detected anomalous behavior on authentication endpoint', type: 'detection' },
      { time: '10:43', title: 'Case created', description: 'CASE-0241 opened and assigned to Officer Martinez', type: 'system' },
      { time: '10:44', title: 'Evidence collection started', description: '8 evidence items queued for collection', type: 'evidence' },
      { time: '10:47', title: 'Evidence verified', description: 'All evidence items integrity-verified', type: 'verified' },
      { time: '10:51', title: 'Investigation completed', description: 'AI analysis identified SQL injection vulnerability', type: 'investigation' },
      { time: '10:55', title: 'Finding created', description: 'SQL Injection — High severity', type: 'finding' },
      { time: '11:03', title: 'Fix recommendation generated', description: 'AI recommends parameterized query patch', type: 'recommendation' }
    ]
  },
  {
    id: 'CASE-0242',
    title: 'Unusual Network Activity',
    subtitle: 'Unexpected outbound connections from Application Server 03',
    severity: 'medium',
    currentStage: 1,
    system: 'Application Server 03',
    assignedTo: 'Officer Chen',
    createdAt: '2026-08-30T09:15:00',
    stages: [
      { id: 'detected', label: 'Detected', status: 'completed', timestamp: '2026-08-30T09:15:00' },
      { id: 'evidence', label: 'Evidence', status: 'active', timestamp: null },
      { id: 'investigation', label: 'Investigated', status: 'pending', timestamp: null },
      { id: 'finding', label: 'Issue Found', status: 'pending', timestamp: null },
      { id: 'remediation', label: 'Fix', status: 'pending', timestamp: null },
      { id: 'verification', label: 'Verify', status: 'pending', timestamp: null },
      { id: 'deployment', label: 'Deploy', status: 'pending', timestamp: null },
      { id: 'monitoring', label: 'Monitor', status: 'pending', timestamp: null },
      { id: 'complete', label: 'Complete', status: 'pending', timestamp: null }
    ],
    detection: {
      description: 'Unusual outbound network connections detected from Application Server 03.',
      method: 'Network monitoring',
      time: '09:15 AM',
      date: 'August 30, 2026'
    },
    evidenceItems: ['E-009', 'E-010', 'E-011'],
    evidenceVerified: false,
    timeline: [
      { time: '09:15', title: 'Unusual activity detected', description: 'Network monitor flagged unexpected outbound connections', type: 'detection' },
      { time: '09:17', title: 'Case created', description: 'CASE-0242 opened', type: 'system' },
      { time: '09:20', title: 'Evidence collection in progress', description: 'Collecting network logs and connection data', type: 'evidence' }
    ]
  },
  {
    id: 'CASE-0238',
    title: 'Outdated SSL Certificate',
    subtitle: 'Expired certificate on public-facing web server',
    severity: 'low',
    currentStage: 8,
    system: 'Web Server 02',
    assignedTo: 'Officer Reyes',
    createdAt: '2026-08-28T14:20:00',
    stages: [
      { id: 'detected', label: 'Detected', status: 'completed', timestamp: '2026-08-28T14:20:00' },
      { id: 'evidence', label: 'Evidence', status: 'completed', timestamp: '2026-08-28T14:22:00' },
      { id: 'investigation', label: 'Investigated', status: 'completed', timestamp: '2026-08-28T14:25:00' },
      { id: 'finding', label: 'Issue Found', status: 'completed', timestamp: '2026-08-28T14:26:00' },
      { id: 'remediation', label: 'Fix', status: 'completed', timestamp: '2026-08-28T14:40:00' },
      { id: 'verification', label: 'Verify', status: 'completed', timestamp: '2026-08-28T14:45:00' },
      { id: 'deployment', label: 'Deploy', status: 'completed', timestamp: '2026-08-28T14:50:00' },
      { id: 'monitoring', label: 'Monitor', status: 'completed', timestamp: '2026-08-28T15:00:00' },
      { id: 'complete', label: 'Complete', status: 'completed', timestamp: '2026-08-28T15:00:00' }
    ],
    detection: { description: 'SSL certificate expired on Web Server 02.', method: 'Certificate monitoring', time: '02:20 PM', date: 'August 28, 2026' },
    verification: { 
      securityTest: { label: 'Security Test', detail: 'Vulnerability no longer detected', status: 'completed' },
      regressionTest: { label: 'Regression Tests', detail: 'Application behaviour normal', status: 'completed' },
      systemCheck: { label: 'System Check', detail: 'Expected state confirmed', status: 'completed' },
      independentVerification: { label: 'Independent Verification', detail: 'Passed', status: 'completed' },
      overallResult: 'verified' 
    },
    deployment: { 
      target: 'Web Server 02',
      change: 'Certificate Renewal',
      status: 'completed',
      postDeployCheck: 'completed',
      securityState: 'completed'
    },
    monitoring: { 
      lastCheck: '2 minutes ago', 
      systemState: 'verified',
      securityState: 'verified',
      evidenceIntegrity: 'verified',
      consistency: 'verified',
      runtimeAudit: 'verified'
    },
    timeline: [
      { time: '14:20', title: 'Expired certificate detected', description: 'Monitoring alert for Web Server 02', type: 'detection' },
      { time: '15:00', title: 'Certificate renewed and deployed', description: 'New SSL certificate successfully installed and verified', type: 'system' }
    ]
  }
];

export function getCaseById(cases, id) { 
  return cases.find(c => c.id === id); 
}

export function getActiveStageId(caseData) { 
  if (!caseData || caseData.currentStage >= caseData.stages.length) return 'complete';
  return caseData.stages[caseData.currentStage]?.id || 'complete';
}
