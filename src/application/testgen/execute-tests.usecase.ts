/**
 * Execute Tests Use Case
 * 
 * Executes generated tests and returns results
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationError } from '../../core/errors/ValidationError';
import { generatePrefixedId } from '../../utils';

const execAsync = promisify(exec);

/**
 * Test execution status
 */
export type TestExecutionStatus = 'pending' | 'installing' | 'running' | 'completed' | 'failed';

/**
 * Execute tests input
 */
export interface ExecuteTestsInput {
  /** Path to the test suite directory */
  testSuitePath: string;
  /** Test framework (cucumber/jest = npm test, maven = mvn test) */
  framework: 'cucumber' | 'jest' | 'maven';
  /** Additional arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Test execution result
 */
export interface TestExecutionResult {
  /** Execution ID */
  executionId: string;
  /** Status */
  status: TestExecutionStatus;
  /** Started at */
  startedAt: Date;
  /** Completed at */
  completedAt?: Date;
  /** Duration in ms */
  duration: number;
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Parsed results */
  results?: TestResults;
  /** Absolute path to test suite (for Allure report serving) */
  testSuitePath?: string;
  /** Framework used (maven has Allure report) */
  framework?: 'cucumber' | 'jest' | 'maven';
}

/**
 * Test results structure
 */
export interface TestResults {
  /** Total tests */
  total: number;
  /** Passed tests */
  passed: number;
  /** Failed tests */
  failed: number;
  /** Skipped tests */
  skipped: number;
  /** Undefined steps (Cucumber) */
  undefined?: number;
  /** Test suites */
  suites: TestSuite[];
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  duration: number;
}

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

/**
 * ExecuteTestsUseCase
 * 
 * Executes tests in a generated test suite
 */
export class ExecuteTestsUseCase {
  // In-memory storage for execution results (in production, use database)
  // Static to share across all instances
  private static executions = new Map<string, TestExecutionResult>();

  /**
   * Execute the use case
   */
  async execute(input: ExecuteTestsInput): Promise<TestExecutionResult> {
    const { testSuitePath, framework, args = [], env = {} } = input;

    // Validate test suite path exists
    if (!fs.existsSync(testSuitePath)) {
      throw new ValidationError(`Test suite path does not exist: ${testSuitePath}`);
    }

    const isMaven = framework === 'maven';
    if (isMaven) {
      const pomPath = path.join(testSuitePath, 'pom.xml');
      if (!fs.existsSync(pomPath)) {
        throw new ValidationError(`No pom.xml found in: ${testSuitePath}`);
      }
    } else {
      const packageJsonPath = path.join(testSuitePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new ValidationError(`No package.json found in: ${testSuitePath}`);
      }
    }

    const executionId = generatePrefixedId('exec');
    const startedAt = new Date();
    const absoluteSuitePath = path.resolve(testSuitePath);

    // For Maven: no install step. For npm: check node_modules
    const nodeModulesPath = path.join(testSuitePath, 'node_modules');
    const needsInstall = !isMaven && !fs.existsSync(nodeModulesPath);

    // Initialize execution record
    const execution: TestExecutionResult = {
      executionId,
      status: needsInstall ? 'installing' : 'running',
      startedAt,
      duration: 0,
      exitCode: 0,
      stdout: '',
      stderr: '',
      testSuitePath: absoluteSuitePath,
      framework,
    };

    ExecuteTestsUseCase.executions.set(executionId, execution);

    // Install dependencies if needed, then run tests
    if (needsInstall) {
      this.installAndRunTests(executionId, testSuitePath, framework, args, env).catch((error) => {
        console.error(`Test execution ${executionId} failed:`, error);
      });
    } else {
      this.runTests(executionId, testSuitePath, framework, args, env).catch((error) => {
        console.error(`Test execution ${executionId} failed:`, error);
      });
    }

    return execution;
  }

  /**
   * Get execution status
   */
  async getStatus(executionId: string): Promise<TestExecutionResult | null> {
    return ExecuteTestsUseCase.executions.get(executionId) || null;
  }

