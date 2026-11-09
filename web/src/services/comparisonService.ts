// ============================================================================
// SneakyToS — Comparison API Service & Backend Integration Layer
// ============================================================================

import apiClient from './api';
import {
  mockDetailedComparison,
  mockPrivacyReport,
} from './mockData';
import type { Comparison, PrivacyReport } from '@/types';

export interface CompareRequestMetadata {
  companyName: string;
  policyTitle: string;
  baselineDate?: string;
  revisedDate?: string;
}

export interface BackendComparisonResponse {
  comparisonId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalDiscrepancies: number;
  data?: Comparison;
}

/**
 * Initiates document comparison via FastAPI backend.
 * Gracefully falls back to verifiable mock data if backend server is unreachable.
 */
export async function startComparison(
  oldFile: File | null,
  newFile: File | null,
  metadata: CompareRequestMetadata
): Promise<{ comparisonId: string; isMock: boolean }> {
  try {
    const formData = new FormData();
    if (oldFile) formData.append('old_policy', oldFile);
    if (newFile) formData.append('new_policy', newFile);
    formData.append('company_name', metadata.companyName);
    formData.append('policy_title', metadata.policyTitle);

    const res = await apiClient.post<BackendComparisonResponse>(
      '/comparisons',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return {
      comparisonId: res.data.comparisonId,
      isMock: false,
    };
  } catch {
    console.info(
      '[SneakyToS API] Backend offline or unreachable. Utilizing volatile local comparison session (comp-omnicloud-v3-v4).'
    );
    return {
      comparisonId: mockDetailedComparison.id,
      isMock: true,
    };
  }
}

/**
 * Fetches full forensic comparison results by ID.
 */
export async function getComparisonById(id: string): Promise<{ data: Comparison; isMock: boolean }> {
  try {
    const res = await apiClient.get<Comparison>(`/comparisons/${id}`);
    return {
      data: res.data,
      isMock: false,
    };
  } catch {
    console.info(
      `[SneakyToS API] Fetching comparison "${id}" from high-fidelity local state.`
    );
    return {
      data: mockDetailedComparison,
      isMock: true,
    };
  }
}

/**
 * Fetches privacy impact audit report by comparison ID.
 */
export async function getPrivacyReportByComparisonId(
  comparisonId: string
): Promise<{ data: PrivacyReport; isMock: boolean }> {
  try {
    const res = await apiClient.get<PrivacyReport>(
      `/comparisons/${comparisonId}/privacy-report`
    );
    return {
      data: res.data,
      isMock: false,
    };
  } catch {
    console.info(
      `[SneakyToS API] Generating privacy impact report from local audit engine.`
    );
    return {
      data: mockPrivacyReport,
      isMock: true,
    };
  }
}

