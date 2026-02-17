/**
 * ============================================================
 *  Planner Agent
 * ============================================================
 *
 *  WHAT IT DOES:
 *    Takes the OpenAPI spec and produces a comprehensive test plan.
 *
 *    HYBRID APPROACH:
 *    1. LLM generates: positive tests with realistic bodies,
 *       operation dependencies, and smart assertions
 *    2. CODE generates: negative tests, edge cases, and validation
 *       tests — these are deterministic and we don't trust the LLM
 *       to generate enough of them
 *
 *    This guarantees comprehensive coverage (3-5 tests per operation)
 *    while using the LLM where it adds real value.
 *
 *  INPUT:  NormalizedSpec (operations, schemas, servers)
 *  OUTPUT: AgentTestPlan (ordered items + dependencies + reasoning)
 *
 * ============================================================
 */

import { LlmRouter } from '../../infrastructure/llm';
import { NormalizedSpec, getDefaultServerUrl } from '../../domain/models/NormalizedSpec';
import { Operation } from '../../domain/models/Operation';
import type { AgentTestPlan, TestPlanItem, OperationDependency, TestCategory } from './types';
import { buildPlannerPrompt, PLANNER_SYSTEM_PROMPT } from '../../prompts';

export class PlannerAgent {
  constructor(private readonly llm: LlmRouter) {}

  /**
   * Analyze the spec and produce a test plan.
   * Step 1: LLM generates positive tests + dependencies
   * Step 2: Code generates negative + edge-case tests per operation
   */
  async plan(spec: NormalizedSpec): Promise<AgentTestPlan> {
    const operations = spec.operations;
    const baseUrl = getDefaultServerUrl(spec) || 'https://example.com';

    // ── Step 1: LLM generates positive tests + dependencies ──
    const llmPlan = await this.llmPlan(operations, spec, baseUrl);

    // ── Step 2: Programmatically add negative + edge-case tests ──
    const negativeTests = this.generateNegativeTests(operations);
    const edgeCaseTests = this.generateEdgeCaseTests(operations);

    // Merge: positive first (from LLM), then negative, then edge
    const allItems = [
      ...llmPlan.items,
      ...negativeTests,
      ...edgeCaseTests,
    ];

    // Re-number priorities
    allItems.forEach((item, i) => { item.priority = i + 1; });

    return {
      ...llmPlan,
      items: allItems,
      reasoning: `${llmPlan.reasoning} Additionally, ${negativeTests.length} negative tests and ${edgeCaseTests.length} edge-case tests were auto-generated for comprehensive coverage.`,
    };
  }

  /**
   * Ask the LLM for positive tests, dependencies, and realistic request bodies.
   * This is what the LLM is good at — understanding semantics and data flow.
   */
  private async llmPlan(operations: Operation[], spec: NormalizedSpec, baseUrl: string): Promise<AgentTestPlan> {
    const specSummary = this.buildSpecSummary(operations, spec);
    const prompt = buildPlannerPrompt(specSummary);

    const response = await this.llm.generate({
      prompt,
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 6000,
    });

    return this.parseResponse(response.content, operations, baseUrl);
  }

  // ──────────────────────────────────────────────
  //  Programmatic negative test generation
  // ──────────────────────────────────────────────

  /**
   * Generate negative tests for EVERY operation.
   * These are deterministic — no LLM needed.
   */
  private generateNegativeTests(operations: Operation[]): TestPlanItem[] {
    const tests: TestPlanItem[] = [];

    for (const op of operations) {
      const method = op.method.toUpperCase();
      const hasPathParam = op.path.includes('{');
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

      // ── Test 1: Non-existent ID for path-param operations ──
      if (hasPathParam) {
        tests.push({
          operationId: `${op.operationId}_nonExistentId`,
          method: op.method,
          path: op.path.replace(/\{[^}]+\}/g, '99999'),
          testDescription: `${method} ${op.path} with non-existent ID should return error or empty`,
          category: 'negative',
          expectedStatus: 404,
          priority: 100,
          dependsOn: [],
          assertions: ['status 404 or null/empty response'],
          needsBody: hasBody,
          suggestedBody: hasBody ? '{"title":"test"}' : undefined,
        });
      }

      // ── Test 2: Empty body for body-requiring operations ──
      if (hasBody) {
        tests.push({
          operationId: `${op.operationId}_emptyBody`,
          method: op.method,
          path: hasPathParam ? op.path.replace(/\{[^}]+\}/g, '1') : op.path,
          testDescription: `${method} ${op.path} with empty body should handle gracefully`,
          category: 'negative',
          expectedStatus: 400,
          priority: 101,
          dependsOn: [],
          assertions: ['status 400 or 200 (mock API may accept empty)'],
          needsBody: true,
          suggestedBody: '{}',
        });
      }

