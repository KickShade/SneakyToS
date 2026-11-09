// ============================================================================
// SneakyToS — Global Comparison Context & State Management
// ============================================================================

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CompareResponse } from '@/types';
import { comparePolicies, ComparisonApiError } from '@/services/comparisonService';

const STORAGE_KEY = 'sneakytos_active_comparison';

interface ComparisonContextValue {
  comparisonData: CompareResponse | null;
  isLoading: boolean;
  error: string | null;
  oldFileName: string | null;
  newFileName: string | null;
  executeCompare: (oldFile: File, newFile: File) => Promise<CompareResponse>;
  clearComparison: () => void;
  setError: (err: string | null) => void;
  setComparisonData: (data: CompareResponse | null) => void;
}

const ComparisonContext = createContext<ComparisonContextValue | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [comparisonData, setComparisonDataState] = useState<CompareResponse | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as CompareResponse;
      }
    } catch {
      console.warn('Failed to parse cached comparison data from sessionStorage.');
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [oldFileName, setOldFileName] = useState<string | null>(
    () => comparisonData?.old_policy.filename || null
  );
  const [newFileName, setNewFileName] = useState<string | null>(
    () => comparisonData?.new_policy.filename || null
  );

  const setComparisonData = (data: CompareResponse | null) => {
    setComparisonDataState(data);
    if (data) {
      setOldFileName(data.old_policy.filename);
      setNewFileName(data.new_policy.filename);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to cache comparison in sessionStorage (might exceed quota):', e);
      }
    } else {
      setOldFileName(null);
      setNewFileName(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearComparison = () => {
    setComparisonData(null);
    setError(null);
  };

  const executeCompare = async (oldFile: File, newFile: File): Promise<CompareResponse> => {
    setIsLoading(true);
    setError(null);
    setOldFileName(oldFile.name);
    setNewFileName(newFile.name);

    try {
      const result = await comparePolicies(oldFile, newFile);
      setComparisonData(result);
      setIsLoading(false);
      return result;
    } catch (err: unknown) {
      setIsLoading(false);
      const message =
        err instanceof ComparisonApiError
          ? err.detail || err.message
          : err instanceof Error
          ? err.message
          : 'Comparison failed due to an unexpected error.';
      setError(message);
      throw err;
    }
  };

  return (
    <ComparisonContext.Provider
      value={{
        comparisonData,
        isLoading,
        error,
        oldFileName,
        newFileName,
        executeCompare,
        clearComparison,
        setError,
        setComparisonData,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
