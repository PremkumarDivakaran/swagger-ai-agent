/**
 * DeleteSpecUseCase
 * Handles deletion of specs and associated resources
 */

import { ISpecRepository, IEnvironmentRepository } from '../../domain/repositories';
import { NotFoundError, ConflictError } from '../../core/errors';

/**
 * Input for spec deletion
 */
export interface DeleteSpecInput {
  /** Spec ID to delete */
  specId: string;
  /** Whether to force delete even if environments exist */
  force?: boolean;
}

/**
 * Output from spec deletion
 */
export interface DeleteSpecOutput {
  /** Whether deletion was successful */
  success: boolean;
  /** Deleted spec ID */
  specId: string;
  /** Number of associated environments deleted */
  environmentsDeleted: number;
}

/**
 * DeleteSpecUseCase class
 * Deletes specs and optionally cascades to related resources
 */
export class DeleteSpecUseCase {
  constructor(
    private readonly specRepository: ISpecRepository,
    private readonly environmentRepository: IEnvironmentRepository
  ) {}

  /**
   * Execute spec deletion
   * @param input - Deletion input
   * @returns Deletion result
   */
  async execute(input: DeleteSpecInput): Promise<DeleteSpecOutput> {
    // Check if spec exists
    const spec = await this.specRepository.findById(input.specId);
    if (!spec) {
      throw new NotFoundError('Spec', input.specId);
    }

    // Check for associated environments
    const environments = await this.environmentRepository.findBySpecId(input.specId);
    
    if (environments.length > 0 && !input.force) {
      throw new ConflictError(
        `Cannot delete spec: ${environments.length} environment(s) still exist. Use force delete to remove spec and all associated environments.`,
        'ENVIRONMENTS_EXIST'
      );
    }

    // Delete associated environments if force is true
    let environmentsDeleted = 0;
    if (environments.length > 0) {
      for (const env of environments) {
        await this.environmentRepository.delete(env.id);
        environmentsDeleted++;
      }
    }

    // Delete the spec
    await this.specRepository.delete(input.specId);

    return {
      success: true,
      specId: input.specId,
      environmentsDeleted,
    };
  }
}
