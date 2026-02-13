import { useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createEntry, updateEntry, deleteEntry, searchEntries, getAllTags, getSettings, updateSettings, exportData, importData } from '../db';
import type { JournalEntry, AppSettings, SearchFilters } from '../types';
import { useSecurity } from '../contexts/SecurityContext';

export const useEntries = () => {
  const { isGhostMode } = useSecurity();
  const entries = useLiveQuery(
    () => {
      if (isGhostMode) {
        return db.entries.orderBy('createdAt').reverse().toArray();
      }
      return db.entries.where('isHidden').equals(0).reverse().toArray();
    },
    [isGhostMode]
  );
  return { entries: entries || [], isLoading: entries === undefined };
};

export const useEntry = (id: string | null) => {
  const entry = useLiveQuery(
    () => id ? db.entries.get(id) : undefined,
    [id]
  );
  
  return { entry, isLoading: entry === undefined };
};

export const useTags = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isGhostMode } = useSecurity();
  
  useEffect(() => {
    const loadTags = async () => {
      const allTags = await getAllTags(isGhostMode);
      setTags(allTags);
      setIsLoading(false);
    };
    
    loadTags();
  }, [isGhostMode]);
  
  return { tags, isLoading };
};

export const useEntryOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isGhostMode } = useSecurity();
  
  const createNewEntry = useCallback(async (entryData: Parameters<typeof createEntry>[0]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const entry = await createEntry(entryData);
      return entry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateExistingEntry = useCallback(async (id: string, updates: Parameters<typeof updateEntry>[1]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const entry = await updateEntry(id, updates);
      return entry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const deleteExistingEntry = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await deleteEntry(id);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    createNewEntry,
    updateExistingEntry,
    deleteExistingEntry,
    isLoading,
    error,
    isGhostMode
  };
};

export const useSearch = (filters: SearchFilters) => {
  const [results, setResults] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isGhostMode } = useSecurity();
  
  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      
      try {
        let filtered = await searchEntries(filters.query, isGhostMode);
        
        if (filters.tags.length > 0) {
          filtered = filtered.filter(entry =>
            filters.tags.some(tag => entry.tags.includes(tag))
          );
        }
        
        if (filters.favoritesOnly) {
          filtered = filtered.filter(entry => entry.isFavorite);
        }
        
        if (filters.dateFrom) {
          filtered = filtered.filter(entry => entry.date >= filters.dateFrom!);
        }
        
        if (filters.dateTo) {
          filtered = filtered.filter(entry => entry.date <= filters.dateTo!);
        }
        
        setResults(filtered);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timeoutId = setTimeout(performSearch, 300);
    
    return () => clearTimeout(timeoutId);
  }, [filters, isGhostMode]);
  
  return { results, isLoading };
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadSettings = async () => {
      const data = await getSettings();
      setSettings(data);
      setIsLoading(false);
    };
    
    loadSettings();
  }, []);
  
  const updateAppSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const updated = await updateSettings(updates);
    setSettings(updated);
    return updated;
  }, []);
  
  return { settings, isLoading, updateAppSettings };
};

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  
  const exportToFile = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `day-zero-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);
  
  return { exportToFile, isExporting };
};

export const useDataImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const importFromFile = useCallback(async (file: File) => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const result = await importData(data);
      
      let message = `Successfully imported ${result.importedEntries} entries.`;
      
      if (result.errors.length > 0) {
        message += ` Skipped ${result.errors.length} invalid entries.`;
        console.warn('Import warnings:', result.errors);
      }
      
      setImportResult({ success: result.success, message });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import data';
      setImportResult({ success: false, message });
      throw error;
    } finally {
      setIsImporting(false);
    }
  }, []);
  
  const clearImportResult = useCallback(() => {
    setImportResult(null);
  }, []);
  
  return { importFromFile, isImporting, importResult, clearImportResult };
};

export const useFavorites = () => {
  const { isGhostMode } = useSecurity();
  const favorites = useLiveQuery(
    () => {
      if (isGhostMode) {
        return db.entries.where('isFavorite').equals(1).reverse().toArray();
      }
      return db.entries.where('isFavorite').equals(1).and(e => !e.isHidden).reverse().toArray();
    },
    [isGhostMode]
  );
  
  return { favorites: favorites || [], isLoading: favorites === undefined };
};

export const useEntriesByDate = (date: string) => {
  const { isGhostMode } = useSecurity();
  const entries = useLiveQuery(
    () => {
      if (isGhostMode) {
        return db.entries.where('date').equals(date).reverse().toArray();
      }
      return db.entries.where('date').equals(date).and(e => !e.isHidden).reverse().toArray();
    },
    [date, isGhostMode]
  );
  
  return { entries: entries || [], isLoading: entries === undefined };
};

export const useEntriesWithImages = () => {
  const { isGhostMode } = useSecurity();
  const entries = useLiveQuery(
    async () => {
      const allEntries = await db.entries.toArray();
      return allEntries.filter(entry => entry.images.length > 0);
    },
    [isGhostMode]
  );
  
  return { entries: entries || [], isLoading: entries === undefined };
};
