import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { JournalEntry, AppSettings } from '../types';

export class DayZeroDB extends Dexie {
  entries!: Table<JournalEntry>;
  settings!: Table<AppSettings>;

  constructor() {
    super('DayZeroDB');
    
    this.version(4).stores({
      entries: 'id, createdAt, updatedAt, date, isFavorite, *tags, mood, device, isHidden',
      settings: 'theme, userName'
    });
  }
}

export const db = new DayZeroDB();

export const createEntry = async (entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'isHidden'>): Promise<JournalEntry> => {
  const now = Date.now();
  const newEntry: JournalEntry = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    isHidden: false,
    ...entryData
  };
  
  await db.entries.add(newEntry);
  return newEntry;
};

export const getEntry = async (id: string): Promise<JournalEntry | undefined> => {
  return await db.entries.get(id);
};

export const getAllEntries = async (includeHidden = false): Promise<JournalEntry[]> => {
  if (includeHidden) {
    return await db.entries.orderBy('createdAt').reverse().toArray();
  }
  return await db.entries
    .where('isHidden')
    .equals(0)
    .reverse()
    .toArray();
};

export const getHiddenEntries = async (): Promise<JournalEntry[]> => {
  return await db.entries
    .where('isHidden')
    .equals(1)
    .reverse()
    .toArray();
};

export const getEntriesByDateRange = async (startDate: string, endDate: string, includeHidden = false): Promise<JournalEntry[]> => {
  if (includeHidden) {
    return await db.entries
      .where('date')
      .between(startDate, endDate, true, true)
      .reverse()
      .toArray();
  }
  return await db.entries
    .where('date')
    .between(startDate, endDate, true, true)
    .reverse()
    .and(entry => !entry.isHidden)
    .toArray();
};

export const getEntriesByTag = async (tag: string, includeHidden = false): Promise<JournalEntry[]> => {
  if (includeHidden) {
    return await db.entries
      .where('tags')
      .equals(tag)
      .reverse()
      .toArray();
  }
  return await db.entries
    .where('tags')
    .equals(tag)
    .reverse()
    .and(entry => !entry.isHidden)
    .toArray();
};

export const getFavoriteEntries = async (includeHidden = false): Promise<JournalEntry[]> => {
  if (includeHidden) {
    return await db.entries
      .where('isFavorite')
      .equals(1)
      .reverse()
      .toArray();
  }
  return await db.entries
    .where('isFavorite')
    .equals(1)
    .reverse()
    .and(entry => !entry.isHidden)
    .toArray();
};

export const updateEntry = async (id: string, updates: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>): Promise<JournalEntry | undefined> => {
  const entry = await db.entries.get(id);
  if (!entry) return undefined;
  
  const updatedEntry: JournalEntry = {
    ...entry,
    ...updates,
    updatedAt: Date.now()
  };
  
  await db.entries.put(updatedEntry);
  return updatedEntry;
};

export const deleteEntry = async (id: string): Promise<boolean> => {
  const entry = await db.entries.get(id);
  if (!entry) return false;
  
  await db.entries.delete(id);
  return true;
};

export const searchEntries = async (query: string, includeHidden = false): Promise<JournalEntry[]> => {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return await getAllEntries(includeHidden);
  }
  
  const allEntries = await getAllEntries(includeHidden);
  
  return allEntries.filter(entry => {
    const contentMatch = entry.content.toLowerCase().includes(lowerQuery);
    const tagMatch = entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
    const locationMatch = entry.location?.toLowerCase().includes(lowerQuery) || false;
    
    return contentMatch || tagMatch || locationMatch;
  });
};

export const getAllTags = async (includeHidden = false): Promise<string[]> => {
  const entries = await getAllEntries(includeHidden);
  const allTags = new Set<string>();
  
  entries.forEach(entry => {
    entry.tags.forEach(tag => allTags.add(tag));
  });
  
  return Array.from(allTags).sort();
};

export const getEntriesForDay = async (dateString: string, includeHidden = false): Promise<JournalEntry[]> => {
  if (includeHidden) {
    return await db.entries
      .where('date')
      .equals(dateString)
      .reverse()
      .toArray();
  }
  return await db.entries
    .where('date')
    .equals(dateString)
    .reverse()
    .and(entry => !entry.isHidden)
    .toArray();
};

export const getEntriesWithImages = async (includeHidden = false): Promise<JournalEntry[]> => {
  const allEntries = await getAllEntries(includeHidden);
  return allEntries.filter(entry => entry.images.length > 0);
};

export const getSettings = async (): Promise<AppSettings> => {
  const settings = await db.settings.get('theme');
  
  if (!settings) {
    const defaultSettings: AppSettings = {
      theme: 'system',
      userName: ''
    };
    await db.settings.put({ ...defaultSettings, theme: 'system' as const });
    return defaultSettings;
  }
  
  return settings;
};

export const updateSettings = async (updates: Partial<AppSettings>): Promise<AppSettings> => {
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, ...updates };
  
  await db.settings.put(updatedSettings);
  return updatedSettings;
};

export const exportData = async (): Promise<{ entries: JournalEntry[]; settings: AppSettings }> => {
  const entries = await getAllEntries();
  const settings = await getSettings();
  
  return { entries, settings };
};

export const importData = async (data: { entries?: JournalEntry[]; settings?: AppSettings }): Promise<{ success: boolean; importedEntries: number; errors: string[] }> => {
  const errors: string[] = [];
  let importedEntries = 0;
  
  if (data.entries && Array.isArray(data.entries)) {
    for (const entry of data.entries) {
      try {
        if (!entry.id || !entry.content || !entry.date) {
          errors.push(`Invalid entry skipped: Missing required fields`);
          continue;
        }
        
        const existingEntry = await db.entries.get(entry.id);
        if (existingEntry) {
          await db.entries.put({ ...entry, updatedAt: Date.now() });
        } else {
          await db.entries.add(entry);
        }
        importedEntries++;
      } catch (error) {
        errors.push(`Failed to import entry ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  if (data.settings && typeof data.settings === 'object') {
    try {
      await updateSettings(data.settings);
    } catch (error) {
      errors.push(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { success: importedEntries > 0, importedEntries, errors };
};
