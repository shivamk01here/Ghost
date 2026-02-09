import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { useSync } from '../hooks/useSync';

interface SecurityContextType {
  isLocked: boolean;
  isSetupRequired: boolean;
  unlock: (password: string) => Promise<boolean>;
  setupPassword: (password: string) => Promise<void>;
  lock: () => void;
  isLoading: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 4 * 60 * 1000; // 4 minutes

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [passwordStats, setPasswordStats] = useState<{ passwordHash: string; salt: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const { isLoggedIn } = useSync();

  // 1. Initial Load
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
      setIsLoading(false);
    };
    init();
  }, []);

  // 2. Cloud Sync
  useEffect(() => {
    const syncSecurity = async () => {
      if (isLoggedIn && GoogleDriveService.isAuthenticated()) {
        try {
          const cloudSettings = await GoogleDriveService.getSecuritySettings();
          if (cloudSettings) {
             const stored = localStorage.getItem('security_settings');
             // Compare cloud vs local
             if (!stored || JSON.stringify(JSON.parse(stored)) !== JSON.stringify(cloudSettings)) {
                localStorage.setItem('security_settings', JSON.stringify(cloudSettings));
                setPasswordStats(cloudSettings);
                setIsLocked(true); // Lock on new password sync
                setIsSetupRequired(false); 
             }
          } else {
             // No cloud password. If no local either, setup required.
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
  }, [isLoggedIn, passwordStats]); // Depend on passwordStats to know if we have local

  // 3. Inactivity
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
      await GoogleDriveService.saveSecuritySettings(settings); // settings matches interface now
    }
  };

  
  const lock = () => setIsLocked(true);

  // Helper Utils
  const generateSalt = () => {
    return btoa(String.fromCharCode(...window.crypto.getRandomValues(new Uint8Array(16))));
  };

  const hashPassword = async (password: string, salt: string) => {
    // We can reuse EncryptionService logic or use simple SHA-256 since it's just a PIN/password
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  };

  return (
    <SecurityContext.Provider value={{ isLocked, isSetupRequired, unlock, setupPassword, lock, isLoading }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within SecurityProvider');
  return context;
};
