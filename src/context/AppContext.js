import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import { AppState, PanResponder, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  loadEntries, saveEntries,
  addEntry as storageAdd,
  updateEntry as storageUpdate,
  deleteEntry as storageDelete,
  loadSettings, saveSettings,
  generateId, formatDateKey,
} from '../utils/storage';
import { isSetupComplete, verifyPasscode, setupPasscodes } from '../utils/security';
import { buildTheme } from '../theme';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function AppProvider({ children }) {
  // auth: 'splash' | 'setup' | 'locked' | 'decoy' | 'real'
  const [authState,    setAuthState]    = useState('splash');
  const [realEntries,  setRealEntries]  = useState({});
  const [decoyEntries, setDecoyEntries] = useState({});
  const [isDark,       setIsDark]       = useState(false);
  const [primaryColor, setPrimaryColorState] = useState('#9B5BC4');
  const [userName,     setUserNameState]     = useState('');
  const [autoPlayMusic, setAutoPlayMusicState] = useState(true);
  const [appIcon,      setAppIconState]      = useState(null);
  const [isSidebarEnabled, setIsSidebarEnabled] = useState(false);
  const [magicCodeActive, setMagicCodeActive] = useState(false);

  const theme = buildTheme(isDark, primaryColor);
  const appState = useRef(AppState.currentState);
  const inactivityTimer = useRef(null);

  // ── Auto-Lock Logic ───────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    // Only lock if we are currently unlocked (real or decoy)
    if (authState === 'real' || authState === 'decoy') {
      inactivityTimer.current = setTimeout(() => {
        lock();
      }, 60000); // 1 minute
    }
  }, [authState]);

  useEffect(() => {
    resetInactivityTimer();
    return () => clearTimeout(inactivityTimer.current);
  }, [authState, resetInactivityTimer]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => { resetInactivityTimer(); return false; },
      onMoveShouldSetPanResponderCapture:  () => { resetInactivityTimer(); return false; },
      onPanResponderTerminationRequest:    () => false,
    })
  ).current;

  // AppState Listener for Auto-lock
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // We no longer lock IMMEDIATELY on background. 
      // The 1-minute PanResponder timer continues running.
      if (nextAppState === 'active') {
        resetInactivityTimer();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [resetInactivityTimer]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const s = await loadSettings();
        setIsDark(s.isDark ?? false);
        setPrimaryColorState(s.primaryColor ?? '#9B5BC4');
        setUserNameState(s.userName ?? '');
        setAutoPlayMusicState(s.autoPlayMusic ?? true);
        setAppIconState(s.appIcon ?? null);

        const setup = await isSetupComplete();
        if (!setup) {
          setTimeout(() => setAuthState('setup'), 2000);
        } else {
          // Fix: Start locked so entries don't leak
          setTimeout(() => setAuthState('locked'), 2000);
        }
      } catch (e) {
        console.error('Init error:', e);
        setTimeout(() => setAuthState('locked'), 2000);
      }
    }
    init();
  }, []);

  // ── Load entries on unlock ────────────────────────────────────────────────
  const loadActiveEntries = useCallback(async () => {
    if (authState === 'real') {
      const e = await loadEntries('real');
      setRealEntries({ ...e });
    } else if (authState === 'decoy') {
      const e = await loadEntries('decoy');
      setDecoyEntries({ ...e });
    }
  }, [authState]);

  useEffect(() => {
    loadActiveEntries();
  }, [loadActiveEntries]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const unlock = useCallback(async (passcode) => {
    // Magic code: enables ghost mode hint
    if (passcode === '8859') {
      const e = await loadEntries('real');
      setRealEntries({ ...e });
      setAuthState('real');
      setIsSidebarEnabled(true);
      setMagicCodeActive(true);
      return true;
    }

    // Try checking against real/decoy passcodes
    const result = await verifyPasscode(passcode);

    if (result === 'real') {
      const e = await loadEntries('real');
      setRealEntries({ ...e });
      setAuthState('real');
      setIsSidebarEnabled(true);
      return true;
    }

    if (result === 'decoy') {
      const e = await loadEntries('decoy');
      setDecoyEntries({ ...e });
      setAuthState('decoy');
      return true;
    }

    // If no registered passcode matched, ANY 4-digit code opens decoy mode
    if (passcode.length === 4 && /^\d{4}$/.test(passcode)) {
      const e = await loadEntries('decoy');
      setDecoyEntries({ ...e });
      setAuthState('decoy');
      return true;
    }

    return false;
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Ghost',
        fallbackLabel: 'Use Passcode',
      });
      if (result.success) {
        const e = await loadEntries('decoy');
        setDecoyEntries({ ...e });
        setAuthState('decoy');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    setAuthState('locked');
    setIsSidebarEnabled(false);
    setMagicCodeActive(false);
    setRealEntries({}); // Clear real entries from memory on lock
  }, []);

  const completeSetup = useCallback(async (decoyCode, realCode) => {
    await setupPasscodes(decoyCode, realCode);
    setAuthState('locked');
  }, []);

  // ── Entries ───────────────────────────────────────────────────────────────
  const activeMode     = authState === 'real' ? 'real' : 'decoy';
  const entries        = authState === 'real' ? realEntries  : decoyEntries;
  const setEntries     = authState === 'real' ? setRealEntries : setDecoyEntries;

  const addEntry = useCallback(async (data, dateKey) => {
    const entry = {
      id:        generateId(),
      title:     data.title  || '',
      body:      data.body      || '',
      blocks:    data.blocks    || [],
      images:    data.images    || [],
      mood:      data.mood      || null,
      music:     data.music     || null,
      voice:     data.voice     || null,
      location:  data.location  || null,
      tags:      data.tags      || [],
      dateKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: data.wordCount || 0,
    };
    // Optimistic UI update
    setEntries(prev => {
      const draft = { ...prev };
      if (!draft[dateKey]) draft[dateKey] = [];
      draft[dateKey] = [entry, ...draft[dateKey].filter(e => e.id !== entry.id)];
      return draft;
    });

    const updated = await storageAdd(entry, dateKey, activeMode);
    setEntries({ ...updated });
    return entry;
  }, [activeMode, setEntries]);

  const updateEntry = useCallback(async (entry) => {
    const updatedDraft = { ...entry, updatedAt: new Date().toISOString() };
    // Optimistic UI update
    setEntries(prev => {
      const draft = { ...prev };
      if (!draft[entry.dateKey]) return draft;
      draft[entry.dateKey] = draft[entry.dateKey].map(e => e.id === entry.id ? updatedDraft : e);
      return draft;
    });

    const updated = await storageUpdate(updatedDraft, entry.dateKey, activeMode);
    setEntries({ ...updated });
  }, [activeMode, setEntries]);

  const deleteEntry = useCallback(async (entryId, dateKey) => {
    // Optimistic UI update
    setEntries(prev => {
      const draft = { ...prev };
      if (!draft[dateKey]) return draft;
      draft[dateKey] = draft[dateKey].filter(e => e.id !== entryId);
      if (draft[dateKey].length === 0) delete draft[dateKey];
      return draft;
    });

    const updated = await storageDelete(entryId, dateKey, activeMode);
    setEntries({ ...updated });
  }, [activeMode, setEntries]);

  // ── Settings ──────────────────────────────────────────────────────────────
  const toggleDark = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    const s = await loadSettings();
    await saveSettings({ ...s, isDark: next });
  }, [isDark]);

  const setPrimaryColor = useCallback(async (color) => {
    setPrimaryColorState(color);
    const s = await loadSettings();
    await saveSettings({ ...s, primaryColor: color });
  }, []);

  const setUserName = useCallback(async (name) => {
    setUserNameState(name);
    const s = await loadSettings();
    await saveSettings({ ...s, userName: name });
  }, []);

  const setAppIcon = useCallback(async (uri) => {
    setAppIconState(uri);
    const s = await loadSettings();
    await saveSettings({ ...s, appIcon: uri });
  }, []);

  const toggleAutoPlayMusic = useCallback(async () => {
    const next = !autoPlayMusic;
    setAutoPlayMusicState(next);
    const s = await loadSettings();
    await saveSettings({ ...s, autoPlayMusic: next });
  }, [autoPlayMusic]);

  const value = {
    authState,
    isReal:   authState === 'real',
    isDecoy:  authState === 'decoy',
    isLocked: authState === 'locked',
    unlock,
    theme,
    entries,
    activeMode,
    isDark,
    toggleDark,
    primaryColor,
    setPrimaryColor,
    userName,
    setUserName,
    appIcon,
    setAppIcon,
    autoPlayMusic,
    toggleAutoPlayMusic,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteEntry,
    unlockWithBiometric,
    lock,
    completeSetup,
    isSidebarEnabled: authState === 'real' || isSidebarEnabled,
    magicCodeActive,
    reloadEntries: loadActiveEntries,
  };

  return (
    <AppContext.Provider value={value}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {children}
      </View>
    </AppContext.Provider>
  );
}