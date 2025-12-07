/**
 * Environment Controller
 * Handles HTTP requests for environment management
 */

import { Request, Response, NextFunction } from 'express';
import {
  CreateEnvironmentUseCase,
  GetEnvironmentUseCase,
  UpdateEnvironmentUseCase,
  DeleteEnvironmentUseCase,
} from '../../application/environment';
import {
  CreateEnvironmentRequestDto,
  CreateEnvironmentResponseDto,
  UpdateEnvironmentRequestDto,
  UpdateEnvironmentResponseDto,
  EnvironmentDetailsResponseDto,
  ListEnvironmentsResponseDto,
  DeleteEnvironmentResponseDto,
} from '../dto/environment.dto';

/**
 * EnvironmentController class
 * Handles all environment-related HTTP endpoints
 */
export class EnvironmentController {
  constructor(
    private readonly createEnvironmentUseCase: CreateEnvironmentUseCase,
    private readonly getEnvironmentUseCase: GetEnvironmentUseCase,
    private readonly updateEnvironmentUseCase: UpdateEnvironmentUseCase,
    private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase
  ) {}

  /**
   * Create a new environment
   * POST /environment
   */
  createEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as CreateEnvironmentRequestDto;

      const result = await this.createEnvironmentUseCase.execute({
        specId: body.specId,
        name: body.name,
        baseUrl: body.baseUrl,
        defaultHeaders: body.defaultHeaders,
        authConfig: body.authConfig,
        timeout: body.timeout,
        verifySsl: body.verifySsl,
        variables: body.variables,
        isDefault: body.isDefault,
        description: body.description,
      });

      const response: CreateEnvironmentResponseDto = {
        envId: result.envId,
        specId: result.specId,
        name: result.name,
        baseUrl: result.baseUrl,
        isDefault: result.isDefault,
        createdAt: result.createdAt.toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get environment by ID
   * GET /environment/:envId
   */
  getEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { envId } = req.params;

      const result = await this.getEnvironmentUseCase.getById({ envId });

      const response: EnvironmentDetailsResponseDto = {
        id: result.id,
        specId: result.specId,
        name: result.name,
        baseUrl: result.baseUrl,
        defaultHeaders: result.defaultHeaders,
        authType: result.authType,
        hasAuth: result.hasAuth,
        timeout: result.timeout,
        verifySsl: result.verifySsl,
        isDefault: result.isDefault,
        description: result.description,
        variableNames: result.variableNames,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List environments for a spec
   * GET /spec/:specId/environments
   */
  listEnvironments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { specId } = req.params;

      const result = await this.getEnvironmentUseCase.listBySpec({ specId });

      const response: ListEnvironmentsResponseDto = {
        specId: result.specId,
        environments: result.environments.map(env => ({
          id: env.id,
          specId: env.specId,
          name: env.name,
          baseUrl: env.baseUrl,
          defaultHeaders: env.defaultHeaders,
          authType: env.authType,
          hasAuth: env.hasAuth,
          timeout: env.timeout,
          verifySsl: env.verifySsl,
          isDefault: env.isDefault,
          description: env.description,
          variableNames: env.variableNames,
          createdAt: env.createdAt.toISOString(),
          updatedAt: env.updatedAt.toISOString(),
        })),
        total: result.total,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an environment
   * PUT /environment/:envId
   */
  updateEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { envId } = req.params;
      const body = req.body as UpdateEnvironmentRequestDto;

      const result = await this.updateEnvironmentUseCase.execute({
        envId,
        baseUrl: body.baseUrl,
        defaultHeaders: body.defaultHeaders,
        authConfig: body.authConfig,
        timeout: body.timeout,
        verifySsl: body.verifySsl,
        variables: body.variables,
        isDefault: body.isDefault,
        description: body.description,
      });

      const response: UpdateEnvironmentResponseDto = {
        envId: result.envId,
        specId: result.specId,
        name: result.name,
        baseUrl: result.baseUrl,
        isDefault: result.isDefault,
        updatedAt: result.updatedAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete an environment
   * DELETE /environment/:envId
   */
  deleteEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { envId } = req.params;

      const result = await this.deleteEnvironmentUseCase.execute({ envId });

      const response: DeleteEnvironmentResponseDto = {
        envId: result.envId,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
