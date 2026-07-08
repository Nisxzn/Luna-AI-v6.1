import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  Memory,
  MemoryFilter,
  MemoryCategory,
  MemorySource,
  MemoryImportance,
} from '@luna-ai/types';

export class MemoryStore {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'memory.db');
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        importance TEXT NOT NULL,
        tags TEXT NOT NULL,
        projectId TEXT,
        workspaceId TEXT,
        archived INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_category ON memories(category);
      CREATE INDEX IF NOT EXISTS idx_source ON memories(source);
      CREATE INDEX IF NOT EXISTS idx_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_projectId ON memories(projectId);
      CREATE INDEX IF NOT EXISTS idx_workspaceId ON memories(workspaceId);
      CREATE INDEX IF NOT EXISTS idx_createdAt ON memories(createdAt);
      CREATE INDEX IF NOT EXISTS idx_archived ON memories(archived);
    `);
  }

  save(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Memory {
    const id = uuidv4();
    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(memory.tags);

    const stmt = this.db.prepare(`
      INSERT INTO memories (
        id, title, content, category, source, createdAt, updatedAt,
        importance, tags, projectId, workspaceId, archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      memory.title,
      memory.content,
      memory.category,
      memory.source,
      now,
      now,
      memory.importance,
      tagsJson,
      memory.projectId || null,
      memory.workspaceId || null,
      memory.archived ? 1 : 0
    );

    return this.getById(id)!;
  }

  getById(id: string): Memory | null {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.rowToMemory(row);
  }

  update(id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>): Memory | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    const tagsJson = JSON.stringify(updated.tags);

    const stmt = this.db.prepare(`
      UPDATE memories
      SET title = ?, content = ?, category = ?, source = ?,
          updatedAt = ?, importance = ?, tags = ?, projectId = ?,
          workspaceId = ?, archived = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.title,
      updated.content,
      updated.category,
      updated.source,
      updated.updatedAt.toISOString(),
      updated.importance,
      tagsJson,
      updated.projectId || null,
      updated.workspaceId || null,
      updated.archived ? 1 : 0,
      id
    );

    return this.getById(id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  archive(id: string): boolean {
    const stmt = this.db.prepare('UPDATE memories SET archived = 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  unarchive(id: string): boolean {
    const stmt = this.db.prepare('UPDATE memories SET archived = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  find(filter: MemoryFilter = {}, limit = 100, offset = 0): Memory[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter.source) {
      conditions.push('source = ?');
      params.push(filter.source);
    }
    if (filter.importance) {
      conditions.push('importance = ?');
      params.push(filter.importance);
    }
    if (filter.projectId) {
      conditions.push('projectId = ?');
      params.push(filter.projectId);
    }
    if (filter.workspaceId) {
      conditions.push('workspaceId = ?');
      params.push(filter.workspaceId);
    }
    if (filter.archived !== undefined) {
      conditions.push('archived = ?');
      params.push(filter.archived ? 1 : 0);
    }
    if (filter.startDate) {
      conditions.push('createdAt >= ?');
      params.push(filter.startDate.toISOString());
    }
    if (filter.endDate) {
      conditions.push('createdAt <= ?');
      params.push(filter.endDate.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT * FROM memories
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params, limit, offset) as any[];

    return rows.map(row => this.rowToMemory(row));
  }

  search(query: string, filter: MemoryFilter = {}, limit = 100): Memory[] {
    const conditions: string[] = ['(title LIKE ? OR content LIKE ?)'];
    const params: any[] = [`%${query}%`, `%${query}%`];

    if (filter.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter.source) {
      conditions.push('source = ?');
      params.push(filter.source);
    }
    if (filter.importance) {
      conditions.push('importance = ?');
      params.push(filter.importance);
    }
    if (filter.projectId) {
      conditions.push('projectId = ?');
      params.push(filter.projectId);
    }
    if (filter.workspaceId) {
      conditions.push('workspaceId = ?');
      params.push(filter.workspaceId);
    }
    if (filter.archived !== undefined) {
      conditions.push('archived = ?');
      params.push(filter.archived ? 1 : 0);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const sql = `
      SELECT * FROM memories
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ?
    `;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params, limit) as any[];

    return rows.map(row => this.rowToMemory(row));
  }

  count(filter: MemoryFilter = {}): number {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter.source) {
      conditions.push('source = ?');
      params.push(filter.source);
    }
    if (filter.importance) {
      conditions.push('importance = ?');
      params.push(filter.importance);
    }
    if (filter.projectId) {
      conditions.push('projectId = ?');
      params.push(filter.projectId);
    }
    if (filter.workspaceId) {
      conditions.push('workspaceId = ?');
      params.push(filter.workspaceId);
    }
    if (filter.archived !== undefined) {
      conditions.push('archived = ?');
      params.push(filter.archived ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) as count FROM memories ${whereClause}`;

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as any;

    return result.count;
  }

  getAll(limit = 100, offset = 0): Memory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset) as any[];
    return rows.map(row => this.rowToMemory(row));
  }

  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category as MemoryCategory,
      source: row.source as MemorySource,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      importance: row.importance as MemoryImportance,
      tags: JSON.parse(row.tags),
      projectId: row.projectId || undefined,
      workspaceId: row.workspaceId || undefined,
      archived: row.archived === 1,
    };
  }

  close(): void {
    this.db.close();
  }
}
