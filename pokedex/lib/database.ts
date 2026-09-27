import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const dataDir = resolve(process.env.POKEDEX_DATA_DIR || "data-local");
mkdirSync(dataDir, { recursive: true });
const sqlite = new DatabaseSync(resolve(dataDir, "pokedex.sqlite"));
sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
sqlite.exec("CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
for (const name of readdirSync(resolve("migrations")).filter(n => n.endsWith(".sql")).sort()) {
  if (sqlite.prepare("SELECT name FROM app_migrations WHERE name = ?").get(name)) continue;
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    sqlite.exec(readFileSync(resolve("migrations", name), "utf8"));
    sqlite.prepare("INSERT INTO app_migrations VALUES (?, ?)").run(name, new Date().toISOString());
    sqlite.exec("COMMIT");
  } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
}
class Statement {
  constructor(private sql: string, private args: SQLInputValue[] = []) {}
  bind(...args: SQLInputValue[]) { return new Statement(this.sql, args); }
  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return (sqlite.prepare(this.sql).get(...this.args) as T | undefined) ?? null;
  }
  async all<T = Record<string, unknown>>() {
    return { results: sqlite.prepare(this.sql).all(...this.args) as T[] };
  }
  execute() { return sqlite.prepare(this.sql).run(...this.args); }
  async run() { return this.execute(); }
}
const adapter = {
  prepare(sql: string) { return new Statement(sql); },
  async batch<T = Record<string, unknown>>(statements: Statement[]) {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const result = await Promise.all(statements.map(statement => statement.all<T>()));
      sqlite.exec("COMMIT");
      return result;
    } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  },
};
export function database() { return adapter; }
export function closeDatabase() { sqlite.close(); }
