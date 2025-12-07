/**
 * NormalizedSpec domain model
 * Represents a normalized Swagger/OpenAPI specification
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { Operation } from './Operation';

/**
 * OpenAPI version
 */
export type OpenApiVersion = '2.0' | '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';

/**
 * Server definition
 */
export interface ServerInfo {
  /** Server URL */
  url: string;
  /** Server description */
  description?: string;
  /** Server variables */
  variables?: Record<string, {
    default: string;
    description?: string;
    enum?: string[];
  }>;
}

/**
 * Contact information
 */
export interface ContactInfo {
  name?: string;
  url?: string;
  email?: string;
}

/**
 * License information
 */
export interface LicenseInfo {
  name: string;
  url?: string;
}

/**
 * API information
 */
export interface ApiInfo {
  /** API title */
  title: string;
  /** API version */
  version: string;
  /** API description */
  description?: string;
  /** Terms of service URL */
  termsOfService?: string;
  /** Contact information */
  contact?: ContactInfo;
  /** License information */
  license?: LicenseInfo;
}

/**
 * Tag definition
 */
export interface TagDefinition {
  /** Tag name */
  name: string;
  /** Tag description */
  description?: string;
  /** External documentation */
  externalDocs?: {
    url: string;
    description?: string;
  };
}

/**
 * Security scheme definition
 */
export interface SecurityScheme {
  /** Scheme name (key in securitySchemes) */
  name: string;
  /** Scheme type */
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  /** Description */
  description?: string;
  /** For apiKey: parameter name */
  parameterName?: string;
  /** For apiKey: location */
  in?: 'query' | 'header' | 'cookie';
  /** For http: scheme (basic, bearer, etc.) */
  scheme?: string;
  /** For http bearer: format (e.g., JWT) */
  bearerFormat?: string;
  /** For oauth2: flows */
  flows?: Record<string, {
    authorizationUrl?: string;
    tokenUrl?: string;
    refreshUrl?: string;
    scopes?: Record<string, string>;
  }>;
  /** For openIdConnect: URL */
  openIdConnectUrl?: string;
}

/**
 * Spec metadata
 */
export interface SpecMetadata {
  /** Source type (url, file, git) */
  sourceType: 'url' | 'file' | 'git';
  /** Original source location */
  sourceLocation: string;
  /** When the spec was imported */
  importedAt: Date;
  /** File hash for change detection */
  fileHash?: string;
  /** Git-specific info */
  gitInfo?: {
    repo: string;
    ref: string;
    filePath: string;
    commitHash?: string;
  };
}

/**
 * NormalizedSpec domain model
 * Represents a complete normalized OpenAPI specification
 */
export interface NormalizedSpec {
  /** Unique identifier for this spec */
  id: string;
  
  /** OpenAPI version */
  openApiVersion: OpenApiVersion;
  
  /** API information */
  info: ApiInfo;
  
  /** Server definitions */
  servers: ServerInfo[];
  
  /** Tag definitions */
  tags: TagDefinition[];
  
  /** All operations in this spec */
  operations: Operation[];
  
  /** Security schemes defined in this spec */
  securitySchemes: SecurityScheme[];
  
  /** Global security requirements */
  globalSecurity: { schemeName: string; scopes: string[] }[];
  
  /** Spec metadata */
  metadata: SpecMetadata;
  
  /** Raw JSON schema definitions (for reference resolution) */
  schemas?: Record<string, Record<string, unknown>>;
}

/**
 * Creates a new NormalizedSpec with default values
 * @param partial - Partial spec data
 * @returns Complete NormalizedSpec object
 */
export function createNormalizedSpec(
  partial: Partial<NormalizedSpec> & { id: string; info: ApiInfo; metadata: SpecMetadata }
): NormalizedSpec {
  return {
    id: partial.id,
    openApiVersion: partial.openApiVersion ?? '3.0.0',
    info: partial.info,
    servers: partial.servers ?? [],
    tags: partial.tags ?? [],
    operations: partial.operations ?? [],
    securitySchemes: partial.securitySchemes ?? [],
    globalSecurity: partial.globalSecurity ?? [],
    metadata: partial.metadata,
    schemas: partial.schemas,
  };
}

/**
 * Gets the operation count for a spec
 * @param spec - NormalizedSpec to check
 * @returns Number of operations
 */
export function getOperationCount(spec: NormalizedSpec): number {
  return spec.operations.length;
}

/**
 * Gets operations by tag
 * @param spec - NormalizedSpec to filter
 * @param tag - Tag name
 * @returns Operations with the specified tag
 */
export function getOperationsByTag(spec: NormalizedSpec, tag: string): Operation[] {
  return spec.operations.filter(op => op.tags.includes(tag));
}

/**
 * Gets all unique tags from operations
 * @param spec - NormalizedSpec to check
 * @returns Array of unique tag names
 */
export function getAllTags(spec: NormalizedSpec): string[] {
  const tags = new Set<string>();
  spec.operations.forEach(op => op.tags.forEach(t => tags.add(t)));
  return Array.from(tags);
}

/**
 * Gets tag statistics
 * @param spec - NormalizedSpec to analyze
 * @returns Map of tag name to operation count
 */
export function getTagStats(spec: NormalizedSpec): Map<string, number> {
  const stats = new Map<string, number>();
  spec.operations.forEach(op => {
    op.tags.forEach(tag => {
      stats.set(tag, (stats.get(tag) ?? 0) + 1);
    });
  });
  return stats;
}

/**
 * Finds an operation by ID
 * @param spec - NormalizedSpec to search
 * @param operationId - Operation ID
 * @returns Operation if found, undefined otherwise
 */
export function findOperation(spec: NormalizedSpec, operationId: string): Operation | undefined {
  return spec.operations.find(op => op.operationId === operationId);
}

/**
 * Gets the default server URL
 * @param spec - NormalizedSpec to check
 * @returns Default server URL or empty string
 */
export function getDefaultServerUrl(spec: NormalizedSpec): string {
  return spec.servers[0]?.url ?? '';
}
