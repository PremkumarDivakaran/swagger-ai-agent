/**
 * ============================================================
 *  Planner Agent — Prompt Templates
 * ============================================================
 *
 *  Prompts used by PlannerAgent to analyze OpenAPI specs
 *  and generate test plans via the LLM.
 * ============================================================
 */

export const PLANNER_SYSTEM_PROMPT =
  'You are an API testing expert. Return only valid JSON. No markdown fences.';

/**
 * Build the main planning prompt.
 */
export function buildPlannerPrompt(specSummary: string): string {
  return `You are an expert API test architect. Analyze this OpenAPI specification and produce a REAL-WORLD API test plan.

## API Specification

${specSummary}

## Your Task

For EACH operation, generate:
- At least ONE positive (happy path) test
- At least TWO negative/validation tests
- Boundary scenarios when applicable

Test scenarios must reflect REAL usage patterns:
- Create → Retrieve → Update → Delete lifecycle
- Authentication failures (if relevant)
- Invalid body / missing required fields
- Invalid IDs, malformed inputs, boundary values

## Dynamic Test Data Rules (MANDATORY)

- NEVER use static data like "John", "test", or fixed IDs.
- Data must be generated dynamically at runtime.
- CRITICAL: Match field types to the Swagger/OpenAPI schema:
  - integer fields → use random integers (NOT UUIDs or strings)
  - number fields → use random doubles/floats
  - string fields → use random strings or UUIDs
  - boolean fields → use true/false
  - date-time fields → use timestamps
  - enum fields → use a valid enum value from the schema
- POST bodies should NOT contain server-generated fields like id.
- In suggestedBody, describe the correct data types (e.g., "petId: random int, quantity: random int").

## Assertions

Each item must include assertions that verify:
- status code
- key response fields
- response structure
- error structure for negative tests

## Output Format (STRICT JSON)

{
  "title": "Human-readable test plan title",
  "reasoning": "Short explanation of coverage strategy",
  "dependencies": [
    {
      "sourceOperationId": "createProduct",
      "targetOperationId": "getProductById",
      "dataFlow": "id from POST response used as path parameter"
    }
  ],
  "items": [
    {
      "operationId": "createProduct",
      "method": "POST",
      "path": "/products",
      "testDescription": "Create product with valid dynamic data",
      "category": "positive | negative | boundary | validation",
      "expectedStatus": 201,
      "dependsOn": [],
      "assertions": ["status code", "response has id", "field validation"],
      "needsBody": true,
      "dynamicDataStrategy": "Generate title using UUID and random price"
    }
  ]
}

## Rules
1. EVERY operation must appear in items.
2. Include both positive AND negative scenarios for each operation.
3. Model realistic dependency flows.
4. Do NOT use static request bodies.
5. Return ONLY valid JSON. No explanation outside JSON.`;
}
