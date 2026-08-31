/**
 * Audit Trail — Deterministic, Tamper-Evident Logging for FPC–SORVAX
 *
 * Every officer action, system event, and AI interaction is recorded with
 * a SHA-256 hash chain linking each event to its predecessor, creating a
 * tamper-evident audit log.
 *
 * Schema:
 *   audit_events (
 *     id TEXT PRIMARY KEY,
 *     case_id TEXT NOT NULL,
 *     event_type TEXT NOT NULL,
 *     actor_type TEXT NOT NULL,        -- 'officer', 'system', 'ai'
 *     actor_id TEXT NOT NULL,
 *     description TEXT,
 *     metadata_json TEXT,
 *     previous_hash TEXT,              -- hash of previous event in chain
 *     event_hash TEXT NOT NULL,         -- SHA-256 of this event
 *     created_at TEXT NOT NULL
 *   )
 *
 * Hash Chain:
 *   event_hash = SHA256(id + case_id + event_type + actor_id + created_at + previous_hash)
 *
 *   This means:
 *   - Every event is linked to its predecessor
 *   - Tampering with any event breaks the chain
 *   - Verification walks the chain and checks each hash
 *
 * Environment Variables:
 *   (none required — uses existing SQLite database)
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db.js';
import { Router } from 'express';

// ═══════════════════════════════════════════════════════
// Schema Initialization
// ═══════════════════════════════════════════════════════

/**
 * Ensure the audit_events table exists.
 * Idempotent — safe to call multiple times.
 */
export function initAuditTrail() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      description TEXT,
      metadata_json TEXT,
      previous_hash TEXT,
      event_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_case_id ON audit_events(case_id);
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_actor_type ON audit_events(actor_type);
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_previous_hash ON audit_events(previous_hash);
  `);

  return { initialized: true };
}

// ═══════════════════════════════════════════════════════
// Hash Computation
// ═══════════════════════════════════════════════════════

/**
 * Compute the SHA-256 hash of an audit event.
 *
 * The hash is deterministic: same inputs always produce the same output.
 * It includes the previous_hash to create a tamper-evident chain.
 */
function computeEventHash({ id, caseId, eventType, actorId, createdAt, previousHash }) {
  const payload = [
    id,
    caseId,
    eventType,
    actorId,
    createdAt,
    previousHash || 'GENESIS',
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Get the last event hash for a given case (the "chain tail").
 */
function getLastEventHash(caseId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT event_hash
    FROM audit_events
    WHERE case_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT 1
  `).get(caseId);

  return row ? row.event_hash : null;
}

// ═══════════════════════════════════════════════════════
// Event Recording
// ═══════════════════════════════════════════════════════

/**
 * Record an audit event.
 *
 * @param {Object} params
 * @param {string} params.caseId      - Case identifier
 * @param {string} params.eventType   - Event type (e.g., 'EVIDENCE_ADDED', 'AI_SUMMARY_GENERATED')
 * @param {string} params.actorType   - 'officer', 'system', or 'ai'
 * @param {string} params.actorId     - Actor identifier (e.g., 'Officer Chen', 'openai/gpt-4.1-nano')
 * @param {string} params.description - Human-readable description
 * @param {Object} params.metadata    - Additional metadata (stored as JSON)
 * @returns {Object} The recorded audit event
 */
export function recordAuditEvent({
  caseId,
  eventType,
  actorType,
  actorId,
  description,
  metadata,
}) {
  const db = getDb();
  const id = `AUD-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  // Get previous hash for chain linking
  const previousHash = getLastEventHash(caseId);

  // Compute deterministic event hash
  const eventHash = computeEventHash({
    id,
    caseId,
    eventType,
    actorId,
    createdAt: now,
    previousHash,
  });

  // Insert event
  db.prepare(`
    INSERT INTO audit_events (
      id, case_id, event_type, actor_type, actor_id,
      description, metadata_json, previous_hash, event_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    caseId,
    eventType,
    actorType,
    actorId,
    description || null,
    metadata ? JSON.stringify(metadata) : null,
    previousHash,
    eventHash,
    now,
  );

  return {
    id,
    caseId,
    eventType,
    actorType,
    actorId,
    description,
    previousHash,
    eventHash,
    createdAt: now,
  };
}

// ═══════════════════════════════════════════════════════
// Event Queries
// ═══════════════════════════════════════════════════════

/**
 * Get all audit events for a case, ordered chronologically.
 */
export function getAuditEventsForCase(caseId, { limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM audit_events
    WHERE case_id = ?
    ORDER BY created_at ASC, rowid ASC
    LIMIT ? OFFSET ?
  `).all(caseId, limit, offset);

  return rows.map(parseAuditRow);
}

/**
 * Get audit events filtered by type.
 */
export function getAuditEventsByType(caseId, eventType, { limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM audit_events
    WHERE case_id = ? AND event_type = ?
    ORDER BY created_at ASC, rowid ASC
    LIMIT ? OFFSET ?
  `).all(caseId, eventType, limit, offset);

  return rows.map(parseAuditRow);
}

