/**
 * GetSpecUseCase
 * Retrieves spec metadata and details
 */

import { ISpecRepository } from '../../domain/repositories';
import { NormalizedSpec, getOperationsByTag, getAllTags, getTagStats } from '../../domain/models';
import { NotFoundError } from '../../core/errors';

/**
 * Spec metadata output
 */
export interface SpecMetadataOutput {
  /** Spec ID */
  id: string;
  /** API title */
  title: string;
  /** API version */
  version: string;
  /** API description */
  description?: string;
  /** Server URLs */
  servers: Array<{
    url: string;
    description?: string;
  }>;
  /** Tags with operation counts */
  tags: Array<{
    name: string;
    description?: string;
    operationCount: number;
  }>;
  /** Total operation count */
  operationCount: number;
  /** Source information */
  source: {
    type: 'url' | 'file' | 'git';
    location: string;
    importedAt: Date;
  };
  /** Security schemes */
  securitySchemes: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}

/**
 * Tag statistics output
 */
export interface TagStatsOutput {
  /** Spec ID */
  specId: string;
  /** Tags with counts */
  tags: Array<{
    name: string;
    description?: string;
    operationCount: number;
  }>;
  /** Total unique tags */
  totalTags: number;
}

/**
 * GetSpecUseCase class
 * Retrieves spec metadata and provides introspection
 */
export class GetSpecUseCase {
  constructor(private readonly specRepository: ISpecRepository) {}

  /**
   * Get spec metadata by ID
   * @param specId - Spec ID
   * @returns Spec metadata
   */
  async execute(specId: string): Promise<SpecMetadataOutput> {
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new NotFoundError('Spec', specId);
    }

    return this.toMetadataOutput(spec);
  }

  /**
   * Get tag statistics for a spec
   * @param specId - Spec ID
   * @returns Tag statistics
   */
  async getTagStats(specId: string): Promise<TagStatsOutput> {
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new NotFoundError('Spec', specId);
    }

    const tagStats = getTagStats(spec);
    const allTags = getAllTags(spec);

    const tags = allTags.map(tagName => {
      const tagDef = spec.tags.find(t => t.name === tagName);
      return {
        name: tagName,
        description: tagDef?.description,
        operationCount: tagStats.get(tagName) || 0,
      };
    });

    return {
      specId,
      tags,
      totalTags: tags.length,
    };
  }

  /**
   * List all specs
   * @returns List of spec summaries
   */
  async listAll(): Promise<Array<{
    id: string;
    title: string;
    version: string;
    operationCount: number;
    importedAt: Date;
  }>> {
    const result = await this.specRepository.find({ limit: 100 });
    
    return result.items.map(spec => ({
      id: spec.id,
      title: spec.info.title,
      version: spec.info.version,
      operationCount: spec.operations.length,
      importedAt: spec.metadata.importedAt,
    }));
  }

  /**
   * Convert spec to metadata output
   */
  private toMetadataOutput(spec: NormalizedSpec): SpecMetadataOutput {
    const tagStats = getTagStats(spec);

    return {
      id: spec.id,
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      servers: spec.servers.map(s => ({
        url: s.url,
        description: s.description,
      })),
      tags: spec.tags.map(tag => ({
        name: tag.name,
        description: tag.description,
        operationCount: tagStats.get(tag.name) || 0,
      })),
      operationCount: spec.operations.length,
      source: {
        type: spec.metadata.sourceType,
        location: spec.metadata.sourceLocation,
        importedAt: spec.metadata.importedAt,
      },
      securitySchemes: spec.securitySchemes.map(scheme => ({
        name: scheme.name,
        type: scheme.type,
        description: scheme.description,
      })),
    };
  }
}
