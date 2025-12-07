/**
 * UpdateEnvironmentUseCase
 * Updates an existing environment configuration
 */

import { EnvironmentConfig, AuthConfig } from '../../domain/models';
import { IEnvironmentRepository } from '../../domain/repositories';
import { NotFoundError, ValidationError } from '../../core/errors';

/**
 * Input for updating an environment
 */
export interface UpdateEnvironmentInput {
  /** Environment ID */
  envId: string;
  /** Base URL for API calls */
  baseUrl?: string;
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
  /** Authentication configuration */
  authConfig?: AuthConfig;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to verify SSL certificates */
  verifySsl?: boolean;
  /** Custom variables for this environment */
  variables?: Record<string, string>;
  /** Whether this is the default environment */
  isDefault?: boolean;
  /** Environment description */
  description?: string;
}

/**
 * Output of environment update
 */
export interface UpdateEnvironmentOutput {
  /** Environment ID */
  envId: string;
  /** Spec ID */
  specId: string;
  /** Environment name */
  name: string;
  /** Base URL */
  baseUrl: string;
  /** Whether this is the default environment */
  isDefault: boolean;
  /** Update timestamp */
  updatedAt: Date;
}

/**
 * UpdateEnvironmentUseCase class
 * Handles environment updates with validation
 */
export class UpdateEnvironmentUseCase {
  constructor(private readonly environmentRepository: IEnvironmentRepository) {}

  /**
   * Execute the update environment use case
   * @param input - Environment update input
   * @returns Updated environment details
   */
  async execute(input: UpdateEnvironmentInput): Promise<UpdateEnvironmentOutput> {
    // Find existing environment
    const existing = await this.environmentRepository.findById(input.envId);
    if (!existing) {
      throw new NotFoundError('Environment', input.envId);
    }

    // Validate base URL if provided
    if (input.baseUrl !== undefined && !this.isValidUrl(input.baseUrl)) {
      throw new ValidationError('Invalid base URL', [
        { field: 'baseUrl', message: 'Must be a valid HTTP or HTTPS URL' }
      ]);
    }

    // Build updated environment
    const updated: EnvironmentConfig = {
      ...existing,
      baseUrl: input.baseUrl ?? existing.baseUrl,
      defaultHeaders: input.defaultHeaders ?? existing.defaultHeaders,
      authConfig: input.authConfig ?? existing.authConfig,
      timeout: input.timeout ?? existing.timeout,
      verifySsl: input.verifySsl ?? existing.verifySsl,
      variables: input.variables ?? existing.variables,
      isDefault: input.isDefault ?? existing.isDefault,
      description: input.description ?? existing.description,
      updatedAt: new Date(),
    };

    // Save updated environment
    const saved = await this.environmentRepository.update(updated);

    // If setting as default, clear default from other envs
    if (input.isDefault === true) {
      await this.clearOtherDefaults(saved.specId, saved.id);
    }

    return {
      envId: saved.id,
      specId: saved.specId,
      name: saved.name,
      baseUrl: saved.baseUrl,
      isDefault: saved.isDefault ?? false,
      updatedAt: saved.updatedAt,
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async clearOtherDefaults(specId: string, excludeId: string): Promise<void> {
    const envs = await this.environmentRepository.findBySpecId(specId);
    for (const env of envs) {
      if (env.id !== excludeId && env.isDefault) {
        await this.environmentRepository.update({ ...env, isDefault: false });
      }
    }
  }
}
