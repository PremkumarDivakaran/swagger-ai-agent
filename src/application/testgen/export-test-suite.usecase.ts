/**
 * Export Test Suite Use Case
 *
 * Exports generated test suites in various formats (file, zip, etc.)
 * Uses a generic test result shape (legacy: was used for Axios/Jest export).
 */

import { ValidationError } from '../../core/errors/ValidationError';

/** Minimal test result shape for export (single-file style) */
export interface TestGenerationResult {
  code: string;
  fileName: string;
  specId: string;
  specTitle: string;
  testCount: number;
  operationCount: number;
  testCases: Array<{ id: string; name: string; type: string; operationId: string; method: string; path: string; expectedStatus: number; description?: string }>;
  generatedAt: Date;
  options: Record<string, unknown>;
}

/**
 * Export format options
 */
export type ExportFormat = 'single-file' | 'multi-file' | 'zip';

/**
 * Export options
 */
export interface ExportOptions {
  /** Export format */
  format?: ExportFormat;
  /** Include package.json */
  includePackageJson?: boolean;
  /** Include Jest configuration */
  includeJestConfig?: boolean;
  /** Include README */
  includeReadme?: boolean;
  /** Custom output directory name */
  outputDir?: string;
}

/**
 * Exported file
 */
export interface ExportedFile {
  /** File name */
  name: string;
  /** File content */
  content: string;
  /** MIME type */
  mimeType: string;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export format used */
  format: ExportFormat;
  /** Exported files */
  files: ExportedFile[];
  /** Total size in bytes */
  totalSize: number;
  /** Export timestamp */
  exportedAt: Date;
}

/**
 * Export Test Suite input
 */
export interface ExportTestSuiteInput {
  /** Test generation result to export */
  testResult: TestGenerationResult;
  /** Export options */
  options?: ExportOptions;
}

/**
 * ExportTestSuiteUseCase
 * 
 * Exports test generation results to various formats
 */
export class ExportTestSuiteUseCase {
  /**
   * Execute the use case
   */
  async execute(input: ExportTestSuiteInput): Promise<ExportResult> {
    const { testResult, options = {} } = input;
    const format = options.format || 'single-file';

    if (!testResult.code) {
      throw new ValidationError('Test result contains no code to export');
    }

    const files: ExportedFile[] = [];

    // Main test file
    files.push({
      name: testResult.fileName,
      content: testResult.code,
      mimeType: 'application/typescript',
    });

    // Include package.json if requested
    if (options.includePackageJson) {
      files.push({
        name: 'package.json',
        content: this.generatePackageJson(testResult),
        mimeType: 'application/json',
      });
    }

    // Include Jest config if requested
    if (options.includeJestConfig) {
      files.push({
        name: 'jest.config.js',
        content: this.generateJestConfig(),
        mimeType: 'application/javascript',
      });
    }

    // Include README if requested
    if (options.includeReadme) {
      files.push({
        name: 'README.md',
        content: this.generateReadme(testResult),
        mimeType: 'text/markdown',
      });
    }

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.content.length, 0);

    return {
      format,
      files,
      totalSize,
      exportedAt: new Date(),
    };
  }

  /**
   * Generate package.json for the test project
   */
  private generatePackageJson(testResult: TestGenerationResult): string {
    const safeName = testResult.specTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const packageJson = {
      name: `${safeName}-api-tests`,
      version: '1.0.0',
      description: `API tests for ${testResult.specTitle}`,
      scripts: {
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
      },
      devDependencies: {
        '@types/jest': '^29.5.0',
        '@types/node': '^20.0.0',
        axios: '^1.6.0',
        jest: '^29.7.0',
        'ts-jest': '^29.1.0',
        typescript: '^5.3.0',
      },
      jest: {
        preset: 'ts-jest',
        testEnvironment: 'node',
      },
    };

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate Jest configuration
   */
  private generateJestConfig(): string {
    return `/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  testTimeout: 30000,
};
`;
  }

  /**
   * Generate README for the test project
   */
  private generateReadme(testResult: TestGenerationResult): string {
    return `# ${testResult.specTitle} API Tests

Auto-generated API tests using Jest and Axios.

## Overview

- **Spec ID**: ${testResult.specId}
- **Operations Tested**: ${testResult.operationCount}
- **Total Test Cases**: ${testResult.testCount}
- **Generated At**: ${testResult.generatedAt.toISOString()}

## Installation

\`\`\`bash
npm install
\`\`\`

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`

## Environment Variables

- \`API_BASE_URL\`: Override the base URL for API calls

## Test Options Used

- Negative Tests: ${testResult.options.includeNegativeTests ?? false}
- Auth Tests: ${testResult.options.includeAuthTests ?? false}
- Boundary Tests: ${testResult.options.includeBoundaryTests ?? false}

## Test Cases

${testResult.testCases.map(tc => `- **${tc.name}** (${tc.type}): ${tc.description || tc.method + ' ' + tc.path}`).join('\n')}
`;
  }
}

/**
 * Factory function to create the use case
 */
export function createExportTestSuiteUseCase(): ExportTestSuiteUseCase {
  return new ExportTestSuiteUseCase();
}
