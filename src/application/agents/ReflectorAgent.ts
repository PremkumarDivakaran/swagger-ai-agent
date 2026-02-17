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
import { buildReflectorPrompt, REFLECTOR_SYSTEM_PROMPT } from '../../prompts';

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

    const prompt = buildReflectorPrompt({
      iteration,
      isCompilationError,
      failureDetails,
      rawOutputTail: executionResult.rawOutput.slice(-3000),
      relevantFilesContent: relevantFiles.join('\n\n'),
    });

    const response = await this.llm.generate({
      prompt,
      systemPrompt: REFLECTOR_SYSTEM_PROMPT,
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
