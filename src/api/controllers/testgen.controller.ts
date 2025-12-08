/**
 * Test Generation Controller
 * Handles HTTP requests for test generation endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../core/types';
import { 
  GenerateAxiosTestsUseCase,
  TestGenerationResult,
} from '../../application/testgen/generate-axios-tests.usecase';
import {
  ExportTestSuiteUseCase,
  ExportResult,
} from '../../application/testgen/export-test-suite.usecase';
import { ISpecRepository } from '../../domain/repositories';
import {
  GenerateAxiosTestsRequestDto,
  GenerateAxiosTestsResponseDto,
  TestPreviewRequestDto,
  TestPreviewResponseDto,
  ExportTestSuiteRequestDto,
  ExportTestSuiteResponseDto,
} from '../dto/testgen.dto';

/**
 * TestGenController
 * Thin controller that delegates to use cases
 */
export class TestGenController {
  constructor(
    private generateAxiosTestsUseCase: GenerateAxiosTestsUseCase,
    private exportTestSuiteUseCase: ExportTestSuiteUseCase,
    private specRepository: ISpecRepository
  ) {}

  /**
   * POST /testgen/generate-axios-tests
   * Generate Axios + Jest test code from a spec
   */
  async generateAxiosTests(
    req: Request<unknown, unknown, GenerateAxiosTestsRequestDto>,
    res: Response<ApiResponse<GenerateAxiosTestsResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { specId, selection, options } = req.body;

      const result = await this.generateAxiosTestsUseCase.execute({
        specId,
        selection,
        options,
      });

      const response: ApiResponse<GenerateAxiosTestsResponseDto> = {
        success: true,
        data: this.mapTestGenerationResult(result),
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /testgen/spec/:specId/preview
   * Get a preview of generated tests for a spec
   */
  async getTestPreview(
    req: Request<{ specId: string }, unknown, unknown, { maxOperations?: string }>,
    res: Response<ApiResponse<TestPreviewResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { specId } = req.params;
      const maxOperations = parseInt(req.query.maxOperations || '5', 10);

      // Get spec to determine available tags and operation count
      const spec = await this.specRepository.findById(specId);
      if (!spec) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Spec not found: ${specId}`,
          },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      // Generate a preview with limited operations
      const previewOperations = spec.operations.slice(0, maxOperations);
      
      // Generate tests for preview
      const result = await this.generateAxiosTestsUseCase.execute({
        specId,
        selection: {
          mode: 'full',
          exclude: spec.operations.slice(maxOperations).map(op => op.operationId),
        },
        options: {
          includeNegativeTests: true,
          includeAuthTests: true,
        },
      });

      // Collect all unique tags
      const allTags = new Set<string>();
      for (const op of spec.operations) {
        for (const tag of op.tags) {
          allTags.add(tag);
        }
      }

      const response: ApiResponse<TestPreviewResponseDto> = {
        success: true,
        data: {
          previewCode: result.code,
          estimatedTestCount: this.estimateTotalTests(spec.operations.length),
          estimatedOperationCount: spec.operations.length,
          availableTags: Array.from(allTags).sort(),
          sampleTestCases: result.testCases.slice(0, 10),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /testgen/export
   * Export generated tests as downloadable files
   */
  async exportTestSuite(
    req: Request<unknown, unknown, ExportTestSuiteRequestDto>,
    res: Response<ApiResponse<ExportTestSuiteResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { specId, selection, exportOptions, testOptions } = req.body;

      // First generate the tests
      const testResult = await this.generateAxiosTestsUseCase.execute({
        specId,
        selection,
        options: testOptions,
      });

      // Then export them
      const exportResult = await this.exportTestSuiteUseCase.execute({
        testResult,
        options: exportOptions,
      });

      const response: ApiResponse<ExportTestSuiteResponseDto> = {
        success: true,
        data: this.mapExportResult(exportResult),
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Map TestGenerationResult to DTO
   */
  private mapTestGenerationResult(result: TestGenerationResult): GenerateAxiosTestsResponseDto {
    return {
      code: result.code,
      fileName: result.fileName,
      specId: result.specId,
      specTitle: result.specTitle,
      testCount: result.testCount,
      operationCount: result.operationCount,
      testCases: result.testCases,
      generatedAt: result.generatedAt.toISOString(),
      options: result.options,
    };
  }

  /**
   * Map ExportResult to DTO
   */
  private mapExportResult(result: ExportResult): ExportTestSuiteResponseDto {
    return {
      format: result.format,
      files: result.files,
      totalSize: result.totalSize,
      exportedAt: result.exportedAt.toISOString(),
    };
  }

  /**
   * Estimate total tests based on operation count
   * (Assumes ~2-3 tests per operation on average)
   */
  private estimateTotalTests(operationCount: number): number {
    return operationCount * 2;
  }
}

/**
 * Factory function to create the controller
 */
export function createTestGenController(
  generateAxiosTestsUseCase: GenerateAxiosTestsUseCase,
  exportTestSuiteUseCase: ExportTestSuiteUseCase,
  specRepository: ISpecRepository
): TestGenController {
  return new TestGenController(
    generateAxiosTestsUseCase,
    exportTestSuiteUseCase,
    specRepository
  );
}
