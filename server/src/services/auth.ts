import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from './database';
import type { AuthSession } from '../types';

export class AuthService {
  private oauth2Client: OAuth2Client;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  constructor() {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = `http://localhost:${process.env.PORT || 3001}/api/auth/callback`;

    if (!clientId || !clientSecret) {
      console.warn('YouTube OAuth未配置，登录功能将不可用');
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // 生成授权URL
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      prompt: 'consent',
    });
  }

  // 处理OAuth回调
  async handleCallback(code: string): Promise<AuthSession> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // 获取用户信息
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      const session: AuthSession = {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: tokens.expiry_date || Date.now() + 3600000,
        email: userInfo.data.email || undefined,
      };

      // 保存到数据库
      db.saveAuthSession(session);

      return session;
    } catch (error: any) {
      console.error('OAuth回调处理失败:', error);
      throw new Error('登录失败: ' + error.message);
    }
  }

  // 获取当前会话
  getSession(): AuthSession | null {
    return db.getAuthSession();
  }

  // 刷新Token
  async refreshAccessToken(refreshToken: string): Promise<AuthSession> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      const session: AuthSession = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresAt: credentials.expiry_date || Date.now() + 3600000,
      };

      db.saveAuthSession(session);
      return session;
    } catch (error: any) {
      console.error('刷新Token失败:', error);
      throw new Error('刷新登录状态失败: ' + error.message);
    }
  }

  // 检查并自动刷新Token
  async ensureValidSession(): Promise<AuthSession | null> {
    const session = this.getSession();

    if (!session) {
      return null;
    }

    // 如果Token即将过期（5分钟内），刷新它
    if (session.expiresAt - Date.now() < 300000) {
      try {
        return await this.refreshAccessToken(session.refreshToken);
      } catch (error) {
        // 刷新失败，删除会话
        db.deleteAuthSession();
        return null;
      }
    }

    return session;
  }

  // 登出
  logout(): void {
    db.deleteAuthSession();
  }

  // 检查是否已登录
  isLoggedIn(): boolean {
    const session = this.getSession();
    if (!session) return false;

    // 检查是否过期
    if (session.expiresAt <= Date.now()) {
      db.deleteAuthSession();
      return false;
    }

    return true;
  }

  // 获取OAuth客户端（用于API调用）
  getOAuth2Client(): OAuth2Client {
    const session = this.getSession();
    if (session) {
      this.oauth2Client.setCredentials({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
    }
    return this.oauth2Client;
  }
}

export const authService = new AuthService();