/**
 * Get audit events filtered by actor type (officer, system, ai).
 */
export function getAuditEventsByActor(caseId, actorType, { limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM audit_events
    WHERE case_id = ? AND actor_type = ?
    ORDER BY created_at ASC, rowid ASC
    LIMIT ? OFFSET ?
  `).all(caseId, actorType, limit, offset);

  return rows.map(parseAuditRow);
}

/**
 * Get the total count of audit events for a case.
 */
export function getAuditEventCount(caseId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM audit_events WHERE case_id = ?
  `).get(caseId);

  return row ? row.count : 0;
}

/**
 * Get a summary of audit events by type for a case.
 */
export function getAuditSummary(caseId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT event_type, COUNT(*) as count, MIN(created_at) as first_at, MAX(created_at) as last_at
    FROM audit_events
    WHERE case_id = ?
    GROUP BY event_type
    ORDER BY last_at DESC
  `).all(caseId);

  return rows;
}

/**
 * Get the latest audit event for a case.
 */
export function getLatestAuditEvent(caseId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM audit_events
    WHERE case_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT 1
  `).get(caseId);

  return row ? parseAuditRow(row) : null;
}

// ═══════════════════════════════════════════════════════
// Chain Verification
// ═══════════════════════════════════════════════════════

/**
 * Verify the integrity of the hash chain for a case.
 *
 * Walks through all events chronologically and checks that:
 * 1. Each event's hash is correctly computed
 * 2. Each event's previous_hash matches the preceding event's hash
 *
 * @param {string} caseId - Case to verify
 * @returns {Object} { valid: boolean, totalEvents: number, brokenAt: number|null, errors: string[] }
 */
export function verifyAuditChain(caseId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM audit_events
    WHERE case_id = ?
    ORDER BY created_at ASC, rowid ASC
  `).all(caseId);

  if (rows.length === 0) {
    return {
      valid: true,
      totalEvents: 0,
      brokenAt: null,
      errors: [],
      message: 'No events to verify — chain is empty but valid.',
    };
  }

  const errors = [];
  let expectedPreviousHash = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check previous_hash linkage
    if (row.previous_hash !== expectedPreviousHash) {
      errors.push(
        `Event #${i + 1} (${row.id}): previous_hash mismatch. ` +
        `Expected "${expectedPreviousHash || 'GENESIS'}", got "${row.previous_hash}".`
      );
      return {
        valid: false,
        totalEvents: rows.length,
        brokenAt: i,
        errors,
      };
    }

    // Recompute and verify event hash
    const computedHash = computeEventHash({
      id: row.id,
      caseId: row.case_id,
      eventType: row.event_type,
      actorId: row.actor_id,
      createdAt: row.created_at,
      previousHash: row.previous_hash,
    });

    if (computedHash !== row.event_hash) {
      errors.push(
        `Event #${i + 1} (${row.id}): hash mismatch. ` +
        `Computed "${computedHash.substring(0, 16)}...", stored "${row.event_hash.substring(0, 16)}...".`
      );
      return {
        valid: false,
        totalEvents: rows.length,
        brokenAt: i,
        errors,
      };
    }

    // Advance expected chain
    expectedPreviousHash = row.event_hash;
  }

  return {
    valid: true,
    totalEvents: rows.length,
    brokenAt: null,
    errors: [],
    message: `Chain verified: ${rows.length} events, all hashes intact.`,
  };
}

// ═══════════════════════════════════════════════════════
// Inactivity Detection
// ═══════════════════════════════════════════════════════

/**
 * Detect officer inactivity for a case.
 *
 * Checks if the most recent officer action is older than a threshold.
 *
 * @param {string} caseId       - Case to check
 * @param {number} thresholdMs  - Inactivity threshold in milliseconds (default: 30 minutes)
 * @returns {Object} { inactive: boolean, lastActivity: string|null, inactiveSince: string|null }
 */
export function detectInactivity(caseId, thresholdMs = 30 * 60 * 1000) {
  const db = getDb();
  const row = db.prepare(`
    SELECT created_at FROM audit_events
    WHERE case_id = ? AND actor_type = 'officer'
    ORDER BY created_at DESC, rowid DESC
    LIMIT 1
  `).get(caseId);

  if (!row) {
    return {
      inactive: true,
      lastActivity: null,
      inactiveSince: null,
      message: 'No officer activity recorded for this case.',
    };
  }

  const lastActivityTime = new Date(row.created_at).getTime();
  const now = Date.now();
  const elapsed = now - lastActivityTime;

  return {
    inactive: elapsed > thresholdMs,
    lastActivity: row.created_at,
    inactiveSince: elapsed > thresholdMs ? new Date(lastActivityTime).toISOString() : null,
    elapsedMs: elapsed,
    thresholdMs,
  };
}

