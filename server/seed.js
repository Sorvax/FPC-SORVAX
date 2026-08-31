import { getDb } from './db.js';
import { hashEvidence, hashRecord, canonicalSerialize } from './services/integrity.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed the database with existing mock data
 * This creates cases, evidence, and provenance events
 */
export function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const existingCases = db.prepare('SELECT COUNT(*) as cnt FROM cases').get();
  const hasPhase2Evidence = db.prepare("SELECT COUNT(*) as cnt FROM evidence WHERE evidence_id = 'E-050'").get();
  if (existingCases.cnt > 0 && hasPhase2Evidence.cnt > 0) return;

  console.log('Seeding database with initial data...');

  const now = new Date().toISOString();

  // ───────── CASE-0241 ─────────
  const case0241Stages = [
    { id: 'detected', label: 'Detected', status: 'completed', timestamp: '2026-08-30T10:42:00' },
    { id: 'evidence', label: 'Evidence', status: 'completed', timestamp: '2026-08-30T10:44:00' },
    { id: 'investigation', label: 'Investigated', status: 'completed', timestamp: '2026-08-30T10:51:00' },
    { id: 'finding', label: 'Issue Found', status: 'completed', timestamp: '2026-08-30T10:55:00' },
    { id: 'report', label: 'Initial Report', status: 'completed', timestamp: '2026-08-30T11:00:00' },
    { id: 'decision', label: 'Next Action', status: 'completed', timestamp: '2026-08-30T11:02:00' },
    { id: 'remediation', label: 'Fix', status: 'active', timestamp: null },
    { id: 'verification', label: 'Verify', status: 'pending', timestamp: null },
    { id: 'deployment', label: 'Deploy', status: 'pending', timestamp: null },
    { id: 'monitoring', label: 'Monitor', status: 'pending', timestamp: null },
    { id: 'complete', label: 'Complete', status: 'pending', timestamp: null },
  ];

  const case0241Timeline = [
    { time: '10:42', title: 'Suspicious activity identified', description: 'Security scan detected anomalous behavior on authentication endpoint', type: 'detection' },
    { time: '10:43', title: 'Case created', description: 'CASE-0241 opened and assigned to Officer Martinez', type: 'system' },
    { time: '10:44', title: 'Evidence collection started', description: '8 evidence items queued for collection', type: 'evidence' },
    { time: '10:47', title: 'Evidence verified', description: 'All evidence items integrity-verified', type: 'verified' },
    { time: '10:51', title: 'Investigation completed', description: 'AI analysis identified SQL injection vulnerability', type: 'investigation' },
    { time: '10:55', title: 'Finding created', description: 'SQL Injection — High severity', type: 'finding' },
    { time: '11:03', title: 'Fix recommendation generated', description: 'AI recommends parameterized query patch', type: 'recommendation' },
  ];

  db.prepare(`
    INSERT OR IGNORE INTO cases (
      case_id, case_number, title, subtitle, description, status, severity,
      system, assigned_to, created_at, updated_at, current_stage, stages_json,
      evidence_items_json, evidence_verified, detection_json, investigation_json,
      finding_json, remediation_json, verification_json, deployment_json,
      monitoring_json, timeline_json, fix_steps_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CASE-0241', '0241',
    'Suspicious Activity Investigation',
    'Authentication service security concern on Demo Server 01',
    'Suspicious activity was detected on Demo Server 01.',
    'active', 'high',
    'Demo Server 01', 'Officer Martinez',
    '2026-08-30T10:42:00', '2026-08-30T10:42:00', 4,
    JSON.stringify(case0241Stages),
    JSON.stringify(['E-001', 'E-002', 'E-003', 'E-004', 'E-005', 'E-006', 'E-007', 'E-008']),
    1,
    JSON.stringify({
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
        anomalyScore: 0.94,
      },
    }),
    JSON.stringify({
      finding: 'The system identified suspicious activity associated with the authentication service.',
      cause: 'The investigation found that user input was not being handled safely.',
      confidence: 'high',
      supportingEvidence: ['E-001', 'E-003', 'E-005'],
      aiReasoning: 'The system correlated the available evidence and identified that the authentication endpoint accepts unvalidated user input in SQL queries.',
    }),
    JSON.stringify({
      name: 'SQL Injection',
      severity: 'high',
      affected: 'Authentication Service',
      status: 'open',
      evidenceCount: 3,
      description: 'User input is passed directly to database queries without parameterization, allowing SQL injection attacks.',
      recommendedAction: 'Apply parameterized query fix',
    }),
    JSON.stringify({
      recommendation: 'The affected component should be updated to safely handle user input using parameterized queries.',
      rationale: 'It removes the identified unsafe input handling by ensuring all database queries use safe parameterized statements.',
      expectedResult: 'SQL injection test should no longer succeed.',
      risk: 'medium',
      approved: false,
      appliedAt: null,
      rollbackAvailable: true,
    }),
    JSON.stringify({
      securityTest: { label: 'Security Test', detail: 'Vulnerability no longer detected', status: 'pending' },
      regressionTest: { label: 'Regression Tests', detail: 'Application behaviour normal', status: 'pending' },
      systemCheck: { label: 'System Check', detail: 'Expected state confirmed', status: 'pending' },
      independentVerification: { label: 'Independent Verification', detail: 'Passed', status: 'pending' },
      overallResult: 'pending',
    }),
    JSON.stringify({ target: 'Demo Server 01', change: 'Security Patch v1.2', status: 'pending', postDeployCheck: 'pending', securityState: 'pending' }),
    JSON.stringify({ lastCheck: null, systemState: 'pending', securityState: 'pending', evidenceIntegrity: 'pending', consistency: 'pending', runtimeAudit: 'pending' }),
    JSON.stringify(case0241Timeline),
    JSON.stringify([
      { label: 'Preparing change', status: 'pending' },
      { label: 'Applying patch', status: 'pending' },
      { label: 'Running checks', status: 'pending' },
      { label: 'Preparing verification', status: 'pending' },
    ])
  );

  // ───────── CASE-0242 ─────────
  const case0242Stages = [
    { id: 'detected', label: 'Detected', status: 'completed', timestamp: '2026-08-30T09:15:00' },
    { id: 'evidence', label: 'Evidence', status: 'active', timestamp: null },
    { id: 'investigation', label: 'Investigated', status: 'pending', timestamp: null },
    { id: 'finding', label: 'Issue Found', status: 'pending', timestamp: null },
    { id: 'report', label: 'Initial Report', status: 'pending', timestamp: null },
    { id: 'decision', label: 'Next Action', status: 'pending', timestamp: null },
    { id: 'remediation', label: 'Fix', status: 'pending', timestamp: null },
    { id: 'verification', label: 'Verify', status: 'pending', timestamp: null },
    { id: 'deployment', label: 'Deploy', status: 'pending', timestamp: null },
    { id: 'monitoring', label: 'Monitor', status: 'pending', timestamp: null },
    { id: 'complete', label: 'Complete', status: 'pending', timestamp: null },
  ];

  const case0242Timeline = [
    { time: '09:15', title: 'Unusual activity detected', description: 'Network monitor flagged unexpected outbound connections', type: 'detection' },
    { time: '09:17', title: 'Case created', description: 'CASE-0242 opened', type: 'system' },
    { time: '09:20', title: 'Evidence collection in progress', description: 'Collecting network logs and connection data', type: 'evidence' },
  ];

  db.prepare(`
    INSERT OR IGNORE INTO cases (
      case_id, case_number, title, subtitle, description, status, severity,
      system, assigned_to, created_at, updated_at, current_stage, stages_json,
      evidence_items_json, evidence_verified, detection_json, timeline_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CASE-0242', '0242',
    'Unusual Network Activity',
    'Unexpected outbound connections from Application Server 03',
    'Unusual outbound network connections detected from Application Server 03.',
    'active', 'medium',
    'Application Server 03', 'Officer Chen',
    '2026-08-30T09:15:00', '2026-08-30T09:15:00', 1,
    JSON.stringify(case0242Stages),
    JSON.stringify(['E-009', 'E-010', 'E-011']),
    0,
    JSON.stringify({
      description: 'Unusual outbound network connections detected from Application Server 03.',
      method: 'Network monitoring',
      time: '09:15 AM',
      date: 'August 30, 2026',
    }),
    JSON.stringify(case0242Timeline)
  );

  // ───────── CASE-0238 ─────────
  const case0238Stages = [
    { id: 'detected', label: 'Detected', status: 'completed', timestamp: '2026-08-28T14:20:00' },
    { id: 'evidence', label: 'Evidence', status: 'completed', timestamp: '2026-08-28T14:22:00' },
    { id: 'investigation', label: 'Investigated', status: 'completed', timestamp: '2026-08-28T14:25:00' },
    { id: 'finding', label: 'Issue Found', status: 'completed', timestamp: '2026-08-28T14:26:00' },
    { id: 'report', label: 'Initial Report', status: 'completed', timestamp: '2026-08-28T14:28:00' },
    { id: 'decision', label: 'Next Action', status: 'completed', timestamp: '2026-08-28T14:30:00' },
    { id: 'remediation', label: 'Fix', status: 'completed', timestamp: '2026-08-28T14:40:00' },
    { id: 'verification', label: 'Verify', status: 'completed', timestamp: '2026-08-28T14:45:00' },
    { id: 'deployment', label: 'Deploy', status: 'completed', timestamp: '2026-08-28T14:50:00' },
    { id: 'monitoring', label: 'Monitor', status: 'completed', timestamp: '2026-08-28T15:00:00' },
    { id: 'complete', label: 'Complete', status: 'completed', timestamp: '2026-08-28T15:00:00' },
  ];

  db.prepare(`
    INSERT OR IGNORE INTO cases (
      case_id, case_number, title, subtitle, status, severity,
      system, assigned_to, created_at, updated_at, current_stage, stages_json,
      evidence_verified, detection_json, verification_json, deployment_json,
      monitoring_json, timeline_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CASE-0238', '0238',
    'Outdated SSL Certificate',
    'Expired certificate on public-facing web server',
    'resolved', 'low',
    'Web Server 02', 'Officer Reyes',
    '2026-08-28T14:20:00', '2026-08-28T15:00:00', 8,
    JSON.stringify(case0238Stages),
    1,
    JSON.stringify({ description: 'SSL certificate expired on Web Server 02.', method: 'Certificate monitoring', time: '02:20 PM', date: 'August 28, 2026' }),
    JSON.stringify({
      securityTest: { label: 'Security Test', detail: 'Vulnerability no longer detected', status: 'completed' },
      regressionTest: { label: 'Regression Tests', detail: 'Application behaviour normal', status: 'completed' },
      systemCheck: { label: 'System Check', detail: 'Expected state confirmed', status: 'completed' },
      independentVerification: { label: 'Independent Verification', detail: 'Passed', status: 'completed' },
      overallResult: 'verified',
    }),
    JSON.stringify({ target: 'Web Server 02', change: 'Certificate Renewal', status: 'completed', postDeployCheck: 'completed', securityState: 'completed' }),
    JSON.stringify({ lastCheck: '2 minutes ago', systemState: 'verified', securityState: 'verified', evidenceIntegrity: 'verified', consistency: 'verified', runtimeAudit: 'verified' }),
    JSON.stringify([
      { time: '14:20', title: 'Expired certificate detected', description: 'Monitoring alert for Web Server 02', type: 'detection' },
      { time: '15:00', title: 'Certificate renewed and deployed', description: 'New SSL certificate successfully installed and verified', type: 'system' },
    ])
  );

  // ───────── Seed Evidence Items ─────────
  const evidenceData = [
    { id: 'E-001', caseId: 'CASE-0241', type: 'logs', name: 'Authentication Access Logs', label: 'Authentication Access Logs', description: 'Server access logs showing authentication attempts', source: '/var/log/auth/service.log', content: 'Aug 30 10:42:01 server01 sshd[1234]: Accepted password for admin from 192.168.1.100 port 22 ssh2\nAug 30 10:42:05 server01 sshd[1235]: Failed password for root from 192.168.1.100 port 22 ssh2\nAug 30 10:42:10 server01 auth: admin\' OR \'1\'=\'1\' -- detected in POST /api/auth/login', collectedAt: '2026-08-30T10:44:00' },
    { id: 'E-002', caseId: 'CASE-0241', type: 'logs', name: 'Application Error Logs', label: 'Application Error Logs', description: 'Application error logs from authentication service', source: '/var/log/app/errors.log', content: '2026-08-30T10:42:03 ERROR [auth] SQL syntax error in query: SELECT * FROM users WHERE username=\'admin\' OR \'1\'=\'1\' --\n2026-08-30T10:42:05 WARN [auth] Unusual query pattern detected from IP 192.168.1.100', collectedAt: '2026-08-30T10:44:00' },
    { id: 'E-003', caseId: 'CASE-0241', type: 'scan', name: 'Security Scan Result', label: 'Security Scan Result', description: 'Dynamic security scan of authentication endpoint', source: '/tmp/scan-output.json', content: '{"scan":"DAST","endpoint":"/api/auth/login","vulnerabilities":[{"type":"SQL_INJECTION","severity":"HIGH","confidence":0.94,"evidence":"admin OR 1=1 returned 200 with full user list"}],"scan_date":"2026-08-30T10:45:00Z"}', collectedAt: '2026-08-30T10:45:00' },
    { id: 'E-004', caseId: 'CASE-0241', type: 'system', name: 'System Configuration', label: 'System Configuration', description: 'Current system configuration snapshot', source: '/etc/app/config.yaml', content: 'server:\n  host: 0.0.0.0\n  port: 8080\ndatabase:\n  host: localhost\n  port: 5432\n  name: auth_service\nsecurity:\n  sql_parameterization: false\n  input_validation: partial\n  waf_enabled: false', collectedAt: '2026-08-30T10:44:00' },
    { id: 'E-005', caseId: 'CASE-0241', type: 'code', name: 'Source Code Snapshot', label: 'Source Code Snapshot', description: 'Authentication module source code', source: '/app/src/auth/login.js', content: 'function login(username, password) {\n  const query = `SELECT * FROM users WHERE username=\'${username}\' AND password=\'${password}\'`;\n  return db.query(query);\n}\n// VULNERABILITY: String concatenation allows SQL injection\n// FIX: Use parameterized queries', collectedAt: '2026-08-30T10:45:00' },
    { id: 'E-006', caseId: 'CASE-0241', type: 'network', name: 'Network Traffic Capture', label: 'Network Traffic Capture', description: 'Packet capture of authentication requests', source: '/captures/auth-traffic.pcap', content: 'POST /api/auth/login HTTP/1.1\nHost: server01.example.com\nContent-Type: application/x-www-form-urlencoded\n\nusername=admin%27+OR+%271%27%3D%271%27+--&password=anything\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n{"status":"success","users":[{"id":1,"name":"admin"},{"id":2,"name":"user1"}]}', collectedAt: '2026-08-30T10:46:00' },
    { id: 'E-007', caseId: 'CASE-0241', type: 'file', name: 'Suspicious Query Pattern', label: 'Suspicious Query Pattern', description: 'Extracted malicious SQL query patterns', source: '/forensics/sql-patterns.txt', content: 'PATTERN 1: admin\' OR \'1\'=\'1\' --\nPATTERN 2: \' UNION SELECT * FROM users --\nPATTERN 3: \'; DROP TABLE users; --\nSOURCE IP: 192.168.1.100\nTIMESTAMP: 2026-08-30T10:42:10\nTARGET: /api/auth/login (POST)', collectedAt: '2026-08-30T10:46:00' },
    { id: 'E-008', caseId: 'CASE-0241', type: 'system', name: 'Database Access Records', label: 'Database Access Records', description: 'Database query logs showing executed statements', source: '/var/log/postgresql/query.log', content: '2026-08-30 10:42:05 LOG: statement: SELECT * FROM users WHERE username=\'admin\' OR \'1\'=\'1\' --\' AND password=\'anything\'\n2026-08-30 10:42:05 DETAIL: query returned 47 rows (full user table)\n2026-08-30 10:42:10 WARNING: suspicious query pattern from application auth_service', collectedAt: '2026-08-30T10:47:00' },
    { id: 'E-009', caseId: 'CASE-0242', type: 'network', name: 'Outbound Network Logs', label: 'Outbound Network Logs', description: 'Firewall logs showing unusual outbound traffic', source: '/var/log/firewall/outbound.log', content: 'Aug 30 09:10:01 fw01 kernel: ACCEPT OUT: 10.0.3.15 -> 203.0.113.50 port 443\nAug 30 09:12:03 fw01 kernel: ACCEPT OUT: 10.0.3.15 -> 198.51.100.22 port 8443\nAug 30 09:13:05 fw01 kernel: ACCEPT OUT: 10.0.3.15 -> 192.0.2.100 port 4444', collectedAt: '2026-08-30T09:20:00' },
    { id: 'E-010', caseId: 'CASE-0242', type: 'system', name: 'Running Processes List', label: 'Running Processes List', description: 'Snapshot of active processes on Server 03', source: '/forensics/ps-snapshot.txt', content: 'PID   USER    COMMAND\n1     root    /sbin/init\n456   www     /usr/sbin/apache2\n789   www     /usr/bin/php-fpm\n1234  root    /tmp/.hidden/implant --connect 203.0.113.50:443\n1235  root    /tmp/.hidden/c2-beacon --interval 30', collectedAt: '2026-08-30T09:21:00' },
    { id: 'E-011', caseId: 'CASE-0242', type: 'file', name: 'Modified Binary Hash', label: 'Modified Binary Hash', description: 'Hash of recently modified executable', source: '/forensics/binary-hashes.txt', content: 'FILE: /usr/bin/curl\nMODIFIED: 2026-08-30T09:05:00\nORIGINAL SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\nCURRENT SHA-256: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2\nSTATUS: MODIFIED AFTER DEPLOYMENT', collectedAt: '2026-08-30T09:22:00' },
  ];

  for (const ev of evidenceData) {
    // Skip if evidence already exists (INSERT OR IGNORE equivalent via check)
    const existing = db.prepare('SELECT evidence_id FROM evidence WHERE evidence_id = ?').get(ev.id);
    if (existing) continue;

    const evidenceHash = hashEvidence(ev.content);
    const size = Buffer.byteLength(ev.content, 'utf-8');

    // Create first provenance event for this evidence
    const previousHash = getPreviousRecordHash(db, ev.caseId);
    const eventId = `PE-${uuidv4().substring(0, 8)}`;
    const eventRecord = {
      event_id: eventId,
      case_id: ev.caseId,
      evidence_id: ev.id,
      event_type: 'EVIDENCE_REGISTERED',
      actor_type: 'officer',
      actor_id: 'Officer Martinez',
      timestamp: ev.collectedAt,
      description: `Evidence ${ev.name} (${ev.id}) registered for case ${ev.caseId}`,
      previous_record_hash: previousHash,
    };
    const recordHash = hashRecord(eventRecord);

    db.prepare(`
      INSERT INTO provenance_events (
        event_id, case_id, evidence_id, event_type, actor_type, actor_id,
        timestamp, description, previous_record_hash, record_hash, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId, ev.caseId, ev.id, 'EVIDENCE_REGISTERED', 'officer', 'Officer Martinez',
      ev.collectedAt, `Evidence ${ev.name} (${ev.id}) registered for case ${ev.caseId}`,
      previousHash, recordHash, JSON.stringify({ evidence_name: ev.name })
    );

    // Create evidence record
    db.prepare(`
      INSERT INTO evidence (
        evidence_id, case_id, name, type, source, collected_by, collected_at,
        storage_reference, content, size, hash_algorithm, evidence_hash,
        record_hash, verification_status, created_at, label, description,
        verified, integrity_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ev.id, ev.caseId, ev.name, ev.type, ev.source || 'Not specified',
      'Officer Martinez', ev.collectedAt,
      `storage://${ev.id}`, ev.content, size,
      'SHA-256', evidenceHash,
      recordHash, 'verified', ev.collectedAt,
      ev.label, ev.description,
      1, 'Evidence has not been changed since registration.'
    );
  }

  // ───────── Seed Actions ─────────
  const actions = [
    { id: 'ACT-001', caseId: 'CASE-0241', actionType: 'Open security investigation', actorType: 'System', status: 'completed', trust: 'verified', timestamp: '2026-08-30T10:43:00' },
    { id: 'ACT-002', caseId: 'CASE-0241', actionType: 'Collect and verify evidence', actorType: 'System', status: 'completed', trust: 'verified', timestamp: '2026-08-30T10:47:00' },
    { id: 'ACT-003', caseId: 'CASE-0241', actionType: 'Complete security investigation', actorType: 'AI Analysis', status: 'completed', trust: 'verified', timestamp: '2026-08-30T10:51:00' },
    { id: 'ACT-004', caseId: 'CASE-0241', actionType: 'Generate fix recommendation', actorType: 'AI Analysis', status: 'completed', trust: 'verified', timestamp: '2026-08-30T11:03:00' },
    { id: 'ACT-005', caseId: 'CASE-0241', actionType: 'Fix authentication vulnerability', actorType: 'AI + Officer Approval', status: 'awaiting_approval', trust: 'pending', timestamp: '2026-08-30T11:03:00' },
    { id: 'ACT-006', caseId: 'CASE-0242', actionType: 'Collect network traffic logs', actorType: 'System', status: 'in_progress', trust: 'pending', timestamp: '2026-08-30T09:20:00' },
  ];

  for (const act of actions) {
    const existing = db.prepare('SELECT action_id FROM actions WHERE action_id = ?').get(act.id);
    if (existing) continue;
    db.prepare(`
      INSERT INTO actions (action_id, case_id, action_type, actor_type, actor_id, status, timestamp, description, trust)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(act.id, act.caseId, act.actionType, act.actorType, 'system', act.status, act.timestamp, act.actionType, act.trust);
  }

  // ───────── CASE-0243 — Demo Investigation Scenario ─────────
  // Ensure case exists (may have been created by tests)
  const case0243Exists = db.prepare("SELECT case_id FROM cases WHERE case_id = 'CASE-0243'").get();
  if (!case0243Exists) {
    const case0243Stages = [
      { id: 'detected', label: 'Detected', status: 'completed', timestamp: '2026-08-30T10:30:00' },
      { id: 'evidence', label: 'Evidence', status: 'completed', timestamp: '2026-08-30T10:32:00' },
      { id: 'investigation', label: 'Investigated', status: 'completed', timestamp: '2026-08-30T10:35:00' },
      { id: 'finding', label: 'Issue Found', status: 'completed', timestamp: '2026-08-30T10:38:00' },
      { id: 'report', label: 'Initial Report', status: 'completed', timestamp: '2026-08-30T10:40:00' },
      { id: 'decision', label: 'Next Action', status: 'completed', timestamp: '2026-08-30T10:42:00' },
      { id: 'remediation', label: 'Fix', status: 'active', timestamp: null },
      { id: 'verification', label: 'Verify', status: 'pending', timestamp: null },
      { id: 'deployment', label: 'Deploy', status: 'pending', timestamp: null },
      { id: 'monitoring', label: 'Monitor', status: 'pending', timestamp: null },
      { id: 'complete', label: 'Complete', status: 'pending', timestamp: null },
    ];

    const case0243Timeline = [
      { time: '10:30', title: 'Suspicious data access detected', description: 'Endpoint monitoring flagged unusual authentication and file access patterns', type: 'detection' },
      { time: '10:32', title: 'Case created', description: 'CASE-0243 opened and assigned to Officer Rivera', type: 'system' },
      { time: '10:33', title: 'Evidence collection started', description: 'Authentication logs, USB activity logs, and file access logs collected', type: 'evidence' },
      { time: '10:35', title: 'Investigation engine run', description: 'Deterministic correlation identified attack chain', type: 'investigation' },
      { time: '10:38', title: 'Finding created', description: 'Potential Unauthorized Data Access — HIGH severity', type: 'finding' },
    ];

    db.prepare(`
      INSERT INTO cases (
        case_id, case_number, title, subtitle, description, status, severity,
        system, assigned_to, created_at, updated_at, current_stage, stages_json,
      evidence_items_json, evidence_verified, detection_json, investigation_json,
      finding_json, remediation_json, verification_json, deployment_json,
      monitoring_json, timeline_json, fix_steps_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CASE-0243', '0243',
    'Suspicious Data Access',
    'Potential unauthorized data transfer via USB on Server 05',
    'Endpoint monitoring detected suspicious authentication, privilege escalation, USB activity, and file access.',
    'active', 'high',
    'Server 05', 'Officer Rivera',
    '2026-08-30T10:30:00', '2026-08-30T10:30:00', 3,
    JSON.stringify(case0243Stages),
    JSON.stringify(['E-050', 'E-051', 'E-052']),
      1,
      JSON.stringify({
        description: 'Suspicious data access detected on Server 05.',
        method: 'Endpoint monitoring',
        time: '10:30 AM',
        date: 'August 30, 2026',
        technicalDetails: {
          alertSource: 'Endpoint Detection & Response',
          host: 'server05.internal',
          suspiciousSequence: ['failed_logins', 'successful_login', 'privilege_escalation', 'usb_connect', 'file_access'],
        },
      }),
      JSON.stringify({
        finding: 'The investigation engine identified a sequence of events consistent with unauthorized data access.',
        cause: 'Credential-based attack leading to data exfiltration via USB.',
        confidence: 'high',
        supportingEvidence: ['E-050', 'E-051', 'E-052'],
      }),
      JSON.stringify({
        name: 'Potential Unauthorized Data Access',
        severity: 'high',
        affected: 'Server 05',
        status: 'open',
        evidenceCount: 3,
        description: 'An attacker gained access through authentication abuse, escalated privileges, connected a USB device, and accessed sensitive files.',
        recommendedAction: 'Isolate system, review USB policies, reset credentials',
      }),
      JSON.stringify({
        recommendation: 'Isolate the affected system and review USB device policies.',
        rationale: 'Evidence suggests data exfiltration through removable media.',
        expectedResult: 'System isolated, no further data access.',
        risk: 'high',
        approved: false,
      }),
      JSON.stringify({
        securityTest: { label: 'Security Test', detail: 'Pending', status: 'pending' },
        regressionTest: { label: 'Regression Tests', detail: 'Pending', status: 'pending' },
        systemCheck: { label: 'System Check', detail: 'Pending', status: 'pending' },
        independentVerification: { label: 'Independent Verification', detail: 'Pending', status: 'pending' },
        overallResult: 'pending',
      }),
      JSON.stringify({ target: 'Server 05', change: 'Isolation + USB policy review', status: 'pending', postDeployCheck: 'pending', securityState: 'pending' }),
      JSON.stringify({ lastCheck: null, systemState: 'pending', securityState: 'pending', evidenceIntegrity: 'pending', consistency: 'pending', runtimeAudit: 'pending' }),
      JSON.stringify(case0243Timeline),
      JSON.stringify([
        { label: 'Isolate affected system', status: 'pending' },
        { label: 'Review USB device policies', status: 'pending' },
        { label: 'Reset compromised credentials', status: 'pending' },
        { label: 'Run verification checks', status: 'pending' },
      ])
    );
  }

  // ───────── Seed CASE-0243 Evidence ─────────
  const case0243Evidence = [
    {
      id: 'E-050', caseId: 'CASE-0243', type: 'logs', name: 'Authentication Log',
      label: 'Authentication Log',
      description: 'Server authentication log showing failed and successful login attempts',
      source: '/var/log/auth.log',
      content: 'Aug 30 10:32:01 server05 sshd[5678]: Failed password for admin from 192.168.1.100 port 22 ssh2\nAug 30 10:32:03 server05 sshd[5679]: Failed password for root from 192.168.1.100 port 22 ssh2\nAug 30 10:32:05 server05 sshd[5680]: Failed password for operator from 192.168.1.100 port 22 ssh2\nAug 30 10:32:07 server05 sshd[5681]: Failed password for sysadmin from 192.168.1.100 port 22 ssh2\nAug 30 10:32:09 server05 sshd[5682]: Failed password for test from 192.168.1.100 port 22 ssh2\nAug 30 10:35:01 server05 sshd[5683]: Accepted password for operator from 192.168.1.100 port 22 ssh2\nAug 30 10:37:02 server05 sudo: operator : TTY=pts/0 ; PWD=/home/operator ; USER=root ; COMMAND=/bin/su',
      collectedAt: '2026-08-30T10:33:00',
    },
    {
      id: 'E-051', caseId: 'CASE-0243', type: 'system', name: 'USB Activity Log',
      label: 'USB Activity Log',
      description: 'System log showing USB device connection events',
      source: '/var/log/usb-activity.log',
      content: 'Aug 30 10:41:00 server05 kernel: [USB] Device connected: Kingston DataTraveler 32GB (Serial: KST-20260830)\nAug 30 10:41:01 server05 kernel: [USB] Storage device mounted at /mnt/usb (NTFS)\nAug 30 10:41:02 server05 kernel: [USB] Write access granted to root user',
      collectedAt: '2026-08-30T10:33:00',
    },
    {
      id: 'E-052', caseId: 'CASE-0243', type: 'logs', name: 'File Access Log',
      label: 'File Access Log',
      description: 'System audit log showing sensitive file access events',
      source: '/var/log/audit/file-access.log',
      content: 'Aug 30 10:42:00 server05 audit[9012]: ACCESS read user=root file=/etc/shadow size=2048\nAug 30 10:42:01 server05 audit[9012]: ACCESS write user=root file=/mnt/usb/shadow_copy.txt size=2048\nAug 30 10:42:02 server05 audit[9012]: FILE_CLOSE user=root file=/etc/shadow',
      collectedAt: '2026-08-30T10:34:00',
    },
  ];

  for (const ev of case0243Evidence) {
    const existing = db.prepare('SELECT evidence_id FROM evidence WHERE evidence_id = ?').get(ev.id);
    if (existing) continue;

    const evidenceHash = hashEvidence(ev.content);
    const size = Buffer.byteLength(ev.content, 'utf-8');

    const previousHash = getPreviousRecordHash(db, ev.caseId);
    const eventId = `PE-${uuidv4().substring(0, 8)}`;
    const eventRecord = {
      event_id: eventId,
      case_id: ev.caseId,
      evidence_id: ev.id,
      event_type: 'EVIDENCE_REGISTERED',
      actor_type: 'officer',
      actor_id: 'Officer Rivera',
      timestamp: ev.collectedAt,
      description: `Evidence ${ev.name} (${ev.id}) registered for case ${ev.caseId}`,
      previous_record_hash: previousHash,
    };
    const recordHash = hashRecord(eventRecord);

    db.prepare(`
      INSERT INTO provenance_events (
        event_id, case_id, evidence_id, event_type, actor_type, actor_id,
        timestamp, description, previous_record_hash, record_hash, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId, ev.caseId, ev.id, 'EVIDENCE_REGISTERED', 'officer', 'Officer Rivera',
      ev.collectedAt, `Evidence ${ev.name} (${ev.id}) registered for case ${ev.caseId}`,
      previousHash, recordHash, JSON.stringify({ evidence_name: ev.name })
    );

    db.prepare(`
      INSERT INTO evidence (
        evidence_id, case_id, name, type, source, collected_by, collected_at,
        storage_reference, content, size, hash_algorithm, evidence_hash,
        record_hash, verification_status, created_at, label, description,
        verified, integrity_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ev.id, ev.caseId, ev.name, ev.type, ev.source || 'Not specified',
      'Officer Rivera', ev.collectedAt,
      `storage://${ev.id}`, ev.content, size,
      'SHA-256', evidenceHash,
      recordHash, 'verified', ev.collectedAt,
      ev.label, ev.description,
      1, 'Evidence has not been changed since registration.'
    );
  }

  console.log('Database seeded successfully.');
}

function getPreviousRecordHash(db, caseId) {
  const lastEvent = db.prepare(
    'SELECT record_hash FROM provenance_events WHERE case_id = ? ORDER BY rowid DESC LIMIT 1'
  ).get(caseId);
  return lastEvent ? lastEvent.record_hash : 'GENESIS';
}
