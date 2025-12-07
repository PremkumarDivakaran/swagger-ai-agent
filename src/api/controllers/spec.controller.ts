/**
 * Spec Controller
 * Handles HTTP requests for spec management
 */

import { Request, Response, NextFunction } from 'express';
import {
  IngestSpecUseCase,
  ValidateSpecUseCase,
  ListOperationsUseCase,
  GetSpecUseCase,
  DeleteSpecUseCase,
} from '../../application/spec';
import {
  ImportSpecRequestDto,
  ImportSpecResponseDto,
  ValidateSpecRequestDto,
  ValidateSpecResponseDto,
  SpecMetadataResponseDto,
  ListOperationsQueryDto,
  ListOperationsResponseDto,
  TagStatsResponseDto,
  SpecListResponseDto,
  DeleteSpecRequestDto,
  DeleteSpecResponseDto,
} from '../dto/spec.dto';

/**
 * SpecController class
 * Handles all spec-related HTTP endpoints
 */
export class SpecController {
  constructor(
    private readonly ingestSpecUseCase: IngestSpecUseCase,
    private readonly validateSpecUseCase: ValidateSpecUseCase,
    private readonly listOperationsUseCase: ListOperationsUseCase,
    private readonly getSpecUseCase: GetSpecUseCase,
    private readonly deleteSpecUseCase: DeleteSpecUseCase
  ) {}

  /**
   * Import a spec from URL, file, or git
   * POST /spec/import
   */
  importSpec = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as ImportSpecRequestDto;

      const result = await this.ingestSpecUseCase.execute({
        source: body.source,
        options: {
          generateMissingOperationIds: body.generateMissingOperationIds,
          includeDeprecated: body.includeDeprecated,
        },
      });

      const response: ImportSpecResponseDto = {
        specId: result.specId,
        title: result.title,
        version: result.version,
        operationCount: result.operationCount,
        sourceLocation: result.sourceLocation,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate a spec
   * POST /spec/validate
   */
  validateSpec = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as ValidateSpecRequestDto;

      const result = await this.validateSpecUseCase.execute({
        specId: body.specId,
        rawSpec: body.rawSpec,
      });

      const response: ValidateSpecResponseDto = {
        valid: result.valid,
        issues: result.issues,
        version: result.version,
        summary: result.summary,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get spec metadata
   * GET /spec/:specId
   */
  getSpec = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { specId } = req.params;

      const result = await this.getSpecUseCase.execute(specId);

      const response: SpecMetadataResponseDto = {
        ...result,
        source: {
          ...result.source,
          importedAt: result.source.importedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List all specs
   * GET /spec
   */
  listSpecs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getSpecUseCase.listAll();

      const response: SpecListResponseDto = {
        specs: result.map(spec => ({
          ...spec,
          importedAt: spec.importedAt.toISOString(),
        })),
        total: result.length,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List operations for a spec
   * GET /spec/:specId/operations
   */
  listOperations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { specId } = req.params;
      const query = req.query as ListOperationsQueryDto;

      const result = await this.listOperationsUseCase.execute({
        specId,
        filter: {
          tag: query.tag,
          method: query.method,
          pathPattern: query.pathPattern,
          includeDeprecated: query.includeDeprecated === 'true' || query.includeDeprecated === undefined,
          requiresAuth: query.requiresAuth !== undefined ? query.requiresAuth === 'true' : undefined,
        },
      });

      const response: ListOperationsResponseDto = result;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tag statistics for a spec
   * GET /spec/:specId/tags
   */
  getTagStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { specId } = req.params;

      const result = await this.getSpecUseCase.getTagStats(specId);

      const response: TagStatsResponseDto = result;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a spec
   * DELETE /spec/:specId
   */
  deleteSpec = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { specId } = req.params;
      const body = req.body as DeleteSpecRequestDto;

      const result = await this.deleteSpecUseCase.execute({
        specId,
        force: body.force,
      });

      const response: DeleteSpecResponseDto = result;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
