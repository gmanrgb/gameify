import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: SqlJsDatabase | null = null;
let dbPath: string;
let saveInterval: ReturnType<typeof setInterval> | null = null;

function getDbPath(): string {
  // Allow override via environment variable
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  const platform = process.platform;
  let basePath: string;

  switch (platform) {
    case 'win32':
      basePath = process.env.APPDATA || join(os.homedir(), 'AppData', 'Roaming');
      break;
    case 'darwin':
      basePath = join(os.homedir(), 'Library', 'Application Support');
      break;
    default: // linux and others
      basePath = join(os.homedir(), '.local', 'share');
  }

  return join(basePath, 'QuestLog', 'questlog.db');
}

// Wrapper to provide better-sqlite3-like API
class DatabaseWrapper {
  private db: SqlJsDatabase;
  private dbPath: string;
  private isDirty: boolean = false;

  constructor(database: SqlJsDatabase, path: string) {
    this.db = database;
    this.dbPath = path;
  }

  prepare(sql: string) {
    const self = this;
    return {
      run(...params: unknown[]) {
        self.db.run(sql, params as (string | number | null)[]);
        self.isDirty = true;
        self.saveIfNeeded();
        return this;
      },
      get(...params: unknown[]) {
        const stmt = self.db.prepare(sql);
        stmt.bind(params as (string | number | null)[]);
        if (stmt.step()) {
          const result = stmt.getAsObject();
          stmt.free();
          return result;
        }
        stmt.free();
        return undefined;
      },
      all(...params: unknown[]) {
        const results: Record<string, unknown>[] = [];
        const stmt = self.db.prepare(sql);
        stmt.bind(params as (string | number | null)[]);
        while (stmt.step()) {
          results.push(stmt.getAsObject() as Record<string, unknown>);
        }
        stmt.free();
        return results;
      },
    };
  }

  exec(sql: string) {
    this.db.exec(sql);
    this.isDirty = true;
    this.saveIfNeeded();
  }

  pragma(pragma: string) {
    this.db.exec(`PRAGMA ${pragma}`);
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      // sql.js doesn't support nested transactions well, so we just run the function
      // The db.exec('BEGIN') causes issues, so we skip it for sql.js
      try {
        const result = fn();
        this.isDirty = true;
        this.saveIfNeeded();
        return result;
      } catch (error) {
        throw error;
      }
    };
  }

  private saveIfNeeded() {
    if (this.isDirty) {
      this.save();
      this.isDirty = false;
    }
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    writeFileSync(this.dbPath, buffer);
  }

  close() {
    if (this.isDirty) {
      this.save();
    }
    this.db.close();
  }
}

export async function initDatabaseAsync(): Promise<DatabaseWrapper> {
  dbPath = getDbPath();
  const dbDir = dirname(dbPath);

  // Create directory if it doesn't exist
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  console.log(`📂 Database location: ${dbPath}`);

  // Initialize sql.js
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Database loaded from disk');
  } else {
    db = new SQL.Database();
    console.log('🆕 New database created');
  }

  const wrapper = new DatabaseWrapper(db, dbPath);

  // Enable foreign keys
  wrapper.pragma('foreign_keys = ON');

  // Initialize schema if needed
  initSchema(wrapper);

  // Set up auto-save interval (every 5 seconds if dirty)
  saveInterval = setInterval(() => {
    if (db) {
      wrapper.save();
    }
  }, 5000);

  // Save on process exit
  process.on('beforeExit', () => {
    if (db) {
      wrapper.save();
    }
  });

  return wrapper;
}

// Synchronous version for compatibility (uses cached instance)
export function initDatabase(): DatabaseWrapper {
  throw new Error('Use initDatabaseAsync() instead');
}

function initSchema(db: DatabaseWrapper) {
  // Check if schema is already initialized
  const result = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='schema_version'
  `).get();

  if (result) {
    console.log('✅ Database schema already initialized');
    return;
  }

  console.log('🔧 Initializing database schema...');

  // Read and execute schema SQL
  const schemaPath = join(__dirname, 'schema.sql');
  const schemaSql = readFileSync(schemaPath, 'utf-8');

  db.exec(schemaSql);

  console.log('✅ Database schema initialized successfully');
}

export type { DatabaseWrapper };
