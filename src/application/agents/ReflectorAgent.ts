/**
 * ============================================================
 *  Reflector Agent
 * ============================================================
 *
 *  WHAT IT DOES:
 *    After tests are executed and some fail, the ReflectorAgent
 *    sends the test code + failure output to the LLM and asks:
 *    1. Is the failure in the test code, or in the API itself?
 *    2. If it's test code, what's the fix?
 *    3. Should we retry after fixing?
 *
 *  WHY THIS MATTERS:
 *    This is the "self-healing" part that makes it an agent.
 *    Without this, it's just a generator. With this, the system
 *    can autonomously fix its own mistakes and re-run.
 *
 *  INPUT:  AgentExecutionResult + test file contents
 *  OUTPUT: AgentReflection (diagnosis + fixes)
 *
 * ============================================================
 */

import { LlmRouter } from '../../infrastructure/llm';
import type { AgentExecutionResult, AgentReflection, TestFix } from './types';

export class ReflectorAgent {
  constructor(private readonly llm: LlmRouter) {}

  /**
   * Analyze test failures and determine whether/how to fix them.
   */
  async reflect(
    executionResult: AgentExecutionResult,
    testFiles: Map<string, string>, // filePath → fileContent
    iteration: number = 1,
  ): Promise<AgentReflection> {
    // Only reflect on failures
    if (executionResult.success) {
      return {
        failureSource: 'test-code',
        summary: 'All tests passed. No reflection needed.',
        fixes: [],
        shouldRetry: false,
      };
    }

    // Build failure details for the LLM
    const failureDetails = executionResult.testResults
      .filter(t => t.status === 'failed' || t.status === 'error')
      .map(t => `❌ ${t.className}.${t.testName}\n   Error: ${t.errorMessage || 'unknown'}\n   ${t.stackTrace || ''}`)
      .join('\n\n');

    // Detect if this is a compilation error (affects ALL files)
    const isCompilationError = executionResult.testResults.some(
      t => t.testName === 'COMPILATION' || t.className === 'CompilationError'
    );

    // For compilation errors: include ALL test files (the error could be in any)
    // For test failures: include only the relevant files
    const relevantFiles: string[] = [];
    if (isCompilationError) {
      // Include ALL test files — compilation errors affect the whole project
      for (const [path, content] of testFiles.entries()) {
        if (path.endsWith('Test.java') || path.endsWith('Tests.java')) {
          relevantFiles.push(`--- ${path} ---\n${content}`);
        }
      }
    } else {
      const failedClasses = new Set(
        executionResult.testResults
          .filter(t => t.status === 'failed' || t.status === 'error')
          .map(t => t.className)
      );

      for (const [path, content] of testFiles.entries()) {
        const isRelevant = Array.from(failedClasses).some(cls => {
          const simpleClass = cls.split('.').pop() || cls;
          return path.includes(simpleClass) || content.includes(`class ${simpleClass}`);
        });
        if (isRelevant) {
          relevantFiles.push(`--- ${path} ---\n${content}`);
        }
      }

      // Fallback: if no match, include all test files
      if (relevantFiles.length === 0) {
        for (const [path, content] of testFiles.entries()) {
          if (path.endsWith('Test.java') || path.endsWith('Tests.java')) {
            relevantFiles.push(`--- ${path} ---\n${content}`);
          }
        }
      }
    }

    const compilationNote = isCompilationError
      ? `\n\nIMPORTANT: This is a COMPILATION ERROR. The code did not compile, so no tests ran.
You MUST fix ALL files that have compilation errors. Common issues:
- Missing import: org.junit.jupiter.api.DisplayName
- Missing import: static io.restassured.RestAssured.given
- Wrong: @TestMethodOrder(OrderAnnotation.class) → should be @TestMethodOrder(MethodOrderer.OrderAnnotation.class) with import org.junit.jupiter.api.MethodOrderer
- Missing semicolons or syntax errors
Include a fix entry for EVERY file that needs fixing, not just one.\n`
      : '';

    const prompt = `You are debugging REST Assured test failures (iteration ${iteration}). Analyze and fix the root cause.
${compilationNote}
## Test failures (from mvn test output)

${failureDetails}

## Raw output (last 3000 chars)

${executionResult.rawOutput.slice(-3000)}

## Test source code (ALL files)

${relevantFiles.join('\n\n')}

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

    const response = await this.llm.generate({
      prompt,
      systemPrompt: 'You are a senior test engineer fixing compilation and test errors. Return ONLY a valid JSON object. No markdown fences, no explanation outside the JSON.',
      temperature: 0.1,
      maxTokens: 16000,
    });

    return this.parseResponse(response.content);
  }

  /**
   * Robust JSON parser that handles common LLM response formats:
   * - Markdown code fences (```json ... ```)
   * - Leading/trailing text around JSON
   * - Truncated JSON (tries to repair)
   */
  private parseResponse(raw: string): AgentReflection {
    let content = raw.trim();

    // ── Step 1: Strip markdown code fences ──
    // Handle ```json ... ```, ``` ... ```, ```JSON ... ```
    content = content.replace(/^```(?:json|JSON)?\s*\n?/m, '');
    content = content.replace(/\n?```\s*$/m, '');
    content = content.trim();

    // ── Step 2: Try parsing as-is ──
    const parsed = this.tryParseJson(content);
    if (parsed) return this.toReflection(parsed);

    // ── Step 3: Extract JSON object from surrounding text ──
    // Find the first { and last } in the string
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const extracted = content.substring(firstBrace, lastBrace + 1);
      const parsed2 = this.tryParseJson(extracted);
      if (parsed2) return this.toReflection(parsed2);
    }

    // ── Step 4: Handle truncated JSON (missing closing braces) ──
    if (firstBrace !== -1) {
      let truncated = content.substring(firstBrace);
      // Count unclosed braces/brackets and close them
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      let escape = false;
      for (const ch of truncated) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') braceCount++;
        if (ch === '}') braceCount--;
        if (ch === '[') bracketCount++;
        if (ch === ']') bracketCount--;
      }
      // Close any unclosed structures
      // First, if we're inside a string, close it
      if (inString) truncated += '"';
      // Close brackets then braces
      for (let i = 0; i < bracketCount; i++) truncated += ']';
      for (let i = 0; i < braceCount; i++) truncated += '}';

      const parsed3 = this.tryParseJson(truncated);
      if (parsed3) {
        console.log('[ReflectorAgent] Parsed truncated JSON response (response was cut off)');
        return this.toReflection(parsed3);
      }
    }

    // ── Step 5: All parsing failed ──
    // Log raw response for debugging
    console.error('[ReflectorAgent] Failed to parse LLM response. Raw preview:');
    console.error(content.substring(0, 500));
    console.error(`... (total length: ${content.length} chars)`);

    // IMPORTANT: return shouldRetry: true so the orchestrator doesn't give up
    return {
      failureSource: 'unknown',
      summary: 'Failed to parse LLM reflection response. Will retry with existing code.',
      fixes: [],
      shouldRetry: true,
    };
  }

  private tryParseJson(str: string): any | null {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  private toReflection(parsed: any): AgentReflection {
    return {
      failureSource: parsed.failureSource || 'unknown',
      summary: parsed.summary || 'Could not analyze failures.',
      shouldRetry: parsed.shouldRetry ?? true,
      fixes: (parsed.fixes || []).map((f: any) => ({
        filePath: f.filePath,
        newContent: f.newContent,
        explanation: f.explanation || '',
      })),
    };
  }
}
