import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'fpc-sorvax.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      case_id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      severity TEXT DEFAULT 'medium',
      system TEXT,
      assigned_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      current_stage INTEGER DEFAULT 0,
      stages_json TEXT DEFAULT '[]',
      detection_json TEXT DEFAULT '{}',
      investigation_json TEXT DEFAULT '{}',
      finding_json TEXT DEFAULT '{}',
      remediation_json TEXT DEFAULT '{}',
      verification_json TEXT DEFAULT '{}',
      deployment_json TEXT DEFAULT '{}',
      monitoring_json TEXT DEFAULT '{}',
      evidence_verified INTEGER DEFAULT 0,
      evidence_items_json TEXT DEFAULT '[]',
      timeline_json TEXT DEFAULT '[]',
      fix_steps_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS evidence (
      evidence_id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      source TEXT,
      collected_by TEXT,
      collected_at TEXT,
      storage_reference TEXT,
      content TEXT,
      size INTEGER DEFAULT 0,
      hash_algorithm TEXT DEFAULT 'SHA-256',
      evidence_hash TEXT NOT NULL,
      record_hash TEXT,
      verification_status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      label TEXT,
      description TEXT,
      verified INTEGER DEFAULT 0,
      integrity_message TEXT DEFAULT 'Evidence has not been changed since registration.',
      content_encoding TEXT DEFAULT NULL,
      file_name TEXT DEFAULT NULL,
      mime_type TEXT DEFAULT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(case_id)
    );

    CREATE TABLE IF NOT EXISTS provenance_events (
      event_id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      evidence_id TEXT,
      action_id TEXT,
      event_type TEXT NOT NULL,
      actor_type TEXT DEFAULT 'system',
      actor_id TEXT,
      timestamp TEXT NOT NULL,
      description TEXT,
      previous_record_hash TEXT DEFAULT 'GENESIS',
      record_hash TEXT NOT NULL,
      metadata_json TEXT DEFAULT '{}',
      FOREIGN KEY (case_id) REFERENCES cases(case_id)
    );

    CREATE TABLE IF NOT EXISTS integrity_verifications (
      verification_id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      evidence_id TEXT,
      verification_type TEXT NOT NULL,
      expected_hash TEXT,
      calculated_hash TEXT,
      status TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      reason TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(case_id)
    );

    CREATE TABLE IF NOT EXISTS actions (
      action_id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      action_type TEXT,
      actor_type TEXT,
      actor_id TEXT,
      status TEXT DEFAULT 'pending',
      timestamp TEXT NOT NULL,
      description TEXT,
      trust TEXT DEFAULT 'pending',
      FOREIGN KEY (case_id) REFERENCES cases(case_id)
    );

    -- Phase 2: Investigation Engine tables
    CREATE TABLE IF NOT EXISTS investigations (
      investigation_id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      evidence_reviewed INTEGER DEFAULT 0,
      events_correlated INTEGER DEFAULT 0,
      findings_count INTEGER DEFAULT 0,
      summary TEXT,
      adapter_used TEXT,
      metadata_json TEXT DEFAULT '{}',
      FOREIGN KEY (case_id) REFERENCES cases(case_id)
    );

    CREATE TABLE IF NOT EXISTS investigation_events (
      event_id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      normalized_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor TEXT,
      target TEXT,
      action TEXT,
      severity TEXT DEFAULT 'info',
      metadata_json TEXT DEFAULT '{}',
      evidence_id TEXT,
      FOREIGN KEY (investigation_id) REFERENCES investigations(investigation_id),
      FOREIGN KEY (case_id) REFERENCES cases(case_id),
      FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id)
    );

    CREATE TABLE IF NOT EXISTS findings (
      finding_id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT DEFAULT 'medium',
      confidence TEXT DEFAULT 'medium',
      affected_asset TEXT,
      status TEXT DEFAULT 'open',
      recommended_next_step TEXT,
      supporting_evidence_json TEXT DEFAULT '[]',
      supporting_events_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (investigation_id) REFERENCES investigations(investigation_id),
      FOREIGN KEY (case_id) REFERENCES cases(case_id)
    );

    -- Phase 3: AI Integration table
    CREATE TABLE IF NOT EXISTS ai_interactions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT,
      input_reference TEXT,
      input_fingerprint TEXT,
      output TEXT,
      output_hash TEXT,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(case_id)
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_provenance_case ON provenance_events(case_id);
    CREATE INDEX IF NOT EXISTS idx_provenance_evidence ON provenance_events(evidence_id);
    CREATE INDEX IF NOT EXISTS idx_actions_case ON actions(case_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_case ON integrity_verifications(case_id);
    CREATE INDEX IF NOT EXISTS idx_investigations_case ON investigations(case_id);
    CREATE INDEX IF NOT EXISTS idx_investigation_events_case ON investigation_events(case_id);
    CREATE INDEX IF NOT EXISTS idx_investigation_events_investigation ON investigation_events(investigation_id);
    CREATE INDEX IF NOT EXISTS idx_findings_case ON findings(case_id);
    CREATE INDEX IF NOT EXISTS idx_findings_investigation ON findings(investigation_id);
    CREATE INDEX IF NOT EXISTS idx_ai_interactions_case ON ai_interactions(case_id);
    CREATE INDEX IF NOT EXISTS idx_ai_interactions_fingerprint ON ai_interactions(input_fingerprint);
  `);

  // Schema migrations for existing databases
  migrateSchema(db);
}

function migrateSchema(db) {
  // Add content_encoding, file_name, mime_type columns if they don't exist
  const columns = db.prepare("PRAGMA table_info(evidence)").all();
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('content_encoding')) {
    db.exec('ALTER TABLE evidence ADD COLUMN content_encoding TEXT DEFAULT NULL');
  }
  if (!columnNames.includes('file_name')) {
    db.exec('ALTER TABLE evidence ADD COLUMN file_name TEXT DEFAULT NULL');
  }
  if (!columnNames.includes('mime_type')) {
    db.exec('ALTER TABLE evidence ADD COLUMN mime_type TEXT DEFAULT NULL');
  }

  // Phase 3: Add ai_interactions table if it doesn't exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_interactions'").all();
  if (tables.length === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_interactions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT,
        input_reference TEXT,
        input_fingerprint TEXT,
        output TEXT,
        output_hash TEXT,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES cases(case_id)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_interactions_case ON ai_interactions(case_id);
      CREATE INDEX IF NOT EXISTS idx_ai_interactions_fingerprint ON ai_interactions(input_fingerprint);
    `);
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
