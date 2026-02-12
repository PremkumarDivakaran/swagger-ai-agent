/**
 * API Client
 * Axios instance with interceptors for request/response handling
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
// Note: delWithBody is exported for DELETE requests that need a body
import { apiConfig } from '@/config';
import type { TransformedError } from '@/types';

// ============================================================================
// API Client Instance
// ============================================================================

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor
// ============================================================================

/**
 * Request interceptor for logging and token injection
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
        config.data ? { data: config.data } : ''
      );
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================

/**
 * Response interceptor for logging and error transformation
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.status,
        response.data
      );
    }

    return response;
  },
  (error: AxiosError) => {
    // Transform error for consistent handling
    const transformedError = transformError(error);

    console.error('[API Response Error]', transformedError);

    return Promise.reject(transformedError);
  }
);

// ============================================================================
// Error Transformation
// ============================================================================

/**
 * Transform axios error to consistent format
 */
function transformError(error: AxiosError): TransformedError {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data as { error?: { code?: string; message?: string } };
    return {
      code: data?.error?.code || `HTTP_${error.response.status}`,
      message: data?.error?.message || error.message || 'An error occurred',
      status: error.response.status,
    };
  }

  if (error.request) {
    // Request made but no response received
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
    };
  }

  // Something else went wrong
  return {
    code: 'REQUEST_ERROR',
    message: error.message || 'An error occurred while making the request',
  };
}

// ============================================================================
// Exports
// ============================================================================

export { apiClient };

/**
 * Helper to unwrap response data
 * Handles both wrapped { success, data } and direct response formats
 */
function unwrapResponse<T>(responseData: unknown): T {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'success' in responseData &&
    'data' in responseData
  ) {
    return (responseData as { success: boolean; data: T }).data;
  }
  return responseData as T;
}

/**
 * Generic GET request
 */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get(url, { params });
  return unwrapResponse<T>(response.data);
}

/**
 * Generic POST request
 */
export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.post(url, data);
  return unwrapResponse<T>(response.data);
}

/**
 * Generic PUT request
 */
export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.put(url, data);
  return unwrapResponse<T>(response.data);
}

/**
 * Generic DELETE request
 */
export async function del<T>(url: string): Promise<T> {
  const response = await apiClient.delete(url);
  return unwrapResponse<T>(response.data);
}

/**
 * Generic DELETE request with body
 */
export async function delWithBody<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.delete(url, { data });
  return unwrapResponse<T>(response.data);
}

export default apiClient;
