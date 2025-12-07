/**
 * McpServer
 * MCP Server implementation for handling MCP protocol
 */

import { McpToolRegistry, McpToolDefinition } from './McpToolRegistry';
import { ILogger } from '../../logging/logger.interface';

/**
 * MCP Server configuration
 */
export interface McpServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Logger instance */
  logger?: ILogger;
}

/**
 * MCP message types
 */
export type McpMessageType = 
  | 'initialize'
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'prompts/list'
  | 'prompts/get';

/**
 * MCP request structure
 */
export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: McpMessageType;
  params?: Record<string, unknown>;
}

/**
 * MCP response structure
 */
export interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP Server class
 * Handles MCP protocol messages and tool execution
 */
export class McpServer {
  private config: McpServerConfig;
  private toolRegistry: McpToolRegistry;
  private logger?: ILogger;
  private initialized: boolean = false;

  constructor(config: McpServerConfig, toolRegistry?: McpToolRegistry) {
    this.config = config;
    this.toolRegistry = toolRegistry ?? new McpToolRegistry();
    this.logger = config.logger;
  }

  /**
   * Get the tool registry
   */
  getToolRegistry(): McpToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Register a tool
   * @param tool - Tool definition
   */
  registerTool(tool: McpToolDefinition): void {
    this.toolRegistry.register(tool);
    this.logger?.debug(`Registered MCP tool: ${tool.name}`);
  }

  /**
   * Register multiple tools
   * @param tools - Array of tool definitions
   */
  registerTools(tools: McpToolDefinition[]): void {
    this.toolRegistry.registerAll(tools);
    this.logger?.debug(`Registered ${tools.length} MCP tools`);
  }

  /**
   * Handle an MCP request
   * @param request - MCP request
   * @returns MCP response
   */
  async handleRequest(request: McpRequest): Promise<McpResponse> {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'tools/list':
          return this.handleToolsList(request);
        case 'tools/call':
          return this.handleToolsCall(request);
        case 'resources/list':
          return this.handleResourcesList(request);
        case 'resources/read':
          return this.handleResourcesRead(request);
        case 'prompts/list':
          return this.handlePromptsList(request);
        case 'prompts/get':
          return this.handlePromptsGet(request);
        default:
          return this.createErrorResponse(
            request.id,
            -32601,
            `Method not found: ${request.method}`
          );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error(`MCP request error: ${message}`);
      return this.createErrorResponse(request.id, -32603, message);
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(request: McpRequest): McpResponse {
    this.initialized = true;
    this.logger?.info(`MCP server initialized: ${this.config.name} v${this.config.version}`);

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
        },
      },
    };
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(request: McpRequest): McpResponse {
    const tools = this.toolRegistry.toMcpToolList();
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools,
      },
    };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(request: McpRequest): Promise<McpResponse> {
    const params = request.params as { name: string; arguments?: Record<string, unknown> } | undefined;
    
    if (!params?.name) {
      return this.createErrorResponse(request.id, -32602, 'Missing tool name');
    }

    const tool = this.toolRegistry.get(params.name);
    if (!tool) {
      return this.createErrorResponse(request.id, -32602, `Tool not found: ${params.name}`);
    }

    try {
      this.logger?.debug(`Executing MCP tool: ${params.name}`);
      const result = await tool.handler(params.arguments ?? {});
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      this.logger?.error(`MCP tool error (${params.name}): ${message}`);
      return this.createErrorResponse(request.id, -32603, message);
    }
  }

  /**
   * Handle resources/list request
   * TODO: Implement resource listing
   */
  private handleResourcesList(request: McpRequest): McpResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        resources: [],
      },
    };
  }

  /**
   * Handle resources/read request
   * TODO: Implement resource reading
   */
  private handleResourcesRead(request: McpRequest): McpResponse {
    return this.createErrorResponse(request.id, -32601, 'Resources not implemented');
  }

  /**
   * Handle prompts/list request
   * TODO: Implement prompt listing
   */
  private handlePromptsList(request: McpRequest): McpResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        prompts: [],
      },
    };
  }

  /**
   * Handle prompts/get request
   * TODO: Implement prompt retrieval
   */
  private handlePromptsGet(request: McpRequest): McpResponse {
    return this.createErrorResponse(request.id, -32601, 'Prompts not implemented');
  }

  /**
   * Create an error response
   */
  private createErrorResponse(
    id: string | number,
    code: number,
    message: string,
    data?: unknown
  ): McpResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get server info
   */
  getServerInfo(): { name: string; version: string } {
    return {
      name: this.config.name,
      version: this.config.version,
    };
  }
}

/**
 * Creates an McpServer instance
 * @param config - Server configuration
 * @param toolRegistry - Optional tool registry
 * @returns McpServer instance
 */
export function createMcpServer(config: McpServerConfig, toolRegistry?: McpToolRegistry): McpServer {
  return new McpServer(config, toolRegistry);
}
