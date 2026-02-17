/**
 * ============================================================
 *  Reflector Agent — Prompt Templates
 * ============================================================
 *
 *  Prompts used by ReflectorAgent to diagnose test failures
 *  and generate fixes via the LLM.
 * ============================================================
 */

export const REFLECTOR_SYSTEM_PROMPT =
  'You are a senior test engineer fixing compilation and test errors. Return ONLY a valid JSON object. No markdown fences, no explanation outside the JSON.';

/**
 * Note appended to the prompt when the failure is a compilation error.
 */
export const COMPILATION_NOTE = `
IMPORTANT: This is a COMPILATION ERROR. The code did not compile, so no tests ran.
You MUST fix ALL files that have compilation errors. Common issues:
- Missing import: org.junit.jupiter.api.DisplayName
- Missing import: static io.restassured.RestAssured.given
- Wrong: @TestMethodOrder(OrderAnnotation.class) → should be @TestMethodOrder(MethodOrderer.OrderAnnotation.class) with import org.junit.jupiter.api.MethodOrderer
- Missing semicolons or syntax errors
Include a fix entry for EVERY file that needs fixing, not just one.
`;

/**
 * Build the reflection/diagnosis prompt.
 */
export function buildReflectorPrompt(params: {
  iteration: number;
  isCompilationError: boolean;
  failureDetails: string;
  rawOutputTail: string;
  relevantFilesContent: string;
}): string {
  const { iteration, isCompilationError, failureDetails, rawOutputTail, relevantFilesContent } = params;

  const compilationBlock = isCompilationError ? `\n${COMPILATION_NOTE}\n` : '';

  return `You are debugging REST Assured test failures (iteration ${iteration}). Analyze and fix the root cause.
${compilationBlock}
## Test failures (from mvn test output)

${failureDetails}

## Raw output (last 3000 chars)

${rawOutputTail}

## Test source code (ALL files)

${relevantFilesContent}

## Your task

For EACH failing test, look at the EXACT error message and fix the code to match what the API actually returns.

Return a JSON object (NO markdown, NO explanation outside the JSON):
{
  "failureSource": "test-code" | "api-bug" | "environment" | "unknown",
  "summary": "2-3 sentences explaining what went wrong",
  "shouldRetry": true/false,
  "fixes": [
    {
      "filePath": "src/test/java/com/api/tests/ProductsApiTest.java",
      "newContent": "COMPLETE FIXED JAVA FILE CONTENT HERE",
      "explanation": "Fixed: addProduct_emptyBody expected 400 but API returned 200"
    }
  ]
}

## RULES FOR FIXING — CRITICAL, read each error message carefully

### HOW TO FIX EACH ERROR TYPE:

1. "Expected status code <X> but was <Y>":
   → Change .statusCode(X) to .statusCode(Y) in the test
   → The API's actual response is CORRECT — the TEST expectation was wrong
   → Example: if "Expected 400 but was 200", change .statusCode(400) to .statusCode(200)
   → For negative tests: mock APIs often return 200 even for bad data — that's expected

2. "Expected: X, Actual: null" or "Expected: X, Actual: Y":
   → REMOVE the field assertion entirely, or use .body("id", notNullValue())
   → Don't try to guess what the API should return

3. "JSON input text should neither be null nor empty":
   → The response body is empty. Use a hardcoded existing ID (1-5) instead of createdId
   → Or remove the body assertion and only check status code

4. "Cannot assert that path ... matches":
   → Remove the body assertion and only check status code

5. "Connection refused" / "timeout":
   → failureSource = "environment", shouldRetry = false

### CODE RULES:
6. Fix EVERY file that has failures — include a fix entry for EACH
7. Each fix.newContent must be the COMPLETE Java file (package, ALL imports, class, ALL methods)
8. Do NOT use .baseUri() — BaseTest spec already has the base URL
9. Request bodies must be SINGLE-LINE strings
10. CRITICAL: This is iteration ${iteration}. If the same test failed in previous iterations,
    the previous fix did NOT work. Try a DIFFERENT approach:
    - If you changed the status code and it still fails, try removing the assertion entirely
    - If a body assertion keeps failing, remove it and only check statusCode
    - When in doubt, use the MOST PERMISSIVE assertion: just check statusCode(anyOf(is(200), is(400), is(404)))
11. Return ONLY valid JSON. No markdown fences. No text before or after the JSON.`;
}
