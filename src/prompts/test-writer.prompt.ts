/**
 * ============================================================
 *  Test Writer Agent — Prompt Templates
 * ============================================================
 *
 *  Prompts used by TestWriterAgent to generate and rewrite
 *  Java REST Assured test classes via the LLM.
 * ============================================================
 */

export const WRITE_TEST_CLASS_SYSTEM_PROMPT =
  'You are a senior Java test engineer. Return ONLY compilable Java code. No markdown. No explanations.';

export const REWRITE_TEST_CLASS_SYSTEM_PROMPT =
  'You are a senior Java test engineer. Fix the broken tests. Return only the complete Java file, no markdown.';

/**
 * Build the prompt for generating a new test class.
 */
export function buildWriteTestClassPrompt(params: {
  basePackage: string;
  className: string;
  baseUrl: string;
  itemsDescription: string;
  dependencyInfo: string;
}): string {
  const { basePackage, className, baseUrl, itemsDescription, dependencyInfo } = params;

  return `Write a COMPLETE, compilable Java test class for REST Assured + JUnit 5.

## Requirements

Package: ${basePackage}
Class name: ${className}
Extends: BaseTest (which provides: protected static RequestSpecification spec)
Base URL: ${baseUrl}

## Operations to test

${itemsDescription}

## Dependencies between operations
${dependencyInfo || 'None — operations are independent.'}

## MANDATORY IMPORTS — copy these exactly at the top of the file

package ${basePackage};

import io.restassured.response.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

## CLASS STRUCTURE — use this exact pattern

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ${className} extends BaseTest {
    // static fields for chaining (e.g. static String createdId;)
    // @Test @Order(N) @DisplayName("...") methods
}

## Rules — CRITICAL, follow exactly
1. Copy the MANDATORY IMPORTS exactly — do NOT change or shorten them
2. Use @TestMethodOrder(MethodOrderer.OrderAnnotation.class) — NOT OrderAnnotation.class alone
3. Use given().spec(spec) to start every request — spec already has base URL and content type
4. Do NOT call .baseUri() — BaseTest spec already has it
5. Request bodies must be SINGLE-LINE strings (one .body("...") call with entire JSON)
6. For POST, do NOT include "id" in positive test bodies
7. Use Hamcrest matchers: notNullValue(), equalTo(), greaterThan(), hasSize(greaterThan(0))

## HANDLING DIFFERENT TEST CATEGORIES — this is critical

### Positive tests (category: "positive")
- Use the expectedStatus from the plan (usually 200 or 201)
- For POST: assert .statusCode(200) and .body("id", notNullValue())
- For GET single: use a KNOWN EXISTING ID (e.g. /products/1), assert body fields
- For GET list: assert .body("$", hasSize(greaterThan(0)))
- For PUT/DELETE: use existing IDs (1-10)

### Negative tests (category: "negative") — VERY IMPORTANT
- ALWAYS use FLEXIBLE assertions for negative tests — mock APIs often don't validate properly
- For ALL negative tests, use: .statusCode(anyOf(is(200), is(400), is(404), is(422)))
  This accepts any reasonable response since we can't predict mock API behavior
- For "empty body" tests: send .body("{}"), use flexible status assertion
- For "invalid id" tests: use the exact path from the plan (e.g. /products/99999)
- For "invalid types" tests: send the suggestedBody from the plan as-is
- Do NOT assert response body fields in negative tests — only check status code
- Method name: use the operationId from the plan (e.g. addProduct_emptyBody)

### Edge case tests (category: "edge-case")
- Use FLEXIBLE assertions: statusCode(anyOf(is(200), is(201), is(400), is(404)))
- For boundary tests (id=0, id=-1): use the path from the plan
- For special char tests: use the suggestedBody from the plan
- For limit/query param tests: append query params to URL
- Do NOT assert body fields — only check status code

## KEY RULE — Flexible assertions prevent false failures
8. For negative AND edge-case tests: NEVER use .statusCode(400) alone.
   ALWAYS use .statusCode(anyOf(is(200), is(400), is(404), is(422)))
   This ensures tests pass regardless of whether the API validates input or not.
9. Only assert response body fields in POSITIVE tests, never in negative/edge tests.
10. Return ONLY Java code. No markdown fences. No explanations.`;
}

/**
 * Build the prompt for rewriting a test class based on failure feedback.
 */
export function buildRewriteTestClassPrompt(params: {
  originalCode: string;
  failures: string;
}): string {
  const { originalCode, failures } = params;

  return `Fix this Java REST Assured test class. Some tests failed.

## Original code

${originalCode}

## Test failures

${failures}

## Rules — CRITICAL, follow exactly
1. Return the COMPLETE fixed Java file (not a diff)
2. Fix only what's broken — keep passing tests unchanged
3. If STATUS CODE wrong (e.g. "Expected 200 but was 401"):
   → Change .statusCode(200) to the ACTUAL status, OR fix the request (correct credentials, headers, etc.)
4. If FIELD VALUE wrong (e.g. "Expected: X, Actual: null"):
   → The API didn't return that field. REMOVE the assertion or use .body("id", notNullValue())
5. If NULL/EMPTY BODY: the resource doesn't exist.
   → Use a KNOWN EXISTING ID (1, 2, 3) instead of createdId for GET/PUT/DELETE
6. If CHAINED TEST FAILURE: POST returns a fake id that doesn't persist.
   → For GET/PUT/DELETE tests, use a hardcoded existing id like /products/1
7. For POST: only assert statusCode and body("id", notNullValue()) — no other field assertions
8. Keep ALL imports — must include: DisplayName, Test, Order, MethodOrderer, TestMethodOrder, given, Matchers, Response
9. Do NOT call .baseUri()
10. Request bodies must be SINGLE-LINE strings
11. Return ONLY Java code, no markdown fences

Return the complete fixed Java file.`;
}
