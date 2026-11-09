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
  // Note: Do not set default Content-Type so multipart/form-data sets boundary correctly
  timeout: 180000, // 3 minutes timeout for NLP inference
});

/**
 * Health check endpoint: GET /health
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}

export default apiClient;
