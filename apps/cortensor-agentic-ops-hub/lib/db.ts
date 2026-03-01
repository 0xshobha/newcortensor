/**
 * SQLite persistence layer for task replay and observability
 * Uses better-sqlite3 (synchronous, no async issues)
 *
 * On Vercel serverless: SQLite may not be available (read-only FS).
 * All DB operations gracefully no-op when SQLite is unavailable.
 */

import path from "path";
import fs from "fs";
import { EvidenceBundle } from "./evidence";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Database: any;
try {
    Database = require("better-sqlite3");
} catch {
    Database = null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "caoh.db");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
let dbAvailable = true;

function getDb() {
    if (db) return db;
    if (!dbAvailable || !Database) {
        dbAvailable = false;
        return null;
    }

    // Skip SQLite on Vercel — filesystem is read-only
    if (process.env.VERCEL === "1") {
        dbAvailable = false;
        return null;
    }

    try {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        db = new Database(DB_PATH);
        db.pragma("journal_mode = WAL");

        // Create tables
        db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          goal TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'running',
          started_at TEXT NOT NULL,
          completed_at TEXT,
          agent_count INTEGER DEFAULT 0,
          final_report TEXT,
          error TEXT
        );

        CREATE TABLE IF NOT EXISTS agent_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          level TEXT DEFAULT 'info',
          FOREIGN KEY (task_id) REFERENCES tasks(id)
        );

        CREATE TABLE IF NOT EXISTS evidence_bundles (
          task_id TEXT PRIMARY KEY,
          bundle_json TEXT NOT NULL,
          overall_score INTEGER,
          consensus_level TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (task_id) REFERENCES tasks(id)
        );

        CREATE TABLE IF NOT EXISTS observability (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          latency_ms INTEGER,
          success INTEGER DEFAULT 1,
          cortensor_calls INTEGER DEFAULT 0,
          avg_confidence REAL,
          created_at TEXT NOT NULL
        );
      `);

        return db;
    } catch (err) {
        console.warn("[DB] SQLite unavailable, running without persistence:", err instanceof Error ? err.message : err);
        dbAvailable = false;
        return null;
    }
}

export interface TaskRecord {
    id: string;
    goal: string;
    status: "running" | "completed" | "failed";
    started_at: string;
    completed_at?: string;
    agent_count?: number;
    final_report?: string;
    error?: string;
}

export interface AgentLog {
    id?: number;
    task_id: string;
    agent_name: string;
    message: string;
    timestamp: string;
    level: "info" | "warn" | "error" | "success";
}

export interface ObservabilityRecord {
    task_id: string;
    agent_name: string;
    latency_ms: number;
    success: boolean;
    cortensor_calls: number;
    avg_confidence?: number;
}

// Tasks
export function saveTask(task: Omit<TaskRecord, "started_at">): void {
    const d = getDb();
    if (!d) return;
    d.prepare(`
    INSERT OR REPLACE INTO tasks (id, goal, status, started_at, completed_at, agent_count, final_report, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        task.id,
        task.goal,
        task.status,
        new Date().toISOString(),
        task.completed_at ?? null,
        task.agent_count ?? 0,
        task.final_report ?? null,
        task.error ?? null
    );
}

export function updateTask(
    id: string,
    updates: Partial<TaskRecord>
): void {
    const d = getDb();
    if (!d) return;
    const sets = Object.keys(updates)
        .map((k) => `${k} = ?`)
        .join(", ");
    d.prepare(`UPDATE tasks SET ${sets} WHERE id = ?`).run(
        ...Object.values(updates),
        id
    );
}

export function getTask(id: string): TaskRecord | null {
    const d = getDb();
    if (!d) return null;
    return d.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRecord | null;
}

export function listTasks(limit = 50): TaskRecord[] {
    const d = getDb();
    if (!d) return [];
    return d
        .prepare("SELECT * FROM tasks ORDER BY started_at DESC LIMIT ?")
        .all(limit) as TaskRecord[];
}

// Agent logs
export function appendLog(log: AgentLog): void {
    const d = getDb();
    if (!d) return;
    d.prepare(`
    INSERT INTO agent_logs (task_id, agent_name, message, timestamp, level)
    VALUES (?, ?, ?, ?, ?)
  `).run(log.task_id, log.agent_name, log.message, log.timestamp, log.level);
}

export function getTaskLogs(taskId: string): AgentLog[] {
    const d = getDb();
    if (!d) return [];
    return d
        .prepare("SELECT * FROM agent_logs WHERE task_id = ? ORDER BY timestamp ASC")
        .all(taskId) as AgentLog[];
}

// Evidence bundles
export function saveEvidenceBundle(bundle: EvidenceBundle): void {
    const d = getDb();
    if (!d) return;
    d.prepare(`
    INSERT OR REPLACE INTO evidence_bundles (task_id, bundle_json, overall_score, consensus_level, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
        bundle.taskId,
        JSON.stringify(bundle),
        bundle.overallScore,
        bundle.consensusLevel,
        bundle.timestamp
    );
}

export function getEvidenceBundle(taskId: string): EvidenceBundle | null {
    const d = getDb();
    if (!d) return null;
    const row = d
        .prepare("SELECT bundle_json FROM evidence_bundles WHERE task_id = ?")
        .get(taskId) as { bundle_json: string } | null;
    return row ? JSON.parse(row.bundle_json) : null;
}

// Observability
export function recordObservability(record: ObservabilityRecord): void {
    const d = getDb();
    if (!d) return;
    d.prepare(`
    INSERT INTO observability (task_id, agent_name, latency_ms, success, cortensor_calls, avg_confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
        record.task_id,
        record.agent_name,
        record.latency_ms,
        record.success ? 1 : 0,
        record.cortensor_calls,
        record.avg_confidence ?? null,
        new Date().toISOString()
    );
}

export function getObservabilityStats(): {
    task_id: string;
    agent_name: string;
    latency_ms: number;
    success: number;
    cortensor_calls: number;
    avg_confidence: number;
    created_at: string;
}[] {
    const d = getDb();
    if (!d) return [];
    return d
        .prepare(
            "SELECT * FROM observability ORDER BY created_at DESC LIMIT 100"
        )
        .all() as ReturnType<typeof getObservabilityStats>;
}

