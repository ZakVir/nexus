// Session store using bun:sqlite (built into Bun — no native addon, compiles into standalone binaries)

import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { Database } from 'bun:sqlite';
import type { Session, Message, MessagePart } from './types.js';

const DB_PATH = join(homedir(), '.nexus', 'sessions', 'nexus.db');

export class SessionStore {
  private db: Database;

  constructor(options: { dbPath?: string } = {}) {
    const dbPath = options.dbPath ?? DB_PATH;

    // Ensure directory exists
    const dir = join(dbPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        model_config TEXT NOT NULL, -- JSON string
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        directory TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        agent TEXT,
        model_id TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS message_parts (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        meta TEXT, -- JSON string
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_message_parts_message ON message_parts(message_id);
    `);
  }

  // Session methods
  createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Session {
    const now = Date.now();
    const id = `sess_${Math.random().toString(36).slice(2, 11)}`;

    const sessionToInsert: Session = {
      ...session,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO sessions (id, title, mode, model_config, created_at, updated_at, directory)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        sessionToInsert.id,
        sessionToInsert.title,
        sessionToInsert.mode,
        JSON.stringify(sessionToInsert.modelConfig),
        sessionToInsert.createdAt,
        sessionToInsert.updatedAt,
        sessionToInsert.directory
      );

    return sessionToInsert;
  }

  getSession(id: string): Session | undefined {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      title: row.title,
      mode: row.mode as 'single' | 'multi' | 'conversational',
      modelConfig: JSON.parse(row.model_config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      directory: row.directory,
    };
  }

  updateSession(session: Session): void {
    const now = Date.now();
    this.db
      .prepare(
        `UPDATE sessions
         SET title = ?, mode = ?, model_config = ?, updated_at = ?, directory = ?
         WHERE id = ?`
      )
      .run(
        session.title,
        session.mode,
        JSON.stringify(session.modelConfig),
        now,
        session.directory,
        session.id
      );
  }

  deleteSession(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  listSessions(): Session[] {
    const rows = this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as any[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      mode: row.mode,
      modelConfig: JSON.parse(row.model_config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      directory: row.directory,
    }));
  }

  // Message methods
  createMessage(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Message {
    const now = Date.now();
    const id = `msg_${Math.random().toString(36).slice(2, 11)}`;

    const messageToInsert: Message = {
      ...message,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO messages (id, session_id, role, agent, model_id, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        messageToInsert.id,
        messageToInsert.sessionId,
        messageToInsert.role,
        messageToInsert.agent ?? null,
        messageToInsert.modelId ?? null,
        messageToInsert.content,
        messageToInsert.createdAt,
        messageToInsert.updatedAt
      );

    return messageToInsert;
  }

  getMessage(id: string): Message | undefined {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as 'user' | 'assistant' | 'system',
      agent: row.agent,
      modelId: row.model_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getMessagesBySession(sessionId: string): Message[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as any[];
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role as 'user' | 'assistant' | 'system',
      agent: row.agent,
      modelId: row.model_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  updateMessage(message: Message): void {
    const now = Date.now();
    this.db
      .prepare(
        `UPDATE messages
         SET role = ?, agent = ?, model_id = ?, content = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        message.role,
        message.agent ?? null,
        message.modelId ?? null,
        message.content,
        now,
        message.id
      );
  }

  deleteMessage(id: string): void {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }

  // Message part methods
  createMessagePart(part: Omit<MessagePart, 'id'>): MessagePart {
    const id = `part_${Math.random().toString(36).slice(2, 11)}`;
    const partToInsert: MessagePart = { ...part, id };

    this.db
      .prepare(
        `INSERT INTO message_parts (id, message_id, type, content, meta)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        partToInsert.id,
        partToInsert.messageId,
        partToInsert.type,
        partToInsert.content,
        partToInsert.meta ? JSON.stringify(partToInsert.meta) : null
      );

    return partToInsert;
  }

  getMessagePartsByMessage(messageId: string): MessagePart[] {
    const rows = this.db
      .prepare('SELECT * FROM message_parts WHERE message_id = ? ORDER BY id ASC')
      .all(messageId) as any[];
    return rows.map((row) => ({
      id: row.id,
      messageId: row.message_id,
      type: row.type,
      content: row.content,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
    }));
  }

  // Utility methods
  close(): void {
    this.db.close();
  }
}
