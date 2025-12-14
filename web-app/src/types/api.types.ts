/**
 * API Types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface TransformedError {
  code: string;
  message: string;
  status?: number;
}
