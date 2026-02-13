import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { useSync } from '../hooks/useSync';
import { db } from '../db';

interface SecurityContextType {
  isLocked: boolean;
  isSetupRequired: boolean;
  unlock: (password: string) => Promise<boolean>;
  setupPassword: (password: string) => Promise<void>;
  lock: () => void;
  isLoading: boolean;
  isGhostMode: boolean;
  isGhostSetupRequired: boolean;
  setupGhostPassphrase: (passphrase: string) => Promise<void>;
  unlockGhostMode: (passphrase: string) => Promise<boolean>;
  lockGhostMode: () => void;
  convertVisibleEntriesToGhost: () => Promise<void>;
  convertGhostEntriesToVisible: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 4 * 60 * 1000;
const GHOST_INACTIVITY_TIMEOUT = 7 * 60 * 1000;

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [passwordStats, setPasswordStats] = useState<{ passwordHash: string; salt: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const { isLoggedIn } = useSync();

  const [isGhostMode, setIsGhostMode] = useState(false);
  const [ghostPassphraseHash, setGhostPassphraseHash] = useState<string | null>(null);
  const [ghostSalt, setGhostSalt] = useState<string | null>(null);
  const ghostLastActivityRef = useRef(Date.now());

  const generateSalt = useCallback(() => {
    return btoa(String.fromCharCode(...window.crypto.getRandomValues(new Uint8Array(16))));
  }, []);

  const hashPassword = useCallback(async (password: string, salt: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }, []);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('security_settings');
      if (stored) {
        setPasswordStats(JSON.parse(stored));
        setIsLocked(true);
        setIsSetupRequired(false);
      } else {
        setIsLocked(false);
        setIsSetupRequired(false);
      }

      const ghostStored = localStorage.getItem('ghost_settings');
      if (ghostStored) {
        const ghostData = JSON.parse(ghostStored);
        setGhostPassphraseHash(ghostData.passphraseHash);
        setGhostSalt(ghostData.salt);
        setIsGhostMode(false);
      } else {
        setIsGhostMode(false);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const syncSecurity = async () => {
      if (isLoggedIn && GoogleDriveService.isAuthenticated()) {
        try {
          const cloudSettings = await GoogleDriveService.getSecuritySettings();
          if (cloudSettings) {
            const stored = localStorage.getItem('security_settings');
            if (!stored || JSON.stringify(JSON.parse(stored)) !== JSON.stringify(cloudSettings)) {
              localStorage.setItem('security_settings', JSON.stringify(cloudSettings));
              setPasswordStats(cloudSettings);
              setIsLocked(true);
              setIsSetupRequired(false);
            }
          } else {
            if (!passwordStats) {
              setIsSetupRequired(true);
            }
          }
        } catch (e) {
          console.error('Security sync error', e);
        }
      }
    };
    syncSecurity();
  }, [isLoggedIn, passwordStats]);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, updateActivity));

    const interval = setInterval(() => {
      if (passwordStats && !isLocked) {
        if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) {
          setIsLocked(true);
        }
      }
    }, 5000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [isLocked, passwordStats]);

  useEffect(() => {
    const updateGhostActivity = () => {
      ghostLastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, updateGhostActivity));

    const interval = setInterval(() => {
      if (ghostPassphraseHash && isGhostMode) {
        if (Date.now() - ghostLastActivityRef.current > GHOST_INACTIVITY_TIMEOUT) {
          setIsGhostMode(false);
        }
      }
    }, 5000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateGhostActivity));
      clearInterval(interval);
    };
  }, [isGhostMode, ghostPassphraseHash]);

  const unlock = async (password: string): Promise<boolean> => {
    if (!passwordStats) return true;
    
    const hash = await hashPassword(password, passwordStats.salt);
    if (hash === passwordStats.passwordHash) {
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      return true;
    }
    return false;
  };

  const setupPassword = async (password: string) => {
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const settings = { passwordHash: hash, salt };
    
    localStorage.setItem('security_settings', JSON.stringify(settings));
    setPasswordStats(settings);
    setIsLocked(false);
    setIsSetupRequired(false);
    
    if (isLoggedIn && GoogleDriveService.isAuthenticated()) {
      await GoogleDriveService.saveSecuritySettings(settings);
    }
  };

  const lock = () => setIsLocked(true);

  const setupGhostPassphrase = async (passphrase: string) => {
    const salt = generateSalt();
    const hash = await hashPassword(passphrase, salt);
    
    const ghostSettings = { passphraseHash: hash, salt };
    localStorage.setItem('ghost_settings', JSON.stringify(ghostSettings));
    setGhostPassphraseHash(hash);
    setGhostSalt(salt);
    setIsGhostMode(true);
  };

  const unlockGhostMode = async (passphrase: string): Promise<boolean> => {
    if (!ghostPassphraseHash || !ghostSalt) return false;
    
    const hash = await hashPassword(passphrase, ghostSalt);
    if (hash === ghostPassphraseHash) {
      setIsGhostMode(true);
      ghostLastActivityRef.current = Date.now();
      return true;
    }
    return false;
  };

  const lockGhostMode = () => setIsGhostMode(false);

  const convertVisibleEntriesToGhost = useCallback(async () => {
    try {
      const allEntries = await db.entries.where('isHidden').equals(0).toArray();
      for (const entry of allEntries) {
        await db.entries.update(entry.id, { isHidden: true });
      }
    } catch (e) {
      console.error('Failed to convert entries to ghost:', e);
    }
  }, []);

  const convertGhostEntriesToVisible = useCallback(async () => {
    try {
      const hiddenEntries = await db.entries.where('isHidden').equals(1).toArray();
      for (const entry of hiddenEntries) {
        await db.entries.update(entry.id, { isHidden: false });
      }
    } catch (e) {
      console.error('Failed to convert ghost entries to visible:', e);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (isGhostMode) {
        await convertVisibleEntriesToGhost();
        localStorage.setItem('ghost_auto_hide', 'true');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGhostMode, convertVisibleEntriesToGhost]);

  useEffect(() => {
    const autoHide = localStorage.getItem('ghost_auto_hide');
    if (autoHide === 'true' && ghostPassphraseHash) {
      setIsGhostMode(false);
      localStorage.removeItem('ghost_auto_hide');
    }
  }, [ghostPassphraseHash]);

  return (
    <SecurityContext.Provider value={{ 
      isLocked, 
      isSetupRequired, 
      unlock, 
      setupPassword, 
      lock, 
      isLoading,
      isGhostMode,
      isGhostSetupRequired: !ghostPassphraseHash,
      setupGhostPassphrase,
      unlockGhostMode,
      lockGhostMode,
      convertVisibleEntriesToGhost,
      convertGhostEntriesToVisible
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within SecurityProvider');
  return context;
};
