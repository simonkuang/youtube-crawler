import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import CryptoJS from 'crypto-js';
import type { AuthSession, AppSettings } from '../types';

export class DatabaseService {
  private db: Database.Database;
  private encryptionKey: string;

  constructor() {
    const dbPath = process.env.DATABASE_PATH || './data/youtube-scrawler.db';
    const dbDir = path.dirname(dbPath);

    // 确保数据目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.encryptionKey = process.env.SESSION_SECRET || 'default_secret_key_please_change';
    this.initialize();
  }

  private initialize() {
    // 创建设置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建会话表（加密存储）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        encrypted_data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);

    // 创建视频缓存表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS video_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      )
    `);
  }

  // 加密数据
  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  // 解密数据
  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // 保存设置
  saveSettings(settings: AppSettings): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    Object.entries(settings).forEach(([key, value]) => {
      stmt.run(key, JSON.stringify(value), Date.now());
    });
  }

  // 获取设置
  getSettings(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;

    const settings: any = {
      youtubeApiKey: process.env.YOUTUBE_API_KEY || undefined,
      useProxy: false,
      proxyList: [],
      minRequestDelay: parseInt(process.env.MIN_REQUEST_DELAY || '1000'),
      maxRequestDelay: parseInt(process.env.MAX_REQUEST_DELAY || '3000'),
      headless: process.env.HEADLESS !== 'false',
    };

    rows.forEach((row) => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (error) {
        console.error(`Failed to parse setting ${row.key}:`, error);
      }
    });

    // 环境变量优先级���高（API密钥不存储在数据库）
    if (process.env.YOUTUBE_API_KEY) {
      settings.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    }

    return settings;
  }

  // 保存认证会话（加密）
  saveAuthSession(session: AuthSession): void {
    const encrypted = this.encrypt(JSON.stringify(session));

    // 删除旧会话
    this.db.prepare('DELETE FROM auth_sessions').run();

    // 保存新会话
    this.db
      .prepare(`
      INSERT INTO auth_sessions (encrypted_data, created_at, expires_at)
      VALUES (?, ?, ?)
    `)
      .run(encrypted, Date.now(), session.expiresAt);
  }

  // 获取认证会话
  getAuthSession(): AuthSession | null {
    const row = this.db
      .prepare(
        `
      SELECT encrypted_data, expires_at
      FROM auth_sessions
      WHERE expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `
      )
      .get(Date.now()) as { encrypted_data: string; expires_at: number } | undefined;

    if (!row) {
      return null;
    }

    try {
      const decrypted = this.decrypt(row.encrypted_data);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt auth session:', error);
      return null;
    }
  }

  // 删除认证会话
  deleteAuthSession(): void {
    this.db.prepare('DELETE FROM auth_sessions').run();
  }

  // 清理过期会话
  cleanupExpiredSessions(): void {
    this.db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(Date.now());
  }

  close(): void {
    this.db.close();
  }
}

export const db = new DatabaseService();
