// ============================================================================
// SneakyToS — Comparison API Service & Backend Integration Layer
// Real contract: POST /api/v1/compare (docs/api_handover.md)
// ============================================================================

import axios from 'axios';
import apiClient from './api';
import type { CompareResponse } from '@/types';

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB
export const SUPPORTED_EXTENSIONS = ['.txt', '.pdf'];

export class ComparisonApiError extends Error {
  status?: number;
  detail: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ComparisonApiError';
    this.status = status;
    this.detail = detail || message;
  }
}

/**
 * Validates file extension and size before submitting to the backend.
 */
export function validatePolicyFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  const name = file.name.toLowerCase();
  const hasValidExt = SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!hasValidExt) {
    return {
      isValid: false,
      error: `Invalid file format "${file.name}". Only .txt and .pdf files are supported.`,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: `File "${file.name}" is empty (0 bytes).`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File "${file.name}" exceeds the 20 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  return { isValid: true };
}

/**
 * Executes full policy comparison via FastAPI POST /api/v1/compare.
 * Sends multipart/form-data with `old_policy` and `new_policy`.
 */
export async function comparePolicies(
  oldFile: File,
  newFile: File
): Promise<CompareResponse> {
  // Client-side preflight validation
  const oldVal = validatePolicyFile(oldFile);
  if (!oldVal.isValid) {
    throw new ComparisonApiError(oldVal.error || 'Invalid baseline document', 400, oldVal.error);
  }

  const newVal = validatePolicyFile(newFile);
  if (!newVal.isValid) {
    throw new ComparisonApiError(newVal.error || 'Invalid revised document', 400, newVal.error);
  }

  const formData = new FormData();
  formData.append('old_policy', oldFile, oldFile.name);
  formData.append('new_policy', newFile, newFile.name);

  try {
    const response = await apiClient.post<CompareResponse>(
      '/api/v1/compare',
      formData
      // Note: do not set Content-Type header manually; browser provides multipart boundary
    );

    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const responseDetail = err.response?.data?.detail;

      if (!err.response) {
        if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
          throw new ComparisonApiError(
            'Analysis timed out: This document pair is exceptionally large (e.g. Google Privacy Policy with 600+ clauses). Please allow another moment or retry.',
            408,
            'Analysis timed out on large document'
          );
        }
        // Network offline / connection refused
        throw new ComparisonApiError(
          'Cannot connect to SneakyToS backend server at ' +
            apiClient.defaults.baseURL +
            '. Please ensure the FastAPI server is running.',
          0,
          'Network connection error'
        );
      }

      if (status === 400) {
        throw new ComparisonApiError(
          responseDetail || 'Invalid policy input: TXT or text-based PDF required.',
          400,
          responseDetail
        );
      }

      if (status === 413) {
        throw new ComparisonApiError(
          responseDetail || 'Document exceeds the 20 MB size limit.',
          413,
          responseDetail
        );
      }

      if (status === 422) {
        throw new ComparisonApiError(
          responseDetail || 'Validation error: required files (old_policy, new_policy) missing.',
          422,
          responseDetail
        );
      }

      if (status === 500) {
        throw new ComparisonApiError(
          responseDetail || 'Policy comparison analysis pipeline encountered an error.',
          500,
          responseDetail
        );
      }

      throw new ComparisonApiError(
        responseDetail || err.message || 'Comparison request failed.',
        status,
        responseDetail
      );
    }

    if (err instanceof ComparisonApiError) {
      throw err;
    }

    throw new ComparisonApiError(
      err instanceof Error ? err.message : 'Unexpected error during policy comparison.'
    );
  }
}
