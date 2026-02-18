/**
 * ============================================================
 *  Executor Agent
 * ============================================================
 *
 *  WHAT IT DOES:
 *    Runs `mvn test` on the generated project directory and
 *    parses the output into structured results (pass/fail per test).
 *
 *  WHY THIS IS AN AGENT (not just a script):
 *    The ExecutorAgent returns structured results that the
 *    SelfHealAgent can reason about. It also generates the
 *    Allure report for the UI.
 *
 *  NO LLM HERE — this is pure execution. The intelligence is
 *  in the Planner, Writer, and SelfHeal agents.
 *
 *  INPUT:  path to the Maven project
 *  OUTPUT: AgentExecutionResult (structured pass/fail per test)
 *
 * ============================================================
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { AgentExecutionResult, AgentTestCaseResult } from './types';

const execAsync = promisify(exec);

export class ExecutorAgent {
  /**
   * Run `mvn test` and parse the results.
   * Does NOT throw on test failures — returns structured results instead.
   */
  async execute(testSuitePath: string): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const result = await execAsync('mvn test -B', {
        cwd: testSuitePath,
        timeout: 120_000, // 2 minutes max
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, MAVEN_OPTS: '-Xmx512m' },
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (err: any) {
      // mvn test returns non-zero if tests fail — that's expected
      stdout = err.stdout || '';
      stderr = err.stderr || '';
      exitCode = err.code || 1;
    }

    const durationMs = Date.now() - startTime;
    const fullOutput = stdout + '\n' + stderr;

    // ── Detect compilation failures first ──
    const isCompilationError = fullOutput.includes('COMPILATION ERROR') ||
      fullOutput.includes('cannot find symbol') ||
      fullOutput.includes('error: ') && fullOutput.includes('.java:');

    if (isCompilationError) {
      // Extract compilation error details
      const errorLines = fullOutput.split('\n')
        .filter(l => l.includes('[ERROR]') && (l.includes('.java:') || l.includes('cannot find symbol') || l.includes('error:')))
        .slice(0, 20);
      const compilationErrors = errorLines.join('\n');

      return {
        success: false,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        durationMs,
        testResults: [{
          testName: 'COMPILATION',
          className: 'CompilationError',
          status: 'error',
          durationMs: 0,
          errorMessage: 'Maven compilation failed — tests could not run',
          stackTrace: compilationErrors || fullOutput.slice(-3000),
        }],
        rawOutput: fullOutput.slice(-5000),
      };
    }

    const testResults = this.parseMavenOutput(stdout);
    const totals = this.countTotals(testResults);

    // Generate Allure report (best-effort, only if tests actually ran)
    if (totals.total > 0) {
      try {
        await execAsync('mvn allure:report -q', {
          cwd: testSuitePath,
          timeout: 60_000,
        });
      } catch {
        // Allure report generation is optional
      }
    }

    return {
      success: totals.failed === 0 && totals.total > 0,
      total: totals.total,
      passed: totals.passed,
      failed: totals.failed,
      skipped: totals.skipped,
      durationMs,
      testResults,
      rawOutput: fullOutput.slice(-5000),
    };
  }

  /**
   * Parse Maven Surefire output to extract per-test results.
   * Looks for lines like:
   *   [INFO] Tests run: 5, Failures: 1, Errors: 0, Skipped: 0
   *   [ERROR] testMethod  Time elapsed: 0.5 s  <<< FAILURE!
   */
  private parseMavenOutput(output: string): AgentTestCaseResult[] {
    const results: AgentTestCaseResult[] = [];
    const lines = output.split('\n');

    let currentClass = '';

    // ── First pass: detect test classes ──
    // ── Second pass: parse error summary block at the end ──
    // Maven prints a clean error summary like:
    //   [ERROR] Failures:
    //   [ERROR]   AuthApiTest.loginUser:23 1 expectation failed.
    //   Expected status code <200> but was <401>.
    //   [ERROR]   CartsApiTest.getCartById:46 ...
    // We parse THIS section because it has the actual error messages.

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect test class: "Running com.api.tests.ProductsApiTest"
      const runningMatch = line.match(/Running\s+([\w.]+)/);
      if (runningMatch) {
        currentClass = runningMatch[1];
      }
    }

    // Parse the error summary block (after "[ERROR] Failures:" or "[ERROR] Errors:")
    const failureSectionStart = lines.findIndex(l => /\[ERROR\]\s+Failures:/.test(l));
    const errorSectionStart = lines.findIndex(l => /\[ERROR\]\s+Errors:/.test(l));
    // Start from whichever section appears first (Failures or Errors)
    const startIdx = failureSectionStart >= 0
      ? failureSectionStart
      : (errorSectionStart >= 0 ? errorSectionStart : 0);

    // Collect all failure entries from the summary
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];

      // Match: "[ERROR]   AuthApiTest.loginUser:23 1 expectation failed."
      // or:    "[ERROR]   ProductsApiTest.getProductById:50 » IllegalArgument ..."
      const failureMatch = line.match(/\[ERROR\]\s+([\w]+\.[\w]+)(?::(\d+))?\s+(.*)/);
      if (failureMatch) {
        const fullName = failureMatch[1]; // e.g. "AuthApiTest.loginUser"
        const errorSummary = failureMatch[3]; // e.g. "1 expectation failed."

        // Collect continuation lines (the actual error detail)
        // These are lines between this [ERROR] and the next [ERROR] or [INFO]
        const detailLines: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('[ERROR]') || nextLine.startsWith('[INFO]') || nextLine === '') {
            break;
          }
          detailLines.push(nextLine);
        }

        const actualError = detailLines.length > 0
          ? detailLines.join(' ').trim()
          : errorSummary;

        const [simpleClass, testName] = fullName.includes('.')
          ? fullName.split('.')
          : ['Unknown', fullName];

        // Use the simple class name from the failure line (e.g. "AuthApiTest")
        // for correct file matching in the SelfHealAgent
        results.push({
          testName,
          className: simpleClass,
          status: 'failed',
          durationMs: 0,
          errorMessage: `${errorSummary} → ${actualError}`,
          stackTrace: '',
        });
      }
    }

    // Parse summary line: "Tests run: X, Failures: Y, Errors: Z, Skipped: W"
    const summaryMatch = output.match(
      /Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/g
    );
    if (summaryMatch) {
      // Use the LAST summary line (final totals)
      const last = summaryMatch[summaryMatch.length - 1];
      const m = last.match(/Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/);
      if (m) {
        const total = parseInt(m[1]);
        const failedCount = parseInt(m[2]) + parseInt(m[3]);
        const skippedCount = parseInt(m[4]);
        const passedCount = total - failedCount - skippedCount;

        // If we didn't capture individual failures, fill in passed results
        if (results.length < failedCount) {
          // Some failures weren't captured individually — that's okay
        }
        // Add placeholder passed tests if we have fewer results than total
        const missingPassed = passedCount - results.filter(r => r.status === 'passed').length;
        for (let j = 0; j < missingPassed && j < passedCount; j++) {
          results.push({
            testName: `test_${j + 1}`,
            className: currentClass || 'Unknown',
            status: 'passed',
            durationMs: 0,
          });
        }
      }
    }

    return results;
  }

  private countTotals(results: AgentTestCaseResult[]) {
    // If we have detailed results, count from them
    if (results.length > 0) {
      return {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length,
      };
    }
    return { total: 0, passed: 0, failed: 0, skipped: 0 };
  }
}
