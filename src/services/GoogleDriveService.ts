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

const TOKEN_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';
const USER_KEY = 'google_user';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export class GoogleDriveService {
  private static tokenClient: any = null;

  static isAuthenticated(): boolean {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    const expiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!accessToken || !expiresAt) return false;
    
    return parseInt(expiresAt, 10) > Date.now();
  }

  static isLoggedIn(): boolean {
    return !!localStorage.getItem(USER_KEY) && !!localStorage.getItem(TOKEN_KEY);
  }

  static getStoredUser(): GoogleUser | null {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  private static getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Initialize the token client once
   */
  private static initTokenClient(): void {
    if (this.tokenClient) return;
    
    if (!window.google) return;
    
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {}, // Will be set per-request
    });
  }

  /**
   * Get a new access token - tries silent first, then shows consent if needed
   */
  static async authenticate(options?: { forceConsent?: boolean }): Promise<GoogleUser> {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        return reject(new Error('Google Identity Services not loaded.'));
      }

      this.initTokenClient();

      const handleResponse = async (response: any) => {
        if (response.error !== undefined) {
          // Silent auth failed - user needs to interact
          if (response.error === 'user_interaction_required' || response.error === 'consent_required') {
            // Try again with consent prompt
            this.tokenClient.callback = async (consentResponse: any) => {
              if (consentResponse.error !== undefined) {
                reject(consentResponse);
                return;
              }
              
              await this.storeToken(consentResponse);
              try {
                const userInfo = await this.getUserInfo();
                localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
                resolve(userInfo);
              } catch (error) {
                reject(error);
              }
            };
            
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
            return;
          }
          
          reject(response);
          return;
        }

        await this.storeToken(response);
        try {
          const userInfo = await this.getUserInfo();
          localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
          resolve(userInfo);
        } catch (error) {
          reject(error);
        }
      };

      this.tokenClient.callback = handleResponse;

      // Force consent if explicitly requested, otherwise try silent first
      const prompt = options?.forceConsent ? 'consent' : '';
      this.tokenClient.requestAccessToken({ prompt });
    });
  }

  private static async storeToken(response: any): Promise<void> {
    const expiresAt = Date.now() + ((response.expires_in || 3600) * 1000);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  }

  /**
   * Ensure we have a valid access token - refresh silently if needed
   */
  static async ensureAuthenticated(): Promise<boolean> {
    // Already have valid token
    if (this.isAuthenticated()) {
      return true;
    }

    // Have stored credentials - try silent refresh
    if (this.isLoggedIn()) {
      try {
        await this.authenticate({ forceConsent: false });
        return true;
      } catch (error) {
        console.log('Silent auth failed, will need user interaction');
        return false;
      }
    }

    return false;
  }

  /**
   * Fetches user profile info from Google.
   */
  private static async getUserInfo(): Promise<GoogleUser> {
    const accessToken = this.getAccessToken();
    if (!accessToken) throw new Error('No access token available');

    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
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
    const accessToken = this.getAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and 'appDataFolder' in parents&spaces=appDataFolder`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const { files } = await searchRes.json();
    const fileId = files.length > 0 ? files[0].id : null;

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
        Authorization: `Bearer ${accessToken}`,
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
    const accessToken = this.getAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and 'appDataFolder' in parents&spaces=appDataFolder`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const { files } = await searchRes.json();
    if (files.length === 0) return null;

    const fileId = files[0].id;
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
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
    if (!this.isAuthenticated()) return null;

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
    if (!this.isAuthenticated()) throw new Error('Not authenticated');
    return this.uploadFile('security.json', JSON.stringify(settings));
  }

  static logout() {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    if (accessToken && window.google) {
      try {
        window.google.accounts.oauth2.revoke(accessToken);
      } catch (e) {
        // Ignore revoke errors
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenClient = null;
  }
}
