import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getDb } from '@/db';
import { formats } from '@/db/schema';
import { STORAGE_KEY, DEFAULT_FORMAT, resolveInitialFormat } from '@/features/formats/format-utils';

interface FormatContextValue {
  format: string;
  setFormat: (format: string) => void;
  availableFormats: string[];
}

const FormatContext = createContext<FormatContextValue | undefined>(undefined);

const readStoredFormat = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const FormatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  // Provisional format before the list loads: the stored choice or the constant
  // default, so pages fetch against a sensible regulation and don't flash an empty list.
  const [format, setFormatState] = useState<string>(() => readStoredFormat() ?? DEFAULT_FORMAT);

  useEffect(() => {
    let cancelled = false;
    const loadFormats = async () => {
      try {
        const db = await getDb();
        const rows = await db.select({ name: formats.name }).from(formats);
        if (cancelled) return;
        const names = rows.map((r) => r.name);
        setAvailableFormats(names);
        setFormatState(resolveInitialFormat(readStoredFormat(), names));
      } catch (error) {
        console.error('Failed to load formats:', error);
      }
    };
    loadFormats();
    return () => {
      cancelled = true;
    };
  }, []);

  const setFormat = useCallback((next: string) => {
    setFormatState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore persistence failures (e.g. storage disabled)
    }
  }, []);

  return (
    <FormatContext.Provider value={{ format, setFormat, availableFormats }}>
      {children}
    </FormatContext.Provider>
  );
};

export const useFormat = (): FormatContextValue => {
  const ctx = useContext(FormatContext);
  if (!ctx) {
    throw new Error('useFormat must be used within a FormatProvider');
  }
  return ctx;
};
