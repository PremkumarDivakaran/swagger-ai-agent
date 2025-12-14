/**
 * Environment Types
 */

export interface Environment {
  envId: string;
  name: string;
  specId: string;
  baseUrl: string;
  variables?: Record<string, string>;
  auth?: AuthConfig;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    headerName?: string;
  };
}

export interface CreateEnvironmentRequest {
  name: string;
  specId: string;
  baseUrl?: string; // Optional - backend will use spec's default server URL if not provided
  variables?: Record<string, string>;
  auth?: AuthConfig;
}

export interface UpdateEnvironmentRequest {
  name?: string;
  baseUrl?: string;
  variables?: Record<string, string>;
  auth?: AuthConfig;
}

export interface EnvironmentListResponse {
  environments: Environment[];
  total: number;
}