      // ── Test 3: Invalid data types for body operations ──
      if (hasBody) {
        tests.push({
          operationId: `${op.operationId}_invalidTypes`,
          method: op.method,
          path: hasPathParam ? op.path.replace(/\{[^}]+\}/g, '1') : op.path,
          testDescription: `${method} ${op.path} with invalid field types should handle gracefully`,
          category: 'negative',
          expectedStatus: 400,
          priority: 102,
          dependsOn: [],
          assertions: ['status 400 or 200 (mock API may accept)'],
          needsBody: true,
          suggestedBody: '{"title":12345,"price":"not-a-number","description":true}',
        });
      }

      // ── Test 4: String ID instead of number for path-param operations ──
      if (hasPathParam) {
        tests.push({
          operationId: `${op.operationId}_invalidIdFormat`,
          method: op.method,
          path: op.path.replace(/\{[^}]+\}/g, 'abc'),
          testDescription: `${method} ${op.path} with string ID instead of number`,
          category: 'negative',
          expectedStatus: 400,
          priority: 103,
          dependsOn: [],
          assertions: ['status 400 or 404 or error response'],
          needsBody: hasBody,
          suggestedBody: hasBody ? '{"title":"test"}' : undefined,
        });
      }
    }

    return tests;
  }

  // ──────────────────────────────────────────────
  //  Programmatic edge-case test generation
  // ──────────────────────────────────────────────

  /**
   * Generate edge-case tests per operation type.
   */
  private generateEdgeCaseTests(operations: Operation[]): TestPlanItem[] {
    const tests: TestPlanItem[] = [];

    for (const op of operations) {
      const method = op.method.toUpperCase();
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
      const hasPathParam = op.path.includes('{');
      const isListEndpoint = method === 'GET' && !hasPathParam;

      // ── Edge 1: Boundary ID values for path-param operations ──
      if (hasPathParam) {
        tests.push({
          operationId: `${op.operationId}_zeroId`,
          method: op.method,
          path: op.path.replace(/\{[^}]+\}/g, '0'),
          testDescription: `${method} ${op.path} with id=0 (boundary)`,
          category: 'edge-case',
          expectedStatus: 400,
          priority: 200,
          dependsOn: [],
          assertions: ['status 400 or 404 or error'],
          needsBody: hasBody,
          suggestedBody: hasBody ? '{"title":"edge test"}' : undefined,
        });

        tests.push({
          operationId: `${op.operationId}_negativeId`,
          method: op.method,
          path: op.path.replace(/\{[^}]+\}/g, '-1'),
          testDescription: `${method} ${op.path} with negative id`,
          category: 'edge-case',
          expectedStatus: 400,
          priority: 201,
          dependsOn: [],
          assertions: ['status 400 or 404 or error'],
          needsBody: hasBody,
          suggestedBody: hasBody ? '{"title":"edge test"}' : undefined,
        });
      }

      // ── Edge 2: Special characters in body for POST/PUT ──
      if (hasBody && method === 'POST') {
        tests.push({
          operationId: `${op.operationId}_specialChars`,
          method: op.method,
          path: op.path,
          testDescription: `${method} ${op.path} with special characters in fields`,
          category: 'edge-case',
          expectedStatus: 200,
          priority: 202,
          dependsOn: [],
          assertions: ['status 200 or 201', 'response has id'],
          needsBody: true,
          suggestedBody: '{"title":"Test <script>alert(1)</script>","price":0,"description":"O\'Reilly & Sons \\"quoted\\""}',
        });
      }

      // ── Edge 3: Query param limits for list endpoints ──
      if (isListEndpoint) {
        tests.push({
          operationId: `${op.operationId}_limitParam`,
          method: op.method,
          path: `${op.path}?limit=1`,
          testDescription: `${method} ${op.path} with limit=1 should return single item`,
          category: 'edge-case',
          expectedStatus: 200,
          priority: 203,
          dependsOn: [],
          assertions: ['status 200', 'response array size <= 1 or response is valid'],
          needsBody: false,
        });
      }
    }

    return tests;
  }

  // ──────────────────────────────────────────────
  //  Spec summary builder (for LLM prompt)
  // ──────────────────────────────────────────────

  private buildSpecSummary(operations: Operation[], spec: NormalizedSpec): string {
    const lines: string[] = [];
    lines.push(`API: ${spec.info?.title || 'Unknown API'}`);
    lines.push(`Base URL: ${getDefaultServerUrl(spec) || 'unknown'}`);
    lines.push('');
    lines.push('### Operations');
    for (const op of operations) {
      lines.push(`- ${op.method} ${op.path} (operationId: ${op.operationId})`);
      if (op.summary) lines.push(`  Summary: ${op.summary}`);
      if (op.parameters.length > 0) {
        const params = op.parameters.map(p => `${p.name} (${p.in}, ${p.required ? 'required' : 'optional'})`);
        lines.push(`  Parameters: ${params.join(', ')}`);
      }
      if (op.requestBody) {
        const schema = op.requestBody.content?.['application/json']?.schema;
        if (schema) {
          lines.push(`  Request body schema: ${JSON.stringify(schema, null, 2).substring(0, 500)}`);
        }
      }
      if (op.responses.length > 0) {
        const codes = op.responses.map(r => r.statusCode).join(', ');
        lines.push(`  Response codes: ${codes}`);
      }
      lines.push('');
    }

    if (spec.schemas && Object.keys(spec.schemas).length > 0) {
      lines.push('### Schemas');
      for (const [name, schema] of Object.entries(spec.schemas)) {
        const schemaStr = JSON.stringify(schema, null, 2).substring(0, 400);
        lines.push(`${name}: ${schemaStr}`);
      }
    }

    return lines.join('\n');
  }

  // ──────────────────────────────────────────────
  //  Response parser + fallback
  // ──────────────────────────────────────────────

  private parseResponse(raw: string, operations: Operation[], baseUrl: string): AgentTestPlan {
    let content = raw.trim();
    if (content.startsWith('```')) {
      content = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }

    try {
      const parsed = JSON.parse(content);
      return {
        title: parsed.title || 'API Test Plan',
        baseUrl,
        items: (parsed.items || []).map((item: any) => ({
          operationId: item.operationId,
          method: item.method,
          path: item.path,
          testDescription: item.testDescription || `Test ${item.method} ${item.path}`,
          category: (item.category || 'positive') as TestCategory,
          expectedStatus: item.expectedStatus || 200,
          priority: item.priority || 99,
          dependsOn: item.dependsOn || [],
          assertions: item.assertions || [`status ${item.expectedStatus || 200}`],
          needsBody: item.needsBody || false,
          suggestedBody: item.suggestedBody,
        })),
        dependencies: (parsed.dependencies || []).map((dep: any) => ({
          sourceOperationId: dep.sourceOperationId,
          targetOperationId: dep.targetOperationId,
          dataFlow: dep.dataFlow || '',
        })),
        reasoning: parsed.reasoning || '',
      };
    } catch (err) {
      console.warn('[PlannerAgent] Failed to parse LLM response, using fallback plan');
      return this.fallbackPlan(operations, baseUrl);
    }
  }

  private fallbackPlan(operations: Operation[], baseUrl: string): AgentTestPlan {
    const items: TestPlanItem[] = operations.map((op, i) => ({
      operationId: op.operationId,
      method: op.method,
      path: op.path,
      testDescription: `Test ${op.method} ${op.path} with valid data`,
      category: 'positive' as TestCategory,
      expectedStatus: 200,
      priority: i + 1,
      dependsOn: [],
      assertions: [`status 200`],
      needsBody: ['POST', 'PUT', 'PATCH'].includes(op.method),
    }));
    return {
      title: 'API Test Plan (fallback)',
      baseUrl,
      items,
      dependencies: [],
      reasoning: 'LLM was unavailable; this is a basic positive-only plan from the spec.',
    };
  }
}
