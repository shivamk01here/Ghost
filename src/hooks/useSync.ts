import { useState, useCallback } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { exportData, importData, db } from '../db';
import { EncryptionService } from '../services/EncryptionService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export const useSync = () => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('google_token'));
  const [user, setUser] = useState<{name: string, email: string} | null>(() => {
    const saved = localStorage.getItem('google_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const restore = useCallback(async () => {
    try {
      setStatus('syncing');
      
      if (!GoogleDriveService.isAuthenticated()) {
        await GoogleDriveService.authenticate();
        setIsLoggedIn(true);
      }

      // 1. Download
      const encryptedData = await GoogleDriveService.downloadFile('backup.dayzero');
      if (!encryptedData) {
        throw new Error('No backup found in cloud');
      }

      // 2. Decrypt
      const passphrase = localStorage.getItem('vault_passphrase') || 'default_passphrase';
      const jsonData = await EncryptionService.decrypt(encryptedData, passphrase);
      const data = JSON.parse(jsonData);

      // 3. Import
      await importData(data);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'Restore failed');
      return false;
    }
  }, []);

  const sync = useCallback(async () => {
    try {
      setStatus('syncing');
      
      // 1. Authenticate if needed
      let currentUser = user;
      let justLoggedIn = false;
      if (!isLoggedIn || !GoogleDriveService.isAuthenticated()) {
        currentUser = await GoogleDriveService.authenticate();
        localStorage.setItem('google_token', 'true'); 
        localStorage.setItem('google_user', JSON.stringify(currentUser));
        setIsLoggedIn(true);
        setUser(currentUser);
        justLoggedIn = true;
      }

      // CRITICAL: On first login, check if we should RESTORE instead of UPLOAD
      // Only if local DB is empty
      if (justLoggedIn) {
         const count = await db.entries.count();
         if (count === 0) {
            // Attempt auto-restore
            const restored = await restore();
            if (restored) return; // Exit if restored (status is success)
            // If restore failed (no backup), proceed to upload? 
            // Better to stop and let user decide, or create empty backup?
            // If no backup exists, creating one is fine.
         }
      }

      // 2. Export local data
      const data = await exportData();
      const jsonData = JSON.stringify(data);

      // 3. Encrypt data
      const passphrase = localStorage.getItem('vault_passphrase') || 'default_passphrase';
      const encryptedData = await EncryptionService.encrypt(jsonData, passphrase);

      // 4. Upload to Drive
      const success = await GoogleDriveService.uploadFile('backup.dayzero', encryptedData);

      if (success) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'Unknown sync error');
      
      if ((error as any).error === 'invalid_token' || (error as any).error === 'auth_error') {
        logout();
      }
    }
  }, [isLoggedIn, user, restore]);

  const logout = useCallback(() => {
    GoogleDriveService.logout();
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_user');
    setIsLoggedIn(false);
    setUser(null);
    setStatus('idle');
  }, []);

  return { status, isLoggedIn, user, errorMsg, sync, restore, logout, setErrorMsg };
};
