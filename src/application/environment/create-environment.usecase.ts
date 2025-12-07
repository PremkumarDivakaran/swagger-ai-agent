/**
 * CreateEnvironmentUseCase
 * Creates a new environment configuration for a spec
 */

import { EnvironmentConfig, AuthConfig, createEnvironmentConfig } from '../../domain/models';
import { IEnvironmentRepository, ISpecRepository } from '../../domain/repositories';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors';
import { generateId } from '../../utils';

/**
 * Input for creating an environment
 */
export interface CreateEnvironmentInput {
  /** Spec ID to associate with */
  specId: string;
  /** Environment name (e.g., 'dev', 'qa', 'staging', 'prod') */
  name: string;
  /** Base URL for API calls */
  baseUrl: string;
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
 * Output of environment creation
 */
export interface CreateEnvironmentOutput {
  /** Created environment ID */
  envId: string;
  /** Spec ID */
  specId: string;
  /** Environment name */
  name: string;
  /** Base URL */
  baseUrl: string;
  /** Whether this is the default environment */
  isDefault: boolean;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * CreateEnvironmentUseCase class
 * Handles environment creation with validation
 */
export class CreateEnvironmentUseCase {
  constructor(
    private readonly environmentRepository: IEnvironmentRepository,
    private readonly specRepository: ISpecRepository
  ) {}

  /**
   * Execute the create environment use case
   * @param input - Environment creation input
   * @returns Created environment details
   */
  async execute(input: CreateEnvironmentInput): Promise<CreateEnvironmentOutput> {
    // Validate spec exists
    const spec = await this.specRepository.findById(input.specId);
    if (!spec) {
      throw new NotFoundError('Spec', input.specId);
    }

    // Check for duplicate environment name
    const existing = await this.environmentRepository.findBySpecIdAndName(input.specId, input.name);
    if (existing) {
      throw new ConflictError(`Environment with name '${input.name}' already exists for this spec`);
    }

    // Validate base URL
    if (!this.isValidUrl(input.baseUrl)) {
      throw new ValidationError('Invalid base URL', [
        { field: 'baseUrl', message: 'Must be a valid HTTP or HTTPS URL' }
      ]);
    }

    // Create environment
    const envId = generateId();
    const now = new Date();

    const env: EnvironmentConfig = createEnvironmentConfig({
      id: envId,
      specId: input.specId,
      name: input.name,
      baseUrl: input.baseUrl,
      defaultHeaders: input.defaultHeaders,
      authConfig: input.authConfig,
      timeout: input.timeout,
      verifySsl: input.verifySsl,
      variables: input.variables,
      isDefault: input.isDefault,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    });

    // If this is the first environment or marked as default, set it as default
    const existingEnvs = await this.environmentRepository.findBySpecId(input.specId);
    const shouldBeDefault = input.isDefault || existingEnvs.length === 0;

    if (shouldBeDefault) {
      env.isDefault = true;
    }

    // Save environment
    const created = await this.environmentRepository.create(env);

    // If setting as default, clear default from other envs
    if (shouldBeDefault) {
      await this.clearOtherDefaults(input.specId, envId);
    }

    return {
      envId: created.id,
      specId: created.specId,
      name: created.name,
      baseUrl: created.baseUrl,
      isDefault: created.isDefault ?? false,
      createdAt: created.createdAt,
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
