/**
 * Execution Controller
 * Handles HTTP requests for execution API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../core/types';
import {
  CreateRunPlanUseCase,
  ExecuteRunUseCase,
  GetRunStatusUseCase,
  RetryFailedUseCase,
} from '../../application/execution';
import {
  CreateRunPlanRequestDTO,
  CreateRunPlanResponseDTO,
  ExecuteRunRequestDTO,
  ExecuteRunResponseDTO,
  GetRunStatusResponseDTO,
  RetryFailedRequestDTO,
  RetryFailedResponseDTO,
  toCreateRunPlanResponseDTO,
  toExecuteRunResponseDTO,
  toGetRunStatusResponseDTO,
  toRetryFailedResponseDTO,
} from '../dto/execution.dto';

/**
 * Dependencies for ExecutionController
 */
export interface ExecutionControllerDependencies {
  createRunPlanUseCase: CreateRunPlanUseCase;
  executeRunUseCase: ExecuteRunUseCase;
  getRunStatusUseCase: GetRunStatusUseCase;
  retryFailedUseCase: RetryFailedUseCase;
}

/**
 * ExecutionController class
 * Handles execution API requests
 */
export class ExecutionController {
  constructor(private readonly deps: ExecutionControllerDependencies) {}

  /**
   * POST /execution/plan
   * Creates a new run plan
   */
  createRunPlan = async (
    req: Request<{}, {}, CreateRunPlanRequestDTO>,
    res: Response<ApiResponse<CreateRunPlanResponseDTO>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.deps.createRunPlanUseCase.execute({
        specId: req.body.specId,
        envName: req.body.envName,
        selection: req.body.selection,
        description: req.body.description,
        config: req.body.config,
      });

      const response: ApiResponse<CreateRunPlanResponseDTO> = {
        success: true,
        data: toCreateRunPlanResponseDTO(result),
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /execution/run
   * Executes a run plan
   */
  executeRun = async (
    req: Request<{}, {}, ExecuteRunRequestDTO>,
    res: Response<ApiResponse<ExecuteRunResponseDTO>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.deps.executeRunUseCase.execute({
        runId: req.body.runId,
        specId: req.body.specId,
        envName: req.body.envName,
        selection: req.body.selection,
      });

      const response: ApiResponse<ExecuteRunResponseDTO> = {
        success: true,
        data: toExecuteRunResponseDTO(result),
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /execution/status/:runId
   * Gets the status of a run
   */
  getRunStatus = async (
    req: Request<{ runId: string }, {}, {}, { includeDetails?: string }>,
    res: Response<ApiResponse<GetRunStatusResponseDTO>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const includeDetails = req.query.includeDetails === 'true';

      const result = await this.deps.getRunStatusUseCase.execute({
        runId: req.params.runId,
        includeDetails,
      });

      const response: ApiResponse<GetRunStatusResponseDTO> = {
        success: true,
        data: toGetRunStatusResponseDTO(result),
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /execution/retry-failed
   * Retries failed tests from a previous run
   */
  retryFailed = async (
    req: Request<{}, {}, RetryFailedRequestDTO>,
    res: Response<ApiResponse<RetryFailedResponseDTO>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.deps.retryFailedUseCase.execute({
        runId: req.body.runId,
      });

      const response: ApiResponse<RetryFailedResponseDTO> = {
        success: true,
        data: toRetryFailedResponseDTO(result),
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Factory function to create ExecutionController
 */
export function createExecutionController(
  deps: ExecutionControllerDependencies
): ExecutionController {
  return new ExecutionController(deps);
}
