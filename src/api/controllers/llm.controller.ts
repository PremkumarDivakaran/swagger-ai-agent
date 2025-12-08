/**
 * LLM Controller
 * Handles HTTP requests for LLM-assisted payload generation endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../core/types';
import {
  BuildPayloadUseCase,
} from '../../application/llm';
import { ILlmProvider } from '../../infrastructure/llm';
import {
  BuildPayloadRequestDto,
  BuildPayloadResponseDto,
  BuildPayloadVariantsRequestDto,
  BuildPayloadVariantsResponseDto,
  SuggestScenariosRequestDto,
  SuggestScenariosResponseDto,
  LlmListOperationsResponseDto,
  LlmProviderStatusDto,
} from '../dto/llm.dto';

/**
 * LLM Controller
 * Thin controller that delegates to use cases
 */
export class LlmController {
  constructor(
    private buildPayloadUseCase: BuildPayloadUseCase,
    private llmProvider: ILlmProvider
  ) {}

  /**
   * POST /llm/build-payload
   * Generate a payload for an operation using LLM
   */
  async buildPayload(
    req: Request<unknown, unknown, BuildPayloadRequestDto>,
    res: Response<ApiResponse<BuildPayloadResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { specId, operationId, hints } = req.body;

      const result = await this.buildPayloadUseCase.buildPayload({
        specId,
        operationId,
        hints,
      });

      const response: ApiResponse<BuildPayloadResponseDto> = {
        success: true,
        data: {
          specId: result.specId,
          specTitle: result.specTitle,
          operationId: result.operationId,
          operationPath: result.operationPath,
          operationMethod: result.operationMethod,
          payload: {
            payload: result.payload.payload,
            explanation: result.payload.explanation,
            confidence: result.payload.confidence,
          },
          generatedAt: result.generatedAt,
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
   * POST /llm/build-payload-variants
   * Generate multiple payload variants for an operation using LLM
   */
  async buildPayloadVariants(
    req: Request<unknown, unknown, BuildPayloadVariantsRequestDto>,
    res: Response<ApiResponse<BuildPayloadVariantsResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { specId, operationId, count, hints } = req.body;

      const result = await this.buildPayloadUseCase.buildPayloadVariants({
        specId,
        operationId,
        count,
        hints,
      });

      const response: ApiResponse<BuildPayloadVariantsResponseDto> = {
        success: true,
        data: {
          specId: result.specId,
          specTitle: result.specTitle,
          operationId: result.operationId,
          operationPath: result.operationPath,
          operationMethod: result.operationMethod,
          payloads: result.payloads.map(p => ({
            payload: p.payload,
            explanation: p.explanation,
            confidence: p.confidence,
          })),
          count: result.count,
          generatedAt: result.generatedAt,
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
   * POST /llm/suggest-scenarios
   * Suggest test scenarios for an operation using LLM
   */
  async suggestScenarios(
    req: Request<unknown, unknown, SuggestScenariosRequestDto>,
    res: Response<ApiResponse<SuggestScenariosResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { specId, operationId } = req.body;

      const result = await this.buildPayloadUseCase.suggestScenarios({
        specId,
        operationId,
      });

      const response: ApiResponse<SuggestScenariosResponseDto> = {
        success: true,
        data: {
          specId: result.specId,
          specTitle: result.specTitle,
          operationId: result.operationId,
          operationPath: result.operationPath,
          operationMethod: result.operationMethod,
          scenarios: result.scenarios,
          generatedAt: result.generatedAt,
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
   * GET /llm/spec/:specId/operations
   * List operations available for payload generation
   */
  async listOperations(
    req: Request<{ specId: string }>,
    res: Response<ApiResponse<LlmListOperationsResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { specId } = req.params;

      const result = await this.buildPayloadUseCase.listOperations(specId);

      const response: ApiResponse<LlmListOperationsResponseDto> = {
        success: true,
        data: {
          specId: result.specId,
          specTitle: result.specTitle,
          operations: result.operations,
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
   * GET /llm/status
   * Check LLM provider status
   */
  async getStatus(
    _req: Request,
    res: Response<ApiResponse<LlmProviderStatusDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const available = await this.llmProvider.isAvailable();
      const models = this.llmProvider.getAvailableModels?.() || [];

      const response: ApiResponse<LlmProviderStatusDto> = {
        success: true,
        data: {
          provider: 'groq',
          available,
          models,
          error: available ? undefined : 'LLM provider is not available. Check API key configuration.',
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
}

/**
 * Factory function to create LlmController
 */
export function createLlmController(
  buildPayloadUseCase: BuildPayloadUseCase,
  llmProvider: ILlmProvider
): LlmController {
  return new LlmController(buildPayloadUseCase, llmProvider);
}
