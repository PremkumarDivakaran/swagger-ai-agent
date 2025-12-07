/**
 * McpToolRegistry
 * Registry for MCP tools
 */

/**
 * MCP Tool definition
 */
export interface McpToolDefinition {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema (JSON Schema) */
  inputSchema: Record<string, unknown>;
  /** Tool handler function */
  handler: (input: unknown) => Promise<unknown>;
}

/**
 * McpToolRegistry class
 * Manages registration and lookup of MCP tools
 */
export class McpToolRegistry {
  private tools: Map<string, McpToolDefinition> = new Map();

  /**
   * Register a tool
   * @param tool - Tool definition
   */
  register(tool: McpToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools
   * @param tools - Array of tool definitions
   */
  registerAll(tools: McpToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool
   * @param name - Tool name
   * @returns true if tool was unregistered
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   * @param name - Tool name
   * @returns Tool definition or undefined
   */
  get(name: string): McpToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   * @param name - Tool name
   * @returns true if registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   * @returns Array of tool definitions
   */
  getAll(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool count
   * @returns Number of registered tools
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Execute a tool
   * @param name - Tool name
   * @param input - Tool input
   * @returns Tool output
   */
  async execute(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    return tool.handler(input);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tools as MCP-compatible list
   * @returns Array of tool definitions for MCP
   */
  toMcpToolList(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }> {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }
}

/**
 * Creates an McpToolRegistry instance
 * @returns McpToolRegistry instance
 */
export function createMcpToolRegistry(): McpToolRegistry {
  return new McpToolRegistry();
}
