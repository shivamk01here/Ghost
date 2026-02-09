import { format, parseISO, isToday, isYesterday, isThisWeek, isThisYear, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const formatDate = (dateString: string): string => {
  const date = parseISO(dateString);
  
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(date)) {
    return format(date, 'EEEE'); // Monday, Tuesday, etc.
  }
  
  if (isThisYear(date)) {
    return format(date, 'MMM d'); // Jan 15
  }
  
  return format(date, 'MMM d, yyyy'); // Jan 15, 2024
};

export const formatDateLong = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'EEEE, MMMM do, yyyy'); // Monday, January 15th, 2024
};

export const formatDateForInput = (dateString: string): string => {
  return dateString; // Already in YYYY-MM-DD format
};

export const getTodayString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return format(date, 'MMM d, yyyy h:mm a');
};

export const formatMonthYear = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'MMMM yyyy'); // January 2024
};

export const getDayOfMonth = (dateString: string): number => {
  const date = parseISO(dateString);
  return parseInt(format(date, 'd'));
};

export const getDayOfWeek = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'EEE'); // Mon, Tue, Wed
};

export const getFullDayOfWeek = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'EEEE'); // Monday, Tuesday
};

export const groupEntriesByMonth = <T extends { date: string }>(entries: T[]): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  
  entries.forEach(entry => {
    const monthKey = formatMonthYear(entry.date);
    
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    
    grouped.get(monthKey)!.push(entry);
  });
  
  return grouped;
};

export const getDateRangeString = (startDate: string, endDate: string): string => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  const startFormatted = format(start, 'MMM d');
  const endFormatted = format(end, 'MMM d, yyyy');
  
  return `${startFormatted} - ${endFormatted}`;
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month - 1, 1).getDay();
};

export const getCalendarDays = (year: number, month: number): (number | null)[] => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];
  
  // Add empty slots for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return days;
};

export const isValidDateString = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

export const getRelativeTimeString = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return 'Just now';
  }
  
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  return format(new Date(timestamp), 'MMM d, yyyy');
};

export const getLast7Days = (): string[] => {
  const days: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = subDays(today, i);
    days.push(format(date, 'yyyy-MM-dd'));
  }
  
  return days;
};

export const getMonthRange = (year: number, month: number): { start: string; end: string } => {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
  };
};

export const getYearRange = (year: number): { start: string; end: string } => {
  const start = startOfYear(new Date(year, 0));
  const end = endOfYear(new Date(year, 0));
  
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
  };
};
