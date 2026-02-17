/**
 * ============================================================
 *  Planner Agent — Prompt Templates
 * ============================================================
 *
 *  Prompts used by PlannerAgent to analyze OpenAPI specs
 *  and generate positive test plans via the LLM.
 * ============================================================
 */

export const PLANNER_SYSTEM_PROMPT =
  'You are an API testing expert. Return only valid JSON. No markdown fences.';

/**
 * Build the main planning prompt.
 * The LLM receives the spec summary and returns a JSON test plan
 * with positive tests, dependencies, and realistic request bodies.
 */
export function buildPlannerPrompt(specSummary: string): string {
  return `You are an expert API test architect. Analyze this OpenAPI specification and produce a test plan for POSITIVE (happy path) scenarios.

## API Specification

${specSummary}

## Your Task

For EACH operation, create ONE positive test with:
- Realistic request body (for POST/PUT/PATCH)
- Meaningful assertions (check response fields, not just status)
- Correct dependencies (e.g., POST before GET-by-id)

Return a JSON object:
{
  "title": "Human-readable test plan title",
  "reasoning": "2-3 sentences explaining your test strategy",
  "dependencies": [
    {
      "sourceOperationId": "createProduct",
      "targetOperationId": "getProductById",
      "dataFlow": "id from POST response used as {id} path parameter"
    }
  ],
  "items": [
    {
      "operationId": "createProduct",
      "method": "POST",
      "path": "/products",
      "testDescription": "Create a new product with valid data",
      "category": "positive",
      "expectedStatus": 200,
      "dependsOn": [],
      "assertions": ["status 200", "response has id"],
      "needsBody": true,
      "suggestedBody": "{\\"title\\":\\"Wireless Mouse\\",\\"price\\":29.99,\\"description\\":\\"Ergonomic wireless mouse\\",\\"category\\":\\"electronics\\"}"
    }
  ]
}

## Rules
1. One positive test per operation — I will add negative/edge tests separately
2. For POST/PUT/PATCH, always include a realistic suggestedBody (valid JSON as escaped string)
3. For POST, do NOT include "id" in suggestedBody (the API generates it)
4. Include meaningful assertions (not just status code — check response fields)
5. Identify ALL dependencies (data flowing from one operation to another)
6. EVERY operation in the spec MUST appear in items
7. Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;
}
