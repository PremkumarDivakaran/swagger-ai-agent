/**
 * Spec Types
 */

// Source types for importing specs
export interface UrlSource {
  type: 'url';
  url: string;
  headers?: Record<string, string>;
}

export interface InlineSource {
  type: 'inline';
  content: string;
  filename?: string;
}

export type SpecSource = UrlSource | InlineSource;

export interface ImportSpecRequest {
  source: SpecSource;
  generateMissingOperationIds?: boolean;
  includeDeprecated?: boolean;
}

export interface ImportSpecResponse {
  specId: string;
  title: string;
  version: string;
  operationCount: number;
  sourceLocation: string;
}

// API returns 'id', we alias it as specId for consistency
export interface SpecSummary {
  id: string;
  specId?: string; // alias for backwards compatibility
  title: string;
  version: string;
  operationCount: number;
  importedAt: string;
}

export interface SpecListResponse {
  specs: SpecSummary[];
  total: number;
}

export interface SpecMetadata {
  specId: string;
  title: string;
  version: string;
  description?: string;
  servers: Array<{
    url: string;
    description?: string;
  }>;
  operationCount: number;
  tagCount: number;
  source: {
    type: string;
    location: string;
    importedAt: string;
  };
}

export interface Operation {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  deprecated: boolean;
  parameters?: Array<{
    name: string;
    in: string;
    required: boolean;
    schema?: unknown;
  }>;
  requestBody?: {
    required: boolean;
    content: Record<string, unknown>;
  };
  responses: Record<string, unknown>;
}

export interface OperationsResponse {
  specId: string;
  operations: Operation[];
  total: number;
  filters?: {
    tags?: string[];
    methods?: string[];
  };
}

export interface TagStats {
  tag: string;
  count: number;
}

export interface TagStatsResponse {
  specId: string;
  tags: TagStats[];
  total: number;
}

export interface ValidateSpecRequest {
  specId?: string;
  rawSpec?: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
}

export interface ValidateSpecResponse {
  valid: boolean;
  issues: ValidationIssue[];
  version?: string;
  summary?: {
    paths: number;
    operations: number;
    schemas: number;
  };
}
