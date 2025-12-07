/**
 * EnvironmentConfig domain model
 * Represents a named environment configuration for API execution
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

/**
 * Authentication configuration types
 */
export type AuthType = 'none' | 'apiKey' | 'basic' | 'bearer' | 'oauth2';

/**
 * API Key authentication configuration
 */
export interface ApiKeyAuthConfig {
  type: 'apiKey';
  /** Header or query parameter name */
  parameterName: string;
  /** Location: header or query */
  in: 'header' | 'query';
  /** The API key value */
  value: string;
}

/**
 * Basic authentication configuration
 */
export interface BasicAuthConfig {
  type: 'basic';
  /** Username */
  username: string;
  /** Password */
  password: string;
}

/**
 * Bearer token authentication configuration
 */
export interface BearerAuthConfig {
  type: 'bearer';
  /** Bearer token */
  token: string;
  /** Token prefix (default: 'Bearer') */
  prefix?: string;
}

/**
 * OAuth2 authentication configuration
 */
export interface OAuth2AuthConfig {
  type: 'oauth2';
  /** Access token */
  accessToken: string;
  /** Refresh token (optional) */
  refreshToken?: string;
  /** Token URL for refresh */
  tokenUrl?: string;
  /** Client ID */
  clientId?: string;
  /** Client secret */
  clientSecret?: string;
  /** Scopes */
  scopes?: string[];
}

/**
 * No authentication configuration
 */
export interface NoAuthConfig {
  type: 'none';
}

/**
 * Union type for all auth configurations
 */
export type AuthConfig = NoAuthConfig | ApiKeyAuthConfig | BasicAuthConfig | BearerAuthConfig | OAuth2AuthConfig;

/**
 * EnvironmentConfig domain model
 * Represents a complete environment configuration
 */
export interface EnvironmentConfig {
  /** Unique identifier for this environment */
  id: string;
  
  /** Associated spec ID */
  specId: string;
  
  /** Environment name (e.g., 'dev', 'qa', 'staging', 'prod') */
  name: string;
  
  /** Base URL for API calls */
  baseUrl: string;
  
  /** Default headers to include in all requests */
  defaultHeaders: Record<string, string>;
  
  /** Authentication configuration */
  authConfig: AuthConfig;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Whether to verify SSL certificates */
  verifySsl?: boolean;
  
  /** Proxy configuration */
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
  
  /** Custom variables for this environment */
  variables: Record<string, string>;
  
  /** When this environment was created */
  createdAt: Date;
  
  /** When this environment was last updated */
  updatedAt: Date;
  
  /** Whether this is the default environment */
  isDefault?: boolean;
  
  /** Environment description */
  description?: string;
}

/**
 * Creates a new EnvironmentConfig with default values
 * @param partial - Partial environment data
 * @returns Complete EnvironmentConfig object
 */
export function createEnvironmentConfig(
  partial: Partial<EnvironmentConfig> & { id: string; specId: string; name: string; baseUrl: string }
): EnvironmentConfig {
  const now = new Date();
  return {
    id: partial.id,
    specId: partial.specId,
    name: partial.name,
    baseUrl: partial.baseUrl,
    defaultHeaders: partial.defaultHeaders ?? {},
    authConfig: partial.authConfig ?? { type: 'none' },
    timeout: partial.timeout ?? 30000,
    verifySsl: partial.verifySsl ?? true,
    proxy: partial.proxy,
    variables: partial.variables ?? {},
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    isDefault: partial.isDefault ?? false,
    description: partial.description,
  };
}

/**
 * Checks if environment has authentication configured
 * @param env - EnvironmentConfig to check
 * @returns true if authentication is configured
 */
export function hasAuth(env: EnvironmentConfig): boolean {
  return env.authConfig.type !== 'none';
}

/**
 * Gets the authorization header value for an environment
 * @param env - EnvironmentConfig to use
 * @returns Authorization header value or undefined
 */
export function getAuthorizationHeader(env: EnvironmentConfig): string | undefined {
  switch (env.authConfig.type) {
    case 'basic': {
      const credentials = Buffer.from(
        `${env.authConfig.username}:${env.authConfig.password}`
      ).toString('base64');
      return `Basic ${credentials}`;
    }
    case 'bearer': {
      const prefix = env.authConfig.prefix ?? 'Bearer';
      return `${prefix} ${env.authConfig.token}`;
    }
    case 'oauth2':
      return `Bearer ${env.authConfig.accessToken}`;
    default:
      return undefined;
  }
}

/**
 * Builds the complete URL for an operation path
 * @param env - EnvironmentConfig to use
 * @param path - API path
 * @returns Complete URL
 */
export function buildUrl(env: EnvironmentConfig, path: string): string {
  const base = env.baseUrl.endsWith('/') ? env.baseUrl.slice(0, -1) : env.baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Replaces variables in a string
 * @param env - EnvironmentConfig containing variables
 * @param input - String with variable placeholders (e.g., '{{baseUrl}}/api')
 * @returns String with variables replaced
 */
export function replaceVariables(env: EnvironmentConfig, input: string): string {
  let result = input;
  for (const [key, value] of Object.entries(env.variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}
