/**
 * ============================================================
 *  Self-Heal Agent
 * ============================================================
 *
 *  WHAT IT DOES:
 *    After tests are executed and some fail, the SelfHealAgent
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
import { buildSelfHealPrompt, SELF_HEAL_SYSTEM_PROMPT } from '../../prompts';

export class SelfHealAgent {
  /**
   * Patterns in test method names that indicate negative / edge-case tests.
   * These tests intentionally send invalid data and expect 4xx responses.
   */
  private static readonly NEGATIVE_TEST_PATTERNS = [
    '_emptyBody', '_invalidTypes', '_missingFields', '_nullValues',
    '_specialChars', '_sqlInjection', '_xss', '_unauthorized',
    '_notFound', '_invalidId', '_exceededLength', '_negative',
    '_boundary', '_duplicate', '_malformed', '_empty', '_invalid',
    '_forbidden', '_noAuth', '_badRequest', '_wrongType',
    'Negative', 'EdgeCase', 'Invalid', 'Empty', 'Null',
    'Unauthorized', 'Forbidden', 'BadRequest', 'Malformed',
  ];

  /**
   * Regex to detect "expected status code <4xx> but was <2xx>" in error messages.
   * REST Assured format: "Expected status code <400> but was <201>."
   */
  private static readonly STATUS_MISMATCH_RE =
    /expected\s+(?:status\s+code\s+)?<?(\d{3})>?\s+but\s+was\s+<?(\d{3})>?/i;

  constructor(private readonly llm: LlmRouter) {}

  /**
   * Check if a test is a negative/edge-case test based on its method name.
   */
  private isNegativeTest(testName: string): boolean {
    return SelfHealAgent.NEGATIVE_TEST_PATTERNS.some(
      pattern => testName.includes(pattern)
    );
  }

  /**
   * Check if a failure is a negative test expecting 4xx but getting 2xx.
   * Returns true if this failure should be classified as an API bug.
   */
  private isApiBugFailure(testName: string, errorMessage: string): boolean {
    if (!this.isNegativeTest(testName)) return false;

    const match = SelfHealAgent.STATUS_MISMATCH_RE.exec(errorMessage || '');
    if (!match) return false;

    const expected = parseInt(match[1], 10);
    const actual = parseInt(match[2], 10);

    // Negative test expected 4xx but got 2xx → API validation bug
    return expected >= 400 && expected < 500 && actual >= 200 && actual < 300;
  }

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

    // ── Pre-filter: separate api-bug failures from fixable failures ──
    const allFailures = executionResult.testResults.filter(
      t => t.status === 'failed' || t.status === 'error'
    );

    const apiBugFailures = allFailures.filter(
      t => this.isApiBugFailure(t.testName, t.errorMessage || '')
    );
    const fixableFailures = allFailures.filter(
      t => !this.isApiBugFailure(t.testName, t.errorMessage || '')
    );

    if (apiBugFailures.length > 0) {
      const names = apiBugFailures.map(t => `${t.className}.${t.testName}`);
      console.log(`[SelfHealAgent] Detected ${apiBugFailures.length} API-bug failure(s) (negative tests where API returns 2xx instead of 4xx): ${names.join(', ')}`);
    }

    // If ALL failures are api-bugs, skip LLM entirely
    if (fixableFailures.length === 0) {
      const names = apiBugFailures.map(t => t.testName).join(', ');
      return {
        failureSource: 'api-bug',
        summary: `All ${apiBugFailures.length} failing test(s) are negative/edge-case tests where the API does not validate input (returns 2xx instead of expected 4xx). Tests: ${names}. These tests document API validation gaps and should NOT be changed.`,
        fixes: [],
        shouldRetry: false,
      };
    }

    // Build failure details for the LLM — only fixable failures
    const failureDetails = fixableFailures
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

    const prompt = buildSelfHealPrompt({
      iteration,
      isCompilationError,
      failureDetails,
      rawOutputTail: executionResult.rawOutput.slice(-3000),
      relevantFilesContent: relevantFiles.join('\n\n'),
    });

    const response = await this.llm.generate({
      prompt,
      systemPrompt: SELF_HEAL_SYSTEM_PROMPT,
      temperature: 0.1,
      maxTokens: 16000,
    });

    const reflection = this.parseResponse(response.content);

    // ── Post-LLM scrub: ensure no fix weakens negative test assertions ──
    reflection.fixes = this.scrubNegativeTestFixes(reflection.fixes, testFiles);

    // If scrubbing removed all fixes but there were api-bug failures, update diagnosis
    if (reflection.fixes.length === 0 && apiBugFailures.length > 0) {
      reflection.failureSource = 'api-bug';
      reflection.shouldRetry = false;
      reflection.summary += ` Remaining failures are API validation gaps (negative tests where API returns 2xx for invalid data).`;
    }

    return reflection;
  }

  /**
   * Post-LLM guardrail: scan each fix's newContent for methods that match
   * negative test patterns and check if the LLM changed their expected 4xx
   * status codes to 2xx. If so, restore the original file content for that fix.
   */
  private scrubNegativeTestFixes(fixes: TestFix[], testFiles: Map<string, string>): TestFix[] {
    return fixes.filter(fix => {
      const original = testFiles.get(fix.filePath);
      if (!original) return true; // no original to compare, keep the fix

      // Find all statusCode assertions in the original for negative test methods
      // Pattern: within a method like addProduct_emptyBody, find .statusCode(400)
      const negativeMethodStatusCodes = this.extractNegativeTestStatusCodes(original);
      if (negativeMethodStatusCodes.size === 0) return true; // no negative tests in this file

      // Check if the fix changed any of those from 4xx to 2xx
      const newStatusCodes = this.extractNegativeTestStatusCodes(fix.newContent);
      let hasWeakenedAssertion = false;

      for (const [methodName, originalCode] of negativeMethodStatusCodes) {
        const newCode = newStatusCodes.get(methodName);
        if (newCode !== undefined && originalCode >= 400 && originalCode < 500 && newCode >= 200 && newCode < 300) {
          console.log(`[SelfHealAgent] BLOCKED: LLM tried to change ${methodName} from statusCode(${originalCode}) to statusCode(${newCode}). This is an API bug, not a test fix.`);
          hasWeakenedAssertion = true;
        }
      }

      if (hasWeakenedAssertion) {
        console.log(`[SelfHealAgent] Rejecting fix for ${fix.filePath} — it weakens negative test assertions`);
        return false;
      }
      return true;
    });
  }

  /**
   * Extract status codes asserted in negative test methods.
   * Returns: Map<methodName, statusCode>
   */
  private extractNegativeTestStatusCodes(javaContent: string): Map<string, number> {
    const result = new Map<string, number>();

    // Match method declarations and find statusCode assertions within them
    // Pattern: void methodName() { ... .statusCode(NNN) ... }
    const methodRegex = /void\s+(\w+)\s*\(\s*\)\s*\{/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(javaContent)) !== null) {
      const methodName = methodMatch[1];
      if (!this.isNegativeTest(methodName)) continue;

      // Find the method body (simple brace counting)
      const startIdx = methodMatch.index + methodMatch[0].length;
      let depth = 1;
      let endIdx = startIdx;
      for (let i = startIdx; i < javaContent.length && depth > 0; i++) {
        if (javaContent[i] === '{') depth++;
        if (javaContent[i] === '}') depth--;
        endIdx = i;
      }
      const methodBody = javaContent.substring(startIdx, endIdx);

      // Find .statusCode(NNN) in the method body
      const statusMatch = /\.statusCode\(\s*(\d{3})\s*\)/.exec(methodBody);
      if (statusMatch) {
        result.set(methodName, parseInt(statusMatch[1], 10));
      }
    }

    return result;
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
        console.log('[SelfHealAgent] Parsed truncated JSON response (response was cut off)');
        return this.toReflection(parsed3);
      }
    }

    // ── Step 5: All parsing failed ──
    // Log raw response for debugging
    console.error('[SelfHealAgent] Failed to parse LLM response. Raw preview:');
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

  /**
   * Convert parsed JSON to AgentReflection with normalization.
   *
   * CRITICAL: The LLM sometimes contradicts itself — it says failureSource
   * is "test-code" but sets shouldRetry to false. We normalize this:
   *   - test-code with fixes → ALWAYS retry (we can fix test code)
   *   - test-code without fixes → stop (nothing to fix)
   *   - api-bug → stop retrying (the API doesn't validate, not a test issue)
   *   - environment → stop retrying (can't fix infra by changing code)
   *   - unknown → retry to be safe
   */
  private toReflection(parsed: any): AgentReflection {
    const failureSource = parsed.failureSource || 'unknown';
    const fixes: TestFix[] = (parsed.fixes || []).map((f: any) => ({
      filePath: f.filePath,
      newContent: f.newContent,
      explanation: f.explanation || '',
    }));

    // Normalize shouldRetry based on failure source AND whether fixes exist
    let shouldRetry: boolean;
    if (failureSource === 'test-code') {
      // Only retry if there are actual fixes to apply
      shouldRetry = fixes.length > 0;
    } else if (failureSource === 'environment') {
      shouldRetry = false; // Can't fix environment issues by changing code
    } else if (failureSource === 'api-bug') {
      // API doesn't validate inputs properly — retrying won't help.
      // If there are also test-code fixes in the mix, apply them but
      // the LLM should have set failureSource to test-code in that case.
      shouldRetry = fixes.length > 0;
    } else {
      shouldRetry = true; // Unknown — retry to be safe
    }

    return {
      failureSource,
      summary: parsed.summary || 'Could not analyze failures.',
      shouldRetry,
      fixes,
    };
  }
}
