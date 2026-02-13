import { useState, useCallback } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { exportData, importData, db } from '../db';
import { EncryptionService } from '../services/EncryptionService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export const useSync = () => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [isLoggedIn, setIsLoggedIn] = useState(() => GoogleDriveService.isLoggedIn());
  const [user, setUser] = useState<{name: string, email: string} | null>(() => GoogleDriveService.getStoredUser());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const restore = useCallback(async () => {
    try {
      setStatus('syncing');
      
      if (!GoogleDriveService.isAuthenticated()) {
        const userInfo = await GoogleDriveService.authenticate();
        setIsLoggedIn(true);
        setUser(userInfo);
      }

      const encryptedData = await GoogleDriveService.downloadFile('backup.dayzero');
      if (!encryptedData) {
        throw new Error('No backup found in cloud');
      }

      const passphrase = localStorage.getItem('vault_passphrase') || 'default_passphrase';
      const jsonData = await EncryptionService.decrypt(encryptedData, passphrase);
      const data = JSON.parse(jsonData);

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
      setErrorMsg(null);
      
      // Check if we already have a valid token
      let hasValidToken = GoogleDriveService.isAuthenticated();
      let justLoggedIn = false;

      if (!hasValidToken) {
        // Try silent refresh first
        const silentSuccess = await GoogleDriveService.ensureAuthenticated();
        
        if (silentSuccess) {
          // Silent refresh worked - update user state
          const storedUser = GoogleDriveService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
            setIsLoggedIn(true);
          }
        } else {
          // Need user interaction - show consent
          const userInfo = await GoogleDriveService.authenticate();
          setIsLoggedIn(true);
          setUser(userInfo);
          justLoggedIn = true;
        }
      }

      // On first login, check if we should restore instead of upload
      if (justLoggedIn) {
        const count = await db.entries.count();
        if (count === 0) {
          const restored = await restore();
          if (restored) return;
        }
      }

      const data = await exportData();
      const jsonData = JSON.stringify(data);
      const passphrase = localStorage.getItem('vault_passphrase') || 'default_passphrase';
      const encryptedData = await EncryptionService.encrypt(jsonData, passphrase);

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
  }, [restore]);

  const logout = useCallback(() => {
    GoogleDriveService.logout();
    setIsLoggedIn(false);
    setUser(null);
    setStatus('idle');
  }, []);

  return { status, isLoggedIn, user, errorMsg, sync, restore, logout, setErrorMsg };
};
