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
  'You are a senior Java test engineer. Fix ONLY compilation or framework issues. Do NOT change business expectations unless clearly incorrect. Return only the complete Java file.';

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
Extends: BaseTest (provides RequestSpecification spec)
Base URL: ${baseUrl}

## Operations to test

${itemsDescription}

## Dependencies
${dependencyInfo || 'None — operations are independent.'}

## MANDATORY IMPORTS — copy exactly

package ${basePackage};

import io.restassured.response.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.util.*;
import java.time.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

## CLASS STRUCTURE

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ${className} extends BaseTest {
    // static fields for IDs and generated data
}

## Dynamic Data Rules — MANDATORY

- NEVER hardcode static payload data.
- Generate data dynamically using Java types that match the Swagger/OpenAPI schema:
  - integer/int64 fields → use new Random().nextLong() or new Random().nextInt()
  - integer/int32 fields → use new Random().nextInt()
  - number/float/double fields → use new Random().nextDouble() * 100
  - string fields → use UUID.randomUUID().toString() or "test-" + random
  - string/date-time fields → use LocalDateTime.now().toString() or OffsetDateTime.now().toString()
  - boolean fields → use true or false
  - enum fields → pick a valid enum value from the schema
- CRITICAL: Match the field type from the schema. If schema says "type": "integer", do NOT use UUID or String.
- Build request bodies using Map<String,Object>
- Convert maps to JSON via REST Assured serialization.
- For POST requests, OMIT server-generated fields like "id" unless the schema explicitly requires it.

## Positive Tests
- Use expectedStatus from plan.
- Assert key response fields.
- Validate IDs are not null.
- Use dependency chaining when needed.

## Negative / Validation Tests
- Send invalid or missing fields intentionally.
- EXPECT real failure codes from plan.
- Assert error structure when possible.
- DO NOT relax assertions to always pass.

## Critical Rules
1. Use given().spec(spec)
2. Do NOT call .baseUri()
3. Tests MUST FAIL if API behavior is incorrect.
4. Do NOT mask failures.
5. Request body field types MUST match the Swagger schema (int for int, string for string, etc.)
6. Return ONLY Java code. No markdown.`;
}

/**
 * Build the prompt for rewriting a test class based on failure feedback.
 */
export function buildRewriteTestClassPrompt(params: {
  originalCode: string;
  failures: string;
}): string {
  const { originalCode, failures } = params;

  return `Fix this Java REST Assured test class.

## Original code

${originalCode}

## Failures

${failures}

## Rules
1. Return COMPLETE Java file.
2. Fix ONLY compilation, syntax, import, or framework mistakes.
3. DO NOT change:
   - expected status codes for negative tests
   - business assertions
   - test intent
4. If tests fail due to API behavior → keep assertions unchanged.
5. Preserve structure and ordering.

Return ONLY Java code.`;
}
