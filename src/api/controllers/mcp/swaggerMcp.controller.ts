/**
 * Swagger MCP Controller
 * Handles HTTP requests for MCP-oriented Swagger operations
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../core/types';
import { McpToolDefinition } from '../../../infrastructure/mcp/common';
import {
  McpListOperationsRequestDto,
  McpListOperationsResponseDto,
  McpPlanRunRequestDto,
  McpPlanRunResponseDto,
  McpExecuteOperationRequestDto,
  McpExecuteOperationResponseDto,
} from '../../dto/mcp.dto';

/**
 * Swagger MCP Controller
 * Exposes MCP tools via HTTP endpoints
 */
export class SwaggerMcpController {
  private listOperationsTool: McpToolDefinition;
  private planRunTool: McpToolDefinition;
  private executeOperationTool: McpToolDefinition;

  constructor(
    listOperationsTool: McpToolDefinition,
    planRunTool: McpToolDefinition,
    executeOperationTool: McpToolDefinition
  ) {
    this.listOperationsTool = listOperationsTool;
    this.planRunTool = planRunTool;
    this.executeOperationTool = executeOperationTool;
  }

  /**
   * POST /mcp/swagger/list-operations
   * List operations from a spec (MCP-oriented)
   */
  async listOperations(
    req: Request<unknown, unknown, McpListOperationsRequestDto>,
    res: Response<ApiResponse<McpListOperationsResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.listOperationsTool.handler(req.body);

      const response: ApiResponse<McpListOperationsResponseDto> = {
        success: true,
        data: result as McpListOperationsResponseDto,
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
   * POST /mcp/swagger/plan-run
   * Create a run plan (MCP-oriented)
   */
  async planRun(
    req: Request<unknown, unknown, McpPlanRunRequestDto>,
    res: Response<ApiResponse<McpPlanRunResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.planRunTool.handler(req.body);

      const response: ApiResponse<McpPlanRunResponseDto> = {
        success: true,
        data: result as McpPlanRunResponseDto,
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
   * POST /mcp/swagger/execute-operation
   * Execute a single operation (MCP-oriented)
   */
  async executeOperation(
    req: Request<unknown, unknown, McpExecuteOperationRequestDto>,
    res: Response<ApiResponse<McpExecuteOperationResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.executeOperationTool.handler(req.body);

      const response: ApiResponse<McpExecuteOperationResponseDto> = {
        success: true,
        data: result as McpExecuteOperationResponseDto,
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
   * GET /mcp/swagger/tools
   * List available MCP tools
   */
  async listTools(
    _req: Request,
    res: Response<ApiResponse<{
      tools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>;
    }>>,
    _next: NextFunction
  ): Promise<void> {
    const tools = [
      this.listOperationsTool,
      this.planRunTool,
      this.executeOperationTool,
    ];

    const response: ApiResponse<{
      tools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>;
    }> = {
      success: true,
      data: {
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  }
}

/**
 * Factory function to create SwaggerMcpController
 */
export function createSwaggerMcpController(
  listOperationsTool: McpToolDefinition,
  planRunTool: McpToolDefinition,
  executeOperationTool: McpToolDefinition
): SwaggerMcpController {
  return new SwaggerMcpController(
    listOperationsTool,
    planRunTool,
    executeOperationTool
  );
}
