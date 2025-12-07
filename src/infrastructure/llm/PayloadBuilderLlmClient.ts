/**
 * PayloadBuilderLlmClient
 * Uses LLM to generate request payloads from schemas
 */

import {
  ILlmProvider,
  LlmCompletionOptions,
} from './LlmProvider.interface';
import { Operation } from '../../domain/models';

/**
 * Payload generation hints
 */
export interface PayloadGenerationHints {
  /** Locale for data (e.g., 'IN', 'US') */
  locale?: string;
  /** Domain context (e.g., 'banking', 'healthcare') */
  domain?: string;
  /** Additional context */
  context?: string;
  /** Example values */
  examples?: Record<string, unknown>;
}

/**
 * Generated payload result
 */
export interface GeneratedPayload {
  /** Generated payload */
  payload: Record<string, unknown>;
  /** Explanation of the payload */
  explanation?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * PayloadBuilderLlmClient class
 * Generates request payloads using LLM
 */
export class PayloadBuilderLlmClient {
  private provider: ILlmProvider;

  constructor(provider: ILlmProvider) {
    this.provider = provider;
  }

  /**
   * Build a request payload from operation schema
   * @param operation - Operation definition
   * @param hints - Generation hints
   * @returns Generated payload
   */
  async buildPayload(
    operation: Operation,
    hints?: PayloadGenerationHints
  ): Promise<GeneratedPayload> {
    if (!operation.requestBody?.content) {
      return {
        payload: {},
        explanation: 'No request body defined for this operation',
        confidence: 1.0,
      };
    }

    // Get the JSON schema from request body
    const jsonContent = operation.requestBody.content['application/json'];
    if (!jsonContent?.schema) {
      return {
        payload: {},
        explanation: 'No JSON schema defined for request body',
        confidence: 1.0,
      };
    }

    const schema = jsonContent.schema;
    const prompt = this.buildPrompt(operation, schema, hints);

    try {
      const response = await this.provider.generateJson<{
        payload: Record<string, unknown>;
        explanation?: string;
      }>(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
        responseFormat: 'json',
      });

      return {
        payload: response.payload || {},
        explanation: response.explanation,
        confidence: 0.85,
      };
    } catch {
      // Fallback to schema-based generation
      const fallbackPayload = this.generateFromSchema(schema);
      return {
        payload: fallbackPayload,
        explanation: 'Generated from schema (LLM unavailable)',
        confidence: 0.5,
      };
    }
  }

  /**
   * Build multiple payload variants
   * @param operation - Operation definition
   * @param count - Number of variants to generate
   * @param hints - Generation hints
   * @returns Array of generated payloads
   */
  async buildPayloadVariants(
    operation: Operation,
    count: number = 3,
    hints?: PayloadGenerationHints
  ): Promise<GeneratedPayload[]> {
    const results: GeneratedPayload[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.buildPayload(operation, {
        ...hints,
        context: `${hints?.context || ''} (variant ${i + 1} of ${count})`,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Suggest test scenarios for an operation
   * @param operation - Operation definition
   * @returns Array of test scenario descriptions
   */
  async suggestTestScenarios(operation: Operation): Promise<string[]> {
    const prompt = `
Given this API operation:
- Method: ${operation.method}
- Path: ${operation.path}
- Summary: ${operation.summary || 'N/A'}
- Description: ${operation.description || 'N/A'}
- Has Request Body: ${operation.requestBody ? 'Yes' : 'No'}
- Parameters: ${operation.parameters.map(p => `${p.name} (${p.in}, ${p.required ? 'required' : 'optional'})`).join(', ') || 'None'}

Suggest 5-7 test scenarios that should be covered. Include:
1. Happy path scenarios
2. Validation error scenarios
3. Edge cases
4. Security-related scenarios (if applicable)

Return as a JSON array of strings, each describing one test scenario.
`;

    try {
      const scenarios = await this.provider.generateJson<string[]>(prompt, {
        temperature: 0.8,
        maxTokens: 1000,
        responseFormat: 'json',
      });
      return scenarios;
    } catch {
      // Return default scenarios
      return [
        'Happy path with valid data',
        'Missing required fields',
        'Invalid field types',
        'Empty request body',
        'Boundary value testing',
      ];
    }
  }

  /**
   * Build prompt for payload generation
   */
  private buildPrompt(
    operation: Operation,
    schema: Record<string, unknown>,
    hints?: PayloadGenerationHints
  ): string {
    let prompt = `
Generate a realistic request payload for this API operation:

Operation: ${operation.method} ${operation.path}
Summary: ${operation.summary || 'N/A'}
Description: ${operation.description || 'N/A'}

JSON Schema:
${JSON.stringify(schema, null, 2)}
`;

    if (hints?.locale) {
      prompt += `\nLocale: ${hints.locale} (use appropriate data for this locale)`;
    }

    if (hints?.domain) {
      prompt += `\nDomain: ${hints.domain} (use realistic data for this domain)`;
    }

    if (hints?.context) {
      prompt += `\nAdditional Context: ${hints.context}`;
    }

    if (hints?.examples) {
      prompt += `\nExample Values: ${JSON.stringify(hints.examples)}`;
    }

    prompt += `

Return a JSON object with:
- "payload": the generated request body
- "explanation": brief explanation of the values chosen

Make the data realistic and valid according to the schema.
`;

    return prompt;
  }

  /**
   * Generate payload from schema without LLM
   * @param schema - JSON Schema
   * @returns Generated payload
   */
  private generateFromSchema(schema: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (schema.type !== 'object' || !schema.properties) {
      return result;
    }

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const required = (schema.required as string[]) || [];

    for (const [key, propSchema] of Object.entries(properties)) {
      if (required.includes(key)) {
        result[key] = this.generateValueFromSchema(propSchema);
      }
    }

    return result;
  }

  /**
   * Generate a value from a property schema
   */
  private generateValueFromSchema(schema: Record<string, unknown>): unknown {
    // Use example if available
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Use default if available
    if (schema.default !== undefined) {
      return schema.default;
    }

    // Generate based on type
    switch (schema.type) {
      case 'string':
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'date') return '2024-01-01';
        if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
        if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
        if (schema.enum && Array.isArray(schema.enum)) return schema.enum[0];
        return 'string';
      
      case 'number':
      case 'integer':
        if (schema.minimum !== undefined) return schema.minimum;
        return 0;
      
      case 'boolean':
        return true;
      
      case 'array':
        return [];
      
      case 'object':
        return {};
      
      default:
        return null;
    }
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }
}

/**
 * Creates a PayloadBuilderLlmClient instance
 * @param provider - LLM provider
 * @returns PayloadBuilderLlmClient instance
 */
export function createPayloadBuilderLlmClient(provider: ILlmProvider): PayloadBuilderLlmClient {
  return new PayloadBuilderLlmClient(provider);
}
