/**
 * ============================================================
 *  Self-Heal Agent — Prompt Templates
 * ============================================================
 *
 *  Prompts used by SelfHealAgent to diagnose test failures
 *  and generate fixes via the LLM.
 * ============================================================
 */

export const SELF_HEAL_SYSTEM_PROMPT =
  'You are a senior test engineer fixing compilation and test errors. Return ONLY a valid JSON object. No markdown fences.';

/**
 * Note appended to the prompt when the failure is a compilation error.
 */
export const COMPILATION_NOTE = `
IMPORTANT: This is a COMPILATION ERROR.
You MUST fix ALL compilation issues:
- Missing imports
- Syntax errors
- Annotation mistakes
- Wrong method signatures
Include a fix entry for EVERY affected file.
`;

/**
 * Build the reflection/diagnosis prompt.
 */
export function buildSelfHealPrompt(params: {
  iteration: number;
  isCompilationError: boolean;
  failureDetails: string;
  rawOutputTail: string;
  relevantFilesContent: string;
}): string {
  const { iteration, isCompilationError, failureDetails, rawOutputTail, relevantFilesContent } = params;

  const compilationBlock = isCompilationError ? `\n${COMPILATION_NOTE}\n` : '';

  return `You are debugging REST Assured test failures (iteration ${iteration}).
${compilationBlock}

## Test failures

${failureDetails}

## Raw output

${rawOutputTail}

## Source files

${relevantFilesContent}

## Core Principle

You MUST distinguish between:

### TEST CODE ISSUE
- syntax errors
- missing imports
- incorrect REST Assured usage
- invalid Java code

→ FIX these.

### ACTUAL API FAILURE (DO NOT FIX)
- API returns wrong status for invalid input
- API missing validation
- API returns unexpected business result

→ DO NOT modify assertions or expected status.
→ Mark as api-bug.

## Output Format (STRICT JSON)

{
  "failureSource": "test-code" | "api-bug" | "environment" | "unknown",
  "summary": "Short explanation",
  "shouldRetry": true/false,
  "fixes": [
    {
      "filePath": "src/test/java/.../Test.java",
      "newContent": "COMPLETE FIXED JAVA FILE",
      "explanation": "What was fixed"
    }
  ]
}

## Fixing Rules

1. NEVER change negative test expectations.
2. NEVER change expected status to make tests pass.
3. NEVER remove business assertions unless syntactically invalid.
4. Fix ONLY code correctness issues.
5. If failures indicate API bugs → failureSource = "api-bug", no fixes.
6. Return ONLY JSON.`;
}
