/**
 * SwaggerLoader
 * Responsible for loading Swagger/OpenAPI specs from various sources
 */

import fs from 'fs/promises';
import axios from 'axios';
import { ExternalServiceError } from '../../core/errors';

/**
 * Source types for Swagger specs
 */
export type SpecSourceType = 'url' | 'file' | 'git';

/**
 * URL source configuration
 */
export interface UrlSource {
  type: 'url';
  url: string;
  headers?: Record<string, string>;
}

/**
 * File source configuration
 */
export interface FileSource {
  type: 'file';
  path: string;
}

/**
 * Git source configuration
 */
export interface GitSource {
  type: 'git';
  repo: string;
  ref: string;
  filePath: string;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Union type for all source configurations
 */
export type SpecSource = UrlSource | FileSource | GitSource;

/**
 * Result of loading a spec
 */
export interface LoadResult {
  /** Raw content (string for YAML, object for JSON) */
  content: string | Record<string, unknown>;
  /** Content type (json or yaml) */
  contentType: 'json' | 'yaml';
  /** Original source location */
  sourceLocation: string;
  /** Source type */
  sourceType: SpecSourceType;
}

/**
 * SwaggerLoader class
 * Handles loading Swagger/OpenAPI specs from URL, file, or git
 */
export class SwaggerLoader {
  /**
   * Load spec from any supported source
   * @param source - Source configuration
   * @returns LoadResult with raw content
   */
  async load(source: SpecSource): Promise<LoadResult> {
    switch (source.type) {
      case 'url':
        return this.loadFromUrl(source);
      case 'file':
        return this.loadFromFile(source);
      case 'git':
        return this.loadFromGit(source);
      default:
        throw new ExternalServiceError(
          `Unsupported source type: ${(source as SpecSource).type}`,
          'SwaggerLoader'
        );
    }
  }

  /**
   * Load spec from URL
   * @param source - URL source configuration
   * @returns LoadResult with raw content
   */
  async loadFromUrl(source: UrlSource): Promise<LoadResult> {
    try {
      const response = await axios.get(source.url, {
        headers: source.headers,
        timeout: 30000,
        responseType: 'text',
      });

      const content = response.data;
      const contentType = this.detectContentType(content, source.url);

      return {
        content,
        contentType,
        sourceLocation: source.url,
        sourceType: 'url',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalServiceError(
        `Failed to load spec from URL: ${source.url}. ${message}`,
        'SwaggerLoader'
      );
    }
  }

  /**
   * Load spec from file
   * @param source - File source configuration
   * @returns LoadResult with raw content
   */
  async loadFromFile(source: FileSource): Promise<LoadResult> {
    try {
      const content = await fs.readFile(source.path, 'utf-8');
      const contentType = this.detectContentType(content, source.path);

      return {
        content,
        contentType,
        sourceLocation: source.path,
        sourceType: 'file',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalServiceError(
        `Failed to load spec from file: ${source.path}. ${message}`,
        'SwaggerLoader'
      );
    }
  }

  /**
   * Load spec from git repository
   * @param source - Git source configuration
   * @returns LoadResult with raw content
   */
  async loadFromGit(source: GitSource): Promise<LoadResult> {
    // TODO: Implement git loading
    // Options:
    // 1. Clone repo to temp directory and read file
    // 2. Use GitHub/GitLab API to fetch file content
    // 3. Use simple-git library
    
    // For now, throw not implemented error
    throw new ExternalServiceError(
      `Git source loading not yet implemented. Repo: ${source.repo}, Ref: ${source.ref}, Path: ${source.filePath}`,
      'SwaggerLoader'
    );
  }

  /**
   * Detect content type from content or filename
   * @param content - Raw content string
   * @param source - Source path or URL
   * @returns Content type ('json' or 'yaml')
   */
  private detectContentType(content: string, source: string): 'json' | 'yaml' {
    // Check file extension first
    const lowerSource = source.toLowerCase();
    if (lowerSource.endsWith('.json')) {
      return 'json';
    }
    if (lowerSource.endsWith('.yaml') || lowerSource.endsWith('.yml')) {
      return 'yaml';
    }

    // Try to detect from content
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }

    // Default to yaml
    return 'yaml';
  }
}

/**
 * Creates a SwaggerLoader instance
 * @returns SwaggerLoader instance
 */
export function createSwaggerLoader(): SwaggerLoader {
  return new SwaggerLoader();
}
