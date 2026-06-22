// Session store using better-sqlite3

import { join } from 'path';
import { homedir } from 'os';
import { Database } from 'better-sqlite3';
import type { Session, Message, MessagePart } from './types.js';

const DB_PATH = join(homedir(), '.nexus', 'sessions', 'nexus.db');

export class SessionStore {
  private db: Database;

  constructor(options: { dbPath?: string } = {}) {
    const dbPath = options.dbPath ?? DB_PATH;
    
    // Ensure directory exists
    const fs = require('fs');
    const dir = join(dbPath, '..');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
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
    const id = `sess_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionToInsert: Session = {
      ...session,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.db.prepare(`
      INSERT INTO sessions (id, title, mode, model_config, created_at, updated_at, directory)
      VALUES (@id, @title, @mode, @model_config, @createdAt, @updatedAt, @directory)
    `).run({
      id: sessionToInsert.id,
      title: sessionToInsert.title,
      mode: sessionToInsert.mode,
      model_config: JSON.stringify(sessionToInsert.modelConfig),
      createdAt: sessionToInsert.createdAt,
      updatedAt: sessionToInsert.updatedAt,
      directory: sessionToInsert.directory,
    });
    
    return sessionToInsert;
  }

  getSession(id: string): Session | undefined {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
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
    const toUpdate = {
      ...session,
      updatedAt: now,
    };
    
    this.db.prepare(`
      UPDATE sessions 
      SET title = @title, mode = @mode, model_config = @model_config, updated_at = @updatedAt, directory = @directory
      WHERE id = @id
    ).run({
      id: toUpdate.id,
      title: toUpdate.title,
      mode: toUpdate.mode,
      model_config: JSON.stringify(toUpdate.modelConfig),
      updatedAt: toUpdate.updatedAt,
      directory: toUpdate.directory,
    });
  }

  deleteSession(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  listSessions(): Session[] {
    return this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as Session[];
  }

  // Message methods
  createMessage(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Message {
    const now = Date.now();
    const id = `msg_${Math.random().toString(36).substr(2, 9)}`;
    
    const messageToInsert: Message = {
      ...message,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.db.prepare(`
      INSERT INTO messages (id, session_id, role, agent, model_id, content, created_at, updated_at)
      VALUES (@id, @session_id, @role, @agent, @model_id, @content, @createdAt, @updatedAt)
    `).run({
      id: messageToInsert.id,
      session_id: messageToInsert.sessionId,
      role: messageToInsert.role,
      agent: messageToInsert.agent ?? null,
      model_id: messageToInsert.modelId ?? null,
      content: messageToInsert.content,
      createdAt: messageToInsert.createdAt,
      updatedAt: messageToInsert.updatedAt,
    });
    
    return messageToInsert;
  }

  getMessage(id: string): Message | undefined {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
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
    return this.db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as Message[];
  }

  updateMessage(message: Message): void {
    const now = Date.now();
    const toUpdate = {
      ...message,
      updatedAt: now,
    };
    
    this.db.prepare(`
      UPDATE messages 
      SET role = @role, agent = @agent, model_id = @model_id, content = @content, updated_at = @updatedAt
      WHERE id = @id
    ).run({
      id: toUpdate.id,
      role: toUpdate.role,
      agent: toUpdate.agent ?? null,
      model_id: toUpdate.modelId ?? null,
      content: toUpdate.content,
      updatedAt: toUpdate.updatedAt,
    });
  }

  deleteMessage(id: string): void {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }

  // Message part methods
  createMessagePart(part: Omit<MessagePart, 'id'>): MessagePart {
    const id = `part_${Math.random().toString(36).substr(2, 9)}`;
    const partToInsert: MessagePart = { ...part, id };
    
    this.db.prepare(`
      INSERT INTO message_parts (id, message_id, type, content, meta)
      VALUES (@id, @message_id, @type, @content, @meta)
    `).run({
      id: partToInsert.id,
      message_id: partToInsert.messageId,
      type: partToInsert.type,
      content: partToInsert.content,
      meta: partToInsert.meta ? JSON.stringify(partToInsert.meta) : null,
    });
    
    return partToInsert;
  }

  getMessagePartsByMessage(messageId: string): MessagePart[] {
    return this.db.prepare('SELECT * FROM message_parts WHERE message_id = ? ORDER BY id ASC').all(messageId) as MessagePart[];
  }

  // Utility methods
  close(): void {
    this.db.close();
  }
}

export const sessionStore = new SessionStore();