  /**
   * Get absolute path to Allure report directory for an execution, or null if not available
   */
  getReportPath(executionId: string): string | null {
    const execution = ExecuteTestsUseCase.executions.get(executionId);
    if (!execution?.testSuitePath || execution.framework !== 'maven') return null;
    const reportDir = path.join(execution.testSuitePath, 'target', 'site', 'allure-maven-plugin');
    return fs.existsSync(reportDir) ? reportDir : null;
  }

  /**
   * Install dependencies and then run tests
   */
  private async installAndRunTests(
    executionId: string,
    testSuitePath: string,
    framework: 'cucumber' | 'jest',
    args: string[],
    env: Record<string, string>
  ): Promise<void> {
    const execution = ExecuteTestsUseCase.executions.get(executionId);
    if (!execution) return;

    try {
      console.log(`[${executionId}] Installing dependencies in ${testSuitePath}...`);
      
      // Run npm install
      const { stdout: installStdout, stderr: installStderr } = await execAsync('npm install', {
        cwd: testSuitePath,
        env: {
          ...process.env,
          ...env,
        },
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 10 * 60 * 1000, // 10 minutes timeout for install
      });

      console.log(`[${executionId}] Dependencies installed successfully`);
      
      // Update status to running
      execution.status = 'running';
      execution.stdout = `=== Dependency Installation ===\n${installStdout}\n\n=== Test Execution ===\n`;
      execution.stderr = installStderr;
      ExecuteTestsUseCase.executions.set(executionId, execution);

      // Now run the tests
      await this.runTests(executionId, testSuitePath, framework, args, env);
    } catch (error: any) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();

      console.error(`[${executionId}] Failed to install dependencies:`, error);

      // Update execution with error
      execution.status = 'failed';
      execution.completedAt = completedAt;
      execution.duration = duration;
      execution.exitCode = error.code || 1;
      execution.stdout = error.stdout || '';
      execution.stderr = `Failed to install dependencies:\n${error.stderr || error.message}`;

      ExecuteTestsUseCase.executions.set(executionId, execution);
    }
  }

