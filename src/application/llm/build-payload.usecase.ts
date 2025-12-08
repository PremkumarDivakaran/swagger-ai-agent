/**
 * Build Payload Use Case
 * Orchestrates LLM-assisted payload generation from OpenAPI schemas
 */

import { 
  PayloadBuilderLlmClient, 
  createPayloadBuilderLlmClient,
  PayloadGenerationHints,
  GeneratedPayload,
  ILlmProvider 
} from '../../infrastructure/llm';
import { ISpecRepository } from '../../domain/repositories';
import { Operation } from '../../domain/models';

/**
 * Input for building a payload for a single operation
 */
export interface BuildPayloadInput {
  specId: string;
  operationId: string;
  hints?: PayloadGenerationHints;
}

/**
 * Input for building multiple payload variants
 */
export interface BuildPayloadVariantsInput {
  specId: string;
  operationId: string;
  count: number;
  hints?: PayloadGenerationHints;
}

/**
 * Input for suggesting test scenarios
 */
export interface SuggestScenariosInput {
  specId: string;
  operationId: string;
}

/**
 * Result of payload generation
 */
export interface PayloadGenerationResult {
  specId: string;
  specTitle: string;
  operationId: string;
  operationPath: string;
  operationMethod: string;
  payload: GeneratedPayload;
  generatedAt: string;
}

/**
 * Result of variant payload generation
 */
export interface PayloadVariantsResult {
  specId: string;
  specTitle: string;
  operationId: string;
  operationPath: string;
  operationMethod: string;
  payloads: GeneratedPayload[];
  count: number;
  generatedAt: string;
}

/**
 * Test scenario suggestion (simplified)
 * The LLM returns scenario descriptions as strings
 */
export interface TestScenarioSuggestion {
  /** Scenario description */
  description: string;
}

/**
 * Result of test scenario suggestions
 */
export interface SuggestScenariosResult {
  specId: string;
  specTitle: string;
  operationId: string;
  operationPath: string;
  operationMethod: string;
  scenarios: TestScenarioSuggestion[];
  generatedAt: string;
}

/**
 * Build Payload Use Case
 * Handles LLM-assisted payload generation with spec/operation lookup
 */
export class BuildPayloadUseCase {
  constructor(
    private payloadBuilder: PayloadBuilderLlmClient,
    private specRepository: ISpecRepository
  ) {}

  /**
   * Build a single payload for an operation
   */
  async buildPayload(input: BuildPayloadInput): Promise<PayloadGenerationResult> {
    const { specId, operationId, hints } = input;

    // Find spec and operation
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`);
    }

    const operation = spec.operations.find(op => op.operationId === operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId} in spec ${specId}`);
    }

    // Build payload using LLM client
    const payload = await this.payloadBuilder.buildPayload(operation, hints);

    return {
      specId,
      specTitle: spec.info.title,
      operationId: operation.operationId,
      operationPath: operation.path,
      operationMethod: operation.method.toUpperCase(),
      payload,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Build multiple payload variants for an operation
   */
  async buildPayloadVariants(input: BuildPayloadVariantsInput): Promise<PayloadVariantsResult> {
    const { specId, operationId, count, hints } = input;

    // Find spec and operation
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`);
    }

    const operation = spec.operations.find(op => op.operationId === operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId} in spec ${specId}`);
    }

    // Build variants using LLM client
    const payloads = await this.payloadBuilder.buildPayloadVariants(operation, count, hints);

    return {
      specId,
      specTitle: spec.info.title,
      operationId: operation.operationId,
      operationPath: operation.path,
      operationMethod: operation.method.toUpperCase(),
      payloads,
      count: payloads.length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Suggest test scenarios for an operation using LLM
   */
  async suggestScenarios(input: SuggestScenariosInput): Promise<SuggestScenariosResult> {
    const { specId, operationId } = input;

    // Find spec and operation
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`);
    }

    const operation = spec.operations.find(op => op.operationId === operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId} in spec ${specId}`);
    }

    // Get scenarios from LLM client
    const scenarios = await this.payloadBuilder.suggestTestScenarios(operation);

    return {
      specId,
      specTitle: spec.info.title,
      operationId: operation.operationId,
      operationPath: operation.path,
      operationMethod: operation.method.toUpperCase(),
      scenarios: scenarios.map(description => ({
        description,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * List available operations for a spec
   */
  async listOperations(specId: string): Promise<{
    specId: string;
    specTitle: string;
    operations: Array<{
      operationId: string;
      method: string;
      path: string;
      summary?: string;
      hasRequestBody: boolean;
    }>;
  }> {
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`);
    }

    return {
      specId,
      specTitle: spec.info.title,
      operations: spec.operations.map(op => ({
        operationId: op.operationId,
        method: op.method.toUpperCase(),
        path: op.path,
        summary: op.summary,
        hasRequestBody: !!op.requestBody,
      })),
    };
  }
}

/**
 * Factory function to create BuildPayloadUseCase
 */
export function createBuildPayloadUseCase(
  llmProvider: ILlmProvider,
  specRepository: ISpecRepository
): BuildPayloadUseCase {
  const payloadBuilder = createPayloadBuilderLlmClient(llmProvider);
  return new BuildPayloadUseCase(payloadBuilder, specRepository);
}

/**
 * Alternative factory for using existing PayloadBuilderLlmClient
 */
export function createBuildPayloadUseCaseWithClient(
  payloadBuilder: PayloadBuilderLlmClient,
  specRepository: ISpecRepository
): BuildPayloadUseCase {
  return new BuildPayloadUseCase(payloadBuilder, specRepository);
}
