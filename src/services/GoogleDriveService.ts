/**
 * GoogleDriveService.ts
 * Implements real OAuth2 authentication and Google Drive API interactions
 * using the Google Identity Services (GSI) library.
 */

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '837262843338-kdbjh344gj84q75o27u14kn86pdlidbm.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export class GoogleDriveService {
  private static accessToken: string | null = null;
  private static tokenClient: any = null;

  static isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Initializes the Token Client and initiates the OAuth2 flow.
   */
  static async authenticate(): Promise<GoogleUser> {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        return reject(new Error('Google Identity Services not loaded. Check index.html.'));
      }

      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error !== undefined) {
            return reject(response);
          }
          this.accessToken = response.access_token;
          
          try {
            const userInfo = await this.getUserInfo();
            resolve(userInfo);
          } catch (error) {
            reject(error);
          }
        },
      });

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Fetches user profile info from Google.
   */
  private static async getUserInfo(): Promise<GoogleUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    
    if (!response.ok) throw new Error('Failed to fetch user info');
    
    const data = await response.json();
    return {
      name: data.name,
      email: data.email,
      picture: data.picture,
    };
  }

  /**
   * Uploads or updates a file in the App Data folder.
   */
  static async uploadFile(filename: string, content: string): Promise<boolean> {
    if (!this.accessToken) throw new Error('Not authenticated');

    // 1. Search for existing file
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and 'appDataFolder' in parents&spaces=appDataFolder`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const { files } = await searchRes.json();
    const fileId = files.length > 0 ? files[0].id : null;

    // 2. Upload/Update
    const metadata = {
      name: filename,
      parents: fileId ? undefined : ['appDataFolder'],
    };

    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelimiter;

    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const method = fileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Drive Upload Failed: ${errorData.error?.message || response.statusText}`);
    }

    return true;
  }

  /**
   * Downloads a file from the App Data folder.
   */
  static async downloadFile(filename: string): Promise<string | null> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and 'appDataFolder' in parents&spaces=appDataFolder`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const { files } = await searchRes.json();
    if (files.length === 0) return null;

    const fileId = files[0].id;
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    if (!downloadRes.ok) {
      const errorData = await downloadRes.json().catch(() => ({}));
      throw new Error(`Drive Download Failed: ${errorData.error?.message || downloadRes.statusText}`);
    }
    return await downloadRes.text();
  }

  /**
   * Downloads the security settings file (security.json).
   */
  static async getSecuritySettings(): Promise<{ passwordHash: string; salt: string } | null> {
    if (!this.accessToken) return null;

    try {
      const content = await this.downloadFile('security.json');
      return content ? JSON.parse(content) : null;
    } catch (e) {
      console.error('Failed to get security settings:', e);
      return null;
    }
  }

  /**
   * Uploads the security settings file.
   */
  static async saveSecuritySettings(settings: { passwordHash: string; salt: string }): Promise<boolean> {
    if (!this.accessToken) throw new Error('Not authenticated');
    return this.uploadFile('security.json', JSON.stringify(settings));
  }

  static logout() {
    if (this.accessToken) {
      window.google?.accounts.oauth2.revoke(this.accessToken);
    }
    this.accessToken = null;
  }
}