// ═══════════════════════════════════════════════════════
// REST API Routes
// ═══════════════════════════════════════════════════════

/**
 * Create the Express router for audit trail endpoints.
 *
 * Routes:
 *   GET  /api/audit/case/:caseId           - All events for a case
 *   GET  /api/audit/case/:caseId/type/:type - Events filtered by type
 *   GET  /api/audit/case/:caseId/actor/:type - Events filtered by actor type
 *   GET  /api/audit/case/:caseId/summary   - Event summary by type
 *   GET  /api/audit/case/:caseId/verify    - Verify hash chain integrity
 *   GET  /api/audit/case/:caseId/inactivity - Detect officer inactivity
 *   GET  /api/audit/case/:caseId/latest    - Latest event
 *   GET  /api/audit/case/:caseId/count     - Total event count
 */
export function createAuditRoutes() {
  const router = Router();

  // GET /api/audit/case/:caseId — All events for a case
  router.get('/case/:caseId', (req, res) => {
    try {
      const { caseId } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;

      const events = getAuditEventsForCase(caseId, { limit, offset });
      const count = getAuditEventCount(caseId);

      res.json({
        caseId,
        events,
        total: count,
        limit,
        offset,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get audit events', detail: err.message });
    }
  });

  // GET /api/audit/case/:caseId/type/:type — Events by type
  router.get('/case/:caseId/type/:type', (req, res) => {
    try {
      const { caseId, type } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;

      const events = getAuditEventsByType(caseId, type, { limit, offset });

      res.json({
        caseId,
        eventType: type,
        events,
        total: events.length,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get audit events by type', detail: err.message });
    }
  });

  // GET /api/audit/case/:caseId/actor/:type — Events by actor type
  router.get('/case/:caseId/actor/:type', (req, res) => {
    try {
      const { caseId, type } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;

      const events = getAuditEventsByActor(caseId, type, { limit, offset });

      res.json({
        caseId,
        actorType: type,
        events,
        total: events.length,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get audit events by actor', detail: err.message });
    }
  });

  // GET /api/audit/case/:caseId/summary — Event summary
  router.get('/case/:caseId/summary', (req, res) => {
    try {
      const { caseId } = req.params;
      const summary = getAuditSummary(caseId);
      const count = getAuditEventCount(caseId);

      res.json({
        caseId,
        totalEvents: count,
        summary,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get audit summary', detail: err.message });
    }
  });

  // GET /api/audit/case/:caseId/verify — Verify chain integrity
  router.get('/case/:caseId/verify', (req, res) => {
    try {
      const { caseId } = req.params;
      const result = verifyAuditChain(caseId);

      res.json({
        caseId,
        ...result,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to verify audit chain', detail: err.message });
    }
  });

  // GET /api/audit/case/:caseId/inactivity — Detect inactivity
  router.get('/case/:caseId/inactivity', (req, res) => {
    try {
      const { caseId } = req.params;
      const thresholdMs = parseInt(req.query.thresholdMs) || 30 * 60 * 1000;
      const result = detectInactivity(caseId, thresholdMs);

      res.json({
        caseId,
        ...result,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to detect inactivity', detail: err.message });
    }
  });

  // GET /api/audit/case/:caseId/latest — Latest event
  router.get('/case/:caseId/latest', (req, res) => {
    try {
      const { caseId } = req.params;
      const event = getLatestAuditEvent(caseId);

      if (!event) {
        return res.json({ caseId, event: null, message: 'No audit events found.' });
      }

      res.json({ caseId, event });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get latest audit event', detail: err.message });
    }
  });

  // GET /api/audit/case/:caseId/count — Total event count
  router.get('/case/:caseId/count', (req, res) => {
    try {
      const { caseId } = req.params;
      const count = getAuditEventCount(caseId);

      res.json({ caseId, count });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get audit event count', detail: err.message });
    }
  });

  return router;
}

// ═══════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════

/**
 * Parse a database row into a structured audit event object.
 */
function parseAuditRow(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    eventType: row.event_type,
    actorType: row.actor_type,
    actorId: row.actor_id,
    description: row.description,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    previousHash: row.previous_hash,
    eventHash: row.event_hash,
    createdAt: row.created_at,
  };
}

export default {
  initAuditTrail,
  recordAuditEvent,
  getAuditEventsForCase,
  getAuditEventsByType,
  getAuditEventsByActor,
  getAuditEventCount,
  getAuditSummary,
  getLatestAuditEvent,
  verifyAuditChain,
  detectInactivity,
  createAuditRoutes,
};
