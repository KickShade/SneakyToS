// ============================================================================
// SneakyToS — Axios API Client
// Contract: http://127.0.0.1:8000 (FastAPI backend)
// ============================================================================

import axios from 'axios';
import type { HealthResponse } from '@/types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // 6 minutes timeout for deep neural inference on large policies (e.g. Google's 600+ clauses)
  timeout: 360000,
});

/**
 * Health check endpoint: GET /health
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}

export default apiClient;
