export interface JournalEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  firstEditAt?: number;
  lastEditAt?: number;
  date: string;
  title: string;
  content: string;
  heroImage?: string;
  images: string[];
  tags: string[];
  location?: string;
  mood?: string;
  weather?: string;
  device?: string;
  isFavorite: boolean;
  isHidden: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  userName: string;
  ghostMode?: {
    passphraseHash: string;
    salt: string;
    lastUnlockedAt?: number;
  };
}

export type ViewMode = 'timeline' | 'calendar' | 'gallery';

export interface SearchFilters {
  query: string;
  tags: string[];
  favoritesOnly: boolean;
  dateFrom?: string;
  dateTo?: string;
}
