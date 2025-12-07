/**
 * Unit tests for RunPlan domain model
 */

import {
  RunPlan,
  createRunPlan,
  calculateTestCount,
  canExecute,
  isRunning,
  isComplete,
  startRun,
  completeRun,
  getExecutionDuration,
} from '../../../../src/domain/models/RunPlan';
import { createOperation } from '../../../../src/domain/models/Operation';
import { createTestCaseDefinition } from '../../../../src/domain/models/TestCaseDefinition';

describe('RunPlan', () => {
  describe('createRunPlan', () => {
    it('should create a run plan with required fields', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'development',
        selection: { mode: 'full' },
      });

      expect(plan.runId).toBe('run-1');
      expect(plan.specId).toBe('spec-1');
      expect(plan.envName).toBe('development');
      expect(plan.status).toBe('draft');
      expect(plan.executionItems).toEqual([]);
      expect(plan.operationCount).toBe(0);
      expect(plan.testCount).toBe(0);
    });

    it('should create a run plan with execution items', () => {
      const operation = createOperation({
        operationId: 'getUsers',
        method: 'GET',
        path: '/users',
      });
      const testCase = createTestCaseDefinition({
        id: 'tc-1',
        name: 'Test GET /users',
        operationId: 'getUsers',
        method: 'GET',
        path: '/users',
      });

      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'single', operationId: 'getUsers' },
        executionItems: [
          { id: 'item-1', operation, testCases: [testCase], order: 1 },
        ],
        operationCount: 1,
        testCount: 1,
      });

      expect(plan.executionItems).toHaveLength(1);
      expect(plan.operationCount).toBe(1);
      expect(plan.testCount).toBe(1);
    });
  });

  describe('calculateTestCount', () => {
    it('should calculate total test count', () => {
      const operation = createOperation({
        operationId: 'test',
        method: 'GET',
        path: '/test',
      });
      const testCase = createTestCaseDefinition({
        id: 'tc-1',
        name: 'Test',
        operationId: 'test',
        method: 'GET',
        path: '/test',
      });

      const items = [
        { id: 'item-1', operation, testCases: [testCase, testCase], order: 1 },
        { id: 'item-2', operation, testCases: [testCase], order: 2 },
      ];

      expect(calculateTestCount(items)).toBe(3);
    });

    it('should return 0 for empty items', () => {
      expect(calculateTestCount([])).toBe(0);
    });
  });

  describe('canExecute', () => {
    it('should return true for draft status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'draft',
      });
      expect(canExecute(plan)).toBe(true);
    });

    it('should return true for ready status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'ready',
      });
      expect(canExecute(plan)).toBe(true);
    });

    it('should return false for running status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'running',
      });
      expect(canExecute(plan)).toBe(false);
    });
  });

  describe('isRunning', () => {
    it('should return true for running status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'running',
      });
      expect(isRunning(plan)).toBe(true);
    });

    it('should return true for paused status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'paused',
      });
      expect(isRunning(plan)).toBe(true);
    });
  });

  describe('isComplete', () => {
    it('should return true for completed status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'completed',
      });
      expect(isComplete(plan)).toBe(true);
    });

    it('should return true for failed status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'failed',
      });
      expect(isComplete(plan)).toBe(true);
    });

    it('should return false for draft status', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'draft',
      });
      expect(isComplete(plan)).toBe(false);
    });
  });

  describe('startRun', () => {
    it('should update status to running and set startedAt', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
      });

      const started = startRun(plan);

      expect(started.status).toBe('running');
      expect(started.startedAt).toBeDefined();
      expect(started.runId).toBe(plan.runId); // original fields preserved
    });
  });

  describe('completeRun', () => {
    it('should set status to completed on success', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'running',
        startedAt: new Date(),
      });

      const completed = completeRun(plan, true);

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });

    it('should set status to failed on failure', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'running',
        startedAt: new Date(),
      });

      const completed = completeRun(plan, false);

      expect(completed.status).toBe('failed');
    });
  });

  describe('getExecutionDuration', () => {
    it('should return undefined if not started', () => {
      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
      });

      expect(getExecutionDuration(plan)).toBeUndefined();
    });

    it('should return duration in milliseconds', () => {
      const startedAt = new Date('2024-01-01T00:00:00Z');
      const completedAt = new Date('2024-01-01T00:00:05Z');

      const plan = createRunPlan({
        runId: 'run-1',
        specId: 'spec-1',
        envName: 'dev',
        selection: { mode: 'full' },
        status: 'completed',
        startedAt,
        completedAt,
      });

      expect(getExecutionDuration(plan)).toBe(5000);
    });
  });
});
