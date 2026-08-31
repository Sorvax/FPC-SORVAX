export const systemComponents = [
  { id: 'discovery', name: 'Discovery Engine', status: 'operational', description: 'Detects security issues', lastCheck: '2 min ago' },
  { id: 'evidence', name: 'Evidence Verification', status: 'operational', description: 'Collects and verifies evidence', lastCheck: '1 min ago' },
  { id: 'ai', name: 'AI Analysis', status: 'operational', description: 'Analyzes findings and recommends fixes', lastCheck: '30 sec ago' },
  { id: 'remediation', name: 'Remediation Engine', status: 'operational', description: 'Applies approved fixes', lastCheck: '1 min ago' },
  { id: 'verification', name: 'Verification Engine', status: 'operational', description: 'Tests whether fixes worked', lastCheck: '45 sec ago' },
  { id: 'audit', name: 'Runtime Audit', status: 'operational', description: 'Continuously monitors system state', lastCheck: '15 sec ago' }
];

export const systemTrust = {
  evidenceIntegrity: { label: 'Evidence Integrity', status: 'verified', detail: 'All evidence items verified' },
  investigationRecords: { label: 'Investigation Records', status: 'verified', detail: 'All records consistent' },
  systemState: { label: 'System State', status: 'verified', detail: 'All systems nominal' },
  runtimeMonitoring: { label: 'Runtime Monitoring', status: 'active', detail: 'Continuous monitoring active' }
};