  /**
   * Run tests
   */
  private async runTests(
    executionId: string,
    testSuitePath: string,
    framework: 'cucumber' | 'jest' | 'maven',
    args: string[],
    env: Record<string, string>
  ): Promise<void> {
    const execution = ExecuteTestsUseCase.executions.get(executionId);
    if (!execution) return;

    try {
      const command = framework === 'maven'
        ? `mvn test ${args.join(' ')}`.trim()
        : `npm test ${args.join(' ')}`.trim();

      // Execute command with timeout (5 minutes max)
      const { stdout, stderr } = await execAsync(command, {
        cwd: testSuitePath,
        env: {
          ...process.env,
          ...env,
        },
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 5 * 60 * 1000, // 5 minutes timeout
      });

      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();

      // Parse results from output
      const results = this.parseTestOutput(stdout, stderr, framework);

      if (framework === 'maven') {
        await this.generateAllureReport(testSuitePath).catch((err) =>
          console.warn(`[${executionId}] Allure report generation failed:`, err?.message)
        );
      }

      // Update execution (after report is ready so UI can show "View Report" immediately)
      execution.status = 'completed';
      execution.completedAt = completedAt;
      execution.duration = duration;
      execution.exitCode = 0;
      execution.stdout = stdout;
      execution.stderr = stderr;
      execution.results = results;

      ExecuteTestsUseCase.executions.set(executionId, execution);
    } catch (error: any) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();
      const exitCode = error.code ?? 1;

      // Parse results from stdout (Cucumber/Jest print summary to stdout even when exiting with 1)
      const results = this.parseTestOutput(
        error.stdout || '',
        error.stderr || error.message,
        framework
      );
      execution.results = results;
      execution.stdout = error.stdout || '';
      execution.completedAt = completedAt;
      execution.duration = duration;
      execution.exitCode = exitCode;

      // Exit code 1 with parsed results = test run completed but some scenarios failed (normal)
      // Don't treat as "failed" run or show "Command failed: npm test" as an error
      if (exitCode === 1 && results.total > 0) {
        execution.status = 'completed';
        const parts = [
          results.failed ? `${results.failed} failed` : '',
          results.undefined ? `${results.undefined} undefined` : '',
          results.passed ? `${results.passed} passed` : '',
        ].filter(Boolean);
        execution.stderr = parts.length
          ? `Test run completed with scenario failures (exit code 1): ${parts.join(', ')}. See Console Output for details.`
          : '';
      } else {
        execution.status = 'failed';
        execution.stderr = error.stderr || error.message;
      }

      if (framework === 'maven') {
        await this.generateAllureReport(testSuitePath).catch((err) =>
          console.warn(`[${executionId}] Allure report generation failed:`, err?.message)
        );
      }

      ExecuteTestsUseCase.executions.set(executionId, execution);
    }
  }

  /**
   * Generate Allure report (mvn allure:report) for Maven projects
   */
  private async generateAllureReport(testSuitePath: string): Promise<void> {
    await execAsync('mvn allure:report', {
      cwd: testSuitePath,
      env: process.env,
      maxBuffer: 1024 * 1024 * 5,
      timeout: 60 * 1000,
    });
  }

  /**
   * Parse test output
   */
  private parseTestOutput(
    stdout: string,
    stderr: string,
    framework: 'cucumber' | 'jest' | 'maven'
  ): TestResults {
    const results: TestResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
    };

    if (framework === 'cucumber') {
      // Parse Cucumber output: "9 scenarios (3 failed, 5 undefined, 1 passed)"
      const scenarioMatch = stdout.match(/(\d+)\s+scenarios?\s*\(([^)]+)\)/i);
      if (scenarioMatch) {
        results.total = parseInt(scenarioMatch[1], 10);
        const summary = scenarioMatch[2];
        const passedMatch = summary.match(/(\d+)\s+passed/i);
        const failedMatch = summary.match(/(\d+)\s+failed/i);
        const skippedMatch = summary.match(/(\d+)\s+skipped/i);
        const undefinedMatch = summary.match(/(\d+)\s+undefined/i);
        if (passedMatch) results.passed = parseInt(passedMatch[1], 10);
        if (failedMatch) results.failed = parseInt(failedMatch[1], 10);
        if (skippedMatch) results.skipped = parseInt(skippedMatch[1], 10);
        if (undefinedMatch) results.undefined = parseInt(undefinedMatch[1], 10);
      }
    } else if (framework === 'jest') {
      // Parse Jest output
      // Look for summary like: "Tests: X passed, Y failed, Z total"
      const testMatch = stdout.match(/Tests:\s+(?:(\d+)\s+failed,\s*)?(?:(\d+)\s+passed,\s*)?(\d+)\s+total/i);
      if (testMatch) {
        results.failed = testMatch[1] ? parseInt(testMatch[1], 10) : 0;
        results.passed = testMatch[2] ? parseInt(testMatch[2], 10) : 0;
        results.total = parseInt(testMatch[3], 10);
      }
    } else if (framework === 'maven') {
      // Surefire prints "Tests run: X, Failures: Y, Errors: Z, Skipped: W" per suite and once in the final summary.
      // Use the last occurrence (final summary) so the dashboard shows correct totals.
      const re = /Tests run:\s*(\d+)[^,]*,\s*Failures:\s*(\d+)[^,]*,\s*Errors:\s*(\d+)[^,]*,\s*Skipped:\s*(\d+)/gi;
      const matches = [...stdout.matchAll(re)];
      const mavenMatch = matches.length > 0 ? matches[matches.length - 1] : null;
      if (mavenMatch) {
        results.total = parseInt(mavenMatch[1], 10);
        results.failed = parseInt(mavenMatch[2], 10) + parseInt(mavenMatch[3], 10);
        results.skipped = parseInt(mavenMatch[4], 10);
        results.passed = Math.max(0, results.total - results.failed - results.skipped);
      }
    }

    return results;
  }
}

/**
 * Factory function to create the use case
 */
export function createExecuteTestsUseCase(): ExecuteTestsUseCase {
  return new ExecuteTestsUseCase();
}

