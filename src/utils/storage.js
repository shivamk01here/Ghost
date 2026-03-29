import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const KEYS = {
  REAL_ENTRIES:  'ghost_real_entries',
  DECOY_ENTRIES: 'ghost_decoy_entries',
  SETTINGS:      'ghost_settings',
};

export async function loadEntries(mode = 'real') {
  try {
    const key = mode === 'real' ? KEYS.REAL_ENTRIES : KEYS.DECOY_ENTRIES;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    
    const parsed = JSON.parse(raw);
    Object.keys(parsed).forEach(date => {
      parsed[date] = parsed[date].map(inflateEntryMedia);
    });
    return parsed;
  } catch (e) {
    console.error('loadEntries:', e);
    return {};
  }
}

async function saveMediaToDocDir(uri) {
  if (!uri) return uri;
  if (!uri.startsWith('file://')) return uri; // Already relative or not a local file
  if (uri.startsWith(FileSystem.documentDirectory)) return uri; // Already in perm storage

  const ext = uri.split('.').pop() || 'tmp';
  const newName = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const newPath = FileSystem.documentDirectory + newName;
  
  try {
    await FileSystem.copyAsync({ from: uri, to: newPath });
    return newPath;
  } catch(e) {
    console.warn('Media copy failed', e);
    return uri;
  }
}

async function processMediaForSave(entry) {
  const e = JSON.parse(JSON.stringify(entry)); // Deep clone
  
  async function processUri(obj) {
    if (obj && obj.uri) {
      const fresh = await saveMediaToDocDir(obj.uri);
      if (fresh && fresh.startsWith(FileSystem.documentDirectory)) {
        obj.uri = fresh.replace(FileSystem.documentDirectory, ''); // Save as relative
      }
    }
  }

  await processUri(e.video);
  await processUri(e.music);
  await processUri(e.voice);
  
  if (e.images) {
    for (const img of e.images) await processUri(img);
  }
  if (e.blocks) {
    for (const b of e.blocks) {
      if (b.type === 'collage' && b.images) {
        for (const img of b.images) await processUri(img);
      }
    }
  }
  return e;
}

function inflateEntryMedia(e) {
  function inflateUri(obj) {
    if (obj && obj.uri && !obj.uri.startsWith('file://') && !obj.uri.startsWith('http')) {
      obj.uri = FileSystem.documentDirectory + obj.uri;
    }
  }

  inflateUri(e.video);
  inflateUri(e.music);
  inflateUri(e.voice);

  if (e.images) e.images.forEach(inflateUri);
  if (e.blocks) {
    e.blocks.forEach(b => {
      if (b.type === 'collage' && b.images) {
        b.images.forEach(inflateUri);
      }
    });
  }
  return e;
}

export async function saveEntries(entries, mode = 'real') {
  try {
    const key = mode === 'real' ? KEYS.REAL_ENTRIES : KEYS.DECOY_ENTRIES;
    await AsyncStorage.setItem(key, JSON.stringify(entries));
  } catch (e) {
    console.error('saveEntries:', e);
  }
}

export async function addEntry(entry, dateKey, mode = 'real') {
  const processedEntry = await processMediaForSave(entry);
  const entries = await loadEntries(mode);
  if (!entries[dateKey]) entries[dateKey] = [];
  entries[dateKey] = entries[dateKey].filter(e => e.id !== processedEntry.id);
  entries[dateKey].unshift(processedEntry);
  await saveEntries(entries, mode);
  return entries;
}

export async function updateEntry(entry, dateKey, mode = 'real') {
  const processedEntry = await processMediaForSave(entry);
  const entries = await loadEntries(mode);
  if (!entries[dateKey]) return entries;
  entries[dateKey] = entries[dateKey].map(e => e.id === processedEntry.id ? processedEntry : e);
  await saveEntries(entries, mode);
  return entries;
}

export async function deleteEntry(entryId, dateKey, mode = 'real') {
  const entries = await loadEntries(mode);
  if (!entries[dateKey]) return entries;
  entries[dateKey] = entries[dateKey].filter(e => e.id !== entryId);
  if (entries[dateKey].length === 0) delete entries[dateKey];
  await saveEntries(entries, mode);
  return entries;
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...defaultSettings(), ...JSON.parse(raw) } : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('saveSettings:', e);
  }
}

function defaultSettings() {
  return {
    isDark:       false,
    primaryColor: '#9B5BC4',
    userName:     '',
    appIcon:      null,
  };
}

export function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDateKey(date = new Date()) {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}