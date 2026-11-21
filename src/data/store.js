import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const DEMO_DIR = new URL("./", import.meta.url);
const dbPath = process.env.DATABASE_PATH || "./data/campus.db";

mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS source_documents (
    source TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    data_mode TEXT NOT NULL DEFAULT 'mock'
  );
`);

export function getDataMode() {
  return process.env.DATA_MODE || "mock";
}

export async function readSourceDocument(source) {
  const row = db.prepare("SELECT payload, updated_at, data_mode FROM source_documents WHERE source = ?").get(source);
  if (row) {
    const payload = JSON.parse(row.payload);
    return {
      ...payload,
      dataStatus: {
        mode: row.data_mode,
        source,
        verifiedLive: row.data_mode === "live",
        lastUpdated: row.updated_at
      }
    };
  }

  const fileName = `${source}.json`;
  const raw = await readFile(new URL(fileName, DEMO_DIR), "utf8");
  const payload = JSON.parse(raw);
  const now = new Date().toISOString();
  db.prepare(
    "INSERT OR REPLACE INTO source_documents (source, payload, updated_at, data_mode) VALUES (?, ?, ?, ?)"
  ).run(source, JSON.stringify(payload), now, getDataMode());
  return {
    ...payload,
    dataStatus: {
      mode: getDataMode(),
      source,
      verifiedLive: false,
      lastUpdated: now
    }
  };
}

export function writeSourceDocument(source, payload) {
  const now = new Date().toISOString();
  db.prepare(
    "INSERT OR REPLACE INTO source_documents (source, payload, updated_at, data_mode) VALUES (?, ?, ?, ?)"
  ).run(source, JSON.stringify(payload), now, getDataMode());
  return now;
}

export function closeDataStore() {
  db.close();
}
