import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import type { Report } from "./domain";
function db() {
  const url = process.env.DATABASE_URL || "file:work/proof-of-carbon.db";
  if (
    process.env.NODE_ENV === "production" &&
    !url.startsWith("libsql://") &&
    !url.startsWith("https://")
  )
    throw Error(
      "Production requires a durable remote DATABASE_URL (libsql:// or https://).",
    );
  if (url.startsWith("file:")) mkdirSync("work", { recursive: true });
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
}
export async function saveReport(report: Report) {
  const client = db();
  try {
    await client.execute(
      "CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at TEXT NOT NULL)",
    );
    await client.execute({
      sql: "INSERT OR IGNORE INTO reports (id,body,created_at) VALUES (?,?,?)",
      args: [report.id, JSON.stringify(report), report.createdAt],
    });
  } finally {
    client.close();
  }
}
export async function getReport(id: string): Promise<Report | null> {
  const client = db();
  try {
    await client.execute(
      "CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at TEXT NOT NULL)",
    );
    const r = await client.execute({
      sql: "SELECT body FROM reports WHERE id=?",
      args: [id],
    });
    return r.rows.length ? JSON.parse(String(r.rows[0].body)) : null;
  } finally {
    client.close();
  }
}
