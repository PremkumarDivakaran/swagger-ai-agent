/**
 * DeleteEnvironmentUseCase
 * Deletes an environment configuration
 */

import { IEnvironmentRepository } from '../../domain/repositories';
import { NotFoundError, ValidationError } from '../../core/errors';

/**
 * Input for deleting an environment
 */
export interface DeleteEnvironmentInput {
  /** Environment ID */
  envId: string;
}

/**
 * Output of environment deletion
 */
export interface DeleteEnvironmentOutput {
  /** Deleted environment ID */
  envId: string;
  /** Success message */
  message: string;
}

/**
 * DeleteEnvironmentUseCase class
 * Handles environment deletion
 */
export class DeleteEnvironmentUseCase {
  constructor(private readonly environmentRepository: IEnvironmentRepository) {}

  /**
   * Execute the delete environment use case
   * @param input - Environment deletion input
   * @returns Deletion result
   */
  async execute(input: DeleteEnvironmentInput): Promise<DeleteEnvironmentOutput> {
    // Find existing environment
    const existing = await this.environmentRepository.findById(input.envId);
    if (!existing) {
      throw new NotFoundError('Environment', input.envId);
    }

    // Check if this is the default environment
    if (existing.isDefault) {
      // Check if there are other environments for this spec
      const otherEnvs = await this.environmentRepository.findBySpecId(existing.specId);
      const nonDefaultEnvs = otherEnvs.filter(e => e.id !== input.envId);
      
      if (nonDefaultEnvs.length > 0) {
        // Set another environment as default
        const newDefault = nonDefaultEnvs[0];
        await this.environmentRepository.setAsDefault(newDefault.id);
      }
    }

    // Delete the environment
    await this.environmentRepository.delete(input.envId);

    return {
      envId: input.envId,
      message: `Environment '${existing.name}' deleted successfully`,
    };
  }
}
