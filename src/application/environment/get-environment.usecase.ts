/**
 * GetEnvironmentUseCase
 * Retrieves environment details
 */

import { EnvironmentConfig } from '../../domain/models';
import { IEnvironmentRepository, ISpecRepository } from '../../domain/repositories';
import { NotFoundError } from '../../core/errors';

/**
 * Input for getting environment by ID
 */
export interface GetEnvironmentByIdInput {
  /** Environment ID */
  envId: string;
}

/**
 * Input for listing environments by spec
 */
export interface ListEnvironmentsBySpecInput {
  /** Spec ID */
  specId: string;
}

/**
 * Output for environment details
 */
export interface EnvironmentDetailsOutput {
  /** Environment ID */
  id: string;
  /** Spec ID */
  specId: string;
  /** Environment name */
  name: string;
  /** Base URL */
  baseUrl: string;
  /** Default headers */
  defaultHeaders: Record<string, string>;
  /** Auth type (type only, not credentials) */
  authType: string;
  /** Has auth configured */
  hasAuth: boolean;
  /** Request timeout */
  timeout: number;
  /** SSL verification enabled */
  verifySsl: boolean;
  /** Whether this is the default environment */
  isDefault: boolean;
  /** Environment description */
  description?: string;
  /** Variable names (not values for security) */
  variableNames: string[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Output for environment list
 */
export interface ListEnvironmentsOutput {
  /** Spec ID */
  specId: string;
  /** Environments */
  environments: EnvironmentDetailsOutput[];
  /** Total count */
  total: number;
}

/**
 * GetEnvironmentUseCase class
 * Handles environment retrieval
 */
export class GetEnvironmentUseCase {
  constructor(
    private readonly environmentRepository: IEnvironmentRepository,
    private readonly specRepository: ISpecRepository
  ) {}

  /**
   * Get environment by ID
   * @param input - Get environment input
   * @returns Environment details
   */
  async getById(input: GetEnvironmentByIdInput): Promise<EnvironmentDetailsOutput> {
    const env = await this.environmentRepository.findById(input.envId);
    if (!env) {
      throw new NotFoundError('Environment', input.envId);
    }

    return this.mapToOutput(env);
  }

  /**
   * List environments for a spec
   * @param input - List environments input
   * @returns List of environments
   */
  async listBySpec(input: ListEnvironmentsBySpecInput): Promise<ListEnvironmentsOutput> {
    // Verify spec exists
    const spec = await this.specRepository.findById(input.specId);
    if (!spec) {
      throw new NotFoundError('Spec', input.specId);
    }

    const environments = await this.environmentRepository.findBySpecId(input.specId);
    
    return {
      specId: input.specId,
      environments: environments.map(env => this.mapToOutput(env)),
      total: environments.length,
    };
  }

  /**
   * Get the default environment for a spec
   * @param specId - Spec ID
   * @returns Default environment or null
   */
  async getDefault(specId: string): Promise<EnvironmentDetailsOutput | null> {
    const env = await this.environmentRepository.findDefaultBySpecId(specId);
    if (!env) {
      return null;
    }
    return this.mapToOutput(env);
  }

  private mapToOutput(env: EnvironmentConfig): EnvironmentDetailsOutput {
    return {
      id: env.id,
      specId: env.specId,
      name: env.name,
      baseUrl: env.baseUrl,
      defaultHeaders: env.defaultHeaders,
      authType: env.authConfig.type,
      hasAuth: env.authConfig.type !== 'none',
      timeout: env.timeout ?? 30000,
      verifySsl: env.verifySsl ?? true,
      isDefault: env.isDefault ?? false,
      description: env.description,
      variableNames: Object.keys(env.variables),
      createdAt: env.createdAt,
      updatedAt: env.updatedAt,
    };
  }
}
