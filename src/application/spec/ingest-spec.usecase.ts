/**
 * IngestSpecUseCase
 * Handles importing and normalizing Swagger/OpenAPI specs from various sources
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SwaggerLoader,
  SpecSource,
  LoadResult,
} from '../../infrastructure/swagger/SwaggerLoader';
import { SwaggerParserAdapter } from '../../infrastructure/swagger/SwaggerParserAdapter';
import { OpenApiNormalizer, NormalizationOptions } from '../../infrastructure/swagger/OpenApiNormalizer';
import { ISpecRepository } from '../../domain/repositories';
import { NormalizedSpec, SpecMetadata } from '../../domain/models';
import { ValidationError, ConflictError } from '../../core/errors';

/**
 * Input for spec ingestion
 */
export interface IngestSpecInput {
  /** Spec source configuration */
  source: SpecSource;
  /** Normalization options */
  options?: NormalizationOptions;
}

/**
 * Output from spec ingestion
 */
export interface IngestSpecOutput {
  /** Unique spec ID */
  specId: string;
  /** API title */
  title: string;
  /** API version */
  version: string;
  /** Number of operations */
  operationCount: number;
  /** Source location */
  sourceLocation: string;
  /** Tags found in spec */
  tags: string[];
  /** Any warnings during ingestion */
  warnings: string[];
}

/**
 * IngestSpecUseCase class
 * Orchestrates the full spec ingestion pipeline
 */
export class IngestSpecUseCase {
  constructor(
    private readonly loader: SwaggerLoader,
    private readonly parser: SwaggerParserAdapter,
    private readonly normalizer: OpenApiNormalizer,
    private readonly specRepository: ISpecRepository
  ) {}

  /**
   * Execute the spec ingestion use case
   * @param input - Ingestion input with source and options
   * @returns Ingestion result with spec ID and metadata
   */
  async execute(input: IngestSpecInput): Promise<IngestSpecOutput> {
    // Step 1: Load spec from source
    const loadResult = await this.loader.load(input.source);

    // Step 2: Parse and validate spec (parse already dereferences)
    const parseResult = await this.parser.parse(loadResult.content, loadResult.contentType);

    // Step 3: Validate spec structure
    const validationResult = await this.parser.validate(parseResult.spec as unknown as Record<string, unknown>);
    if (!validationResult.valid) {
      throw new ValidationError(
        'Spec validation failed',
        validationResult.errors.map(e => ({
          field: e.path || 'spec',
          message: e.message,
        }))
      );
    }

    // Step 4: Build metadata (parseResult.spec is already dereferenced)
    const metadata: SpecMetadata = {
      sourceType: loadResult.sourceType,
      sourceLocation: loadResult.sourceLocation,
      importedAt: new Date(),
      fileHash: this.computeHash(loadResult.content),
      gitInfo: input.source.type === 'git' ? {
        repo: input.source.repo,
        ref: input.source.ref,
        filePath: input.source.filePath,
      } : undefined,
    };

    // Step 5: Normalize to domain model
    const normalizedSpec = this.normalizer.normalize(
      parseResult.spec,
      parseResult.version,
      metadata,
      input.options
    );

    // Step 6: Check for duplicate specs
    // Check by title + version combination
    const existingByTitleVersion = await this.specRepository.findByTitleAndVersion(
      normalizedSpec.info.title,
      normalizedSpec.info.version
    );
    if (existingByTitleVersion) {
      throw new ConflictError(
        `A spec with title "${normalizedSpec.info.title}" and version "${normalizedSpec.info.version}" already exists (ID: ${existingByTitleVersion.id})`,
        'DUPLICATE_SPEC'
      );
    }

    // Also check by source location (for URL imports)
    if (loadResult.sourceLocation && loadResult.sourceLocation !== 'inline') {
      const existingBySource = await this.specRepository.existsBySource(loadResult.sourceLocation);
      if (existingBySource) {
        throw new ConflictError(
          `A spec from this source "${loadResult.sourceLocation}" has already been imported`,
          'DUPLICATE_SOURCE'
        );
      }
    }

    // Step 7: Assign ID and persist
    const specWithId: NormalizedSpec = {
      ...normalizedSpec,
      id: uuidv4(),
    };

    await this.specRepository.create(specWithId);

    // Return result
    return {
      specId: specWithId.id,
      title: specWithId.info.title,
      version: specWithId.info.version,
      operationCount: specWithId.operations.length,
      sourceLocation: loadResult.sourceLocation,
      tags: specWithId.tags.map(t => t.name),
      warnings: parseResult.warnings,
    };
  }

  /**
   * Compute a simple hash for change detection
   */
  private computeHash(content: string | Record<string, unknown>): string {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
