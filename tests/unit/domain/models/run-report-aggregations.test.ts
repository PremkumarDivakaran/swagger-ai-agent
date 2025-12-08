/**
 * Unit tests for RunReport aggregation functions
 */

import {
  calculateTagStats,
  calculateMethodStats,
  calculatePathStats,
  createRunReportWithAggregations,
  TestResultWithMetadata,
  TagStats,
  MethodStats,
  PathStats,
} from '../../../../src/domain/models/RunReport';

describe('RunReport Aggregation Functions', () => {
  // Helper function to create test result with metadata
  function createTestResult(
    id: string,
    status: 'passed' | 'failed' | 'error' | 'skipped',
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
      path?: string;
      tags?: string[];
    } = {}
  ): TestResultWithMetadata {
    const now = new Date();
    return {
      testCaseId: id,
      testCaseName: `Test ${id}`,
      operationId: `op-${id}`,
      status,
      assertions: [],
      duration: 100,
      retryAttempt: 0,
      startedAt: now,
      completedAt: now,
      method: options.method,
      path: options.path,
      tags: options.tags,
    };
  }

  describe('calculateTagStats', () => {
    it('should calculate tag statistics correctly', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed', { tags: ['pets', 'api'] }),
        createTestResult('2', 'passed', { tags: ['pets'] }),
        createTestResult('3', 'failed', { tags: ['pets', 'api'] }),
        createTestResult('4', 'error', { tags: ['users'] }),
      ];

      const stats = calculateTagStats(results);

      expect(stats).toHaveLength(3);

      const petsStats = stats.find(s => s.tag === 'pets');
      expect(petsStats).toEqual({
        tag: 'pets',
        total: 3,
        passed: 2,
        failed: 1,
        passRate: (2 / 3) * 100,
      });

      const apiStats = stats.find(s => s.tag === 'api');
      expect(apiStats).toEqual({
        tag: 'api',
        total: 2,
        passed: 1,
        failed: 1,
        passRate: 50,
      });

      const usersStats = stats.find(s => s.tag === 'users');
      expect(usersStats).toEqual({
        tag: 'users',
        total: 1,
        passed: 0,
        failed: 1,
        passRate: 0,
      });
    });

    it('should return empty array for results without tags', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed'),
        createTestResult('2', 'failed'),
      ];

      const stats = calculateTagStats(results);
      expect(stats).toHaveLength(0);
    });

    it('should handle empty results array', () => {
      const stats = calculateTagStats([]);
      expect(stats).toHaveLength(0);
    });

    it('should not count skipped tests as failed', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed', { tags: ['test'] }),
        createTestResult('2', 'skipped', { tags: ['test'] }),
      ];

      const stats = calculateTagStats(results);
      const testStats = stats.find(s => s.tag === 'test');
      expect(testStats).toEqual({
        tag: 'test',
        total: 2,
        passed: 1,
        failed: 0,
        passRate: 50,
      });
    });
  });

  describe('calculateMethodStats', () => {
    it('should calculate method statistics correctly', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed', { method: 'GET' }),
        createTestResult('2', 'passed', { method: 'GET' }),
        createTestResult('3', 'failed', { method: 'GET' }),
        createTestResult('4', 'passed', { method: 'POST' }),
        createTestResult('5', 'error', { method: 'POST' }),
        createTestResult('6', 'passed', { method: 'DELETE' }),
      ];

      const stats = calculateMethodStats(results);

      expect(stats).toHaveLength(3);

      const getStats = stats.find(s => s.method === 'GET');
      expect(getStats).toEqual({
        method: 'GET',
        total: 3,
        passed: 2,
        failed: 1,
        passRate: (2 / 3) * 100,
      });

      const postStats = stats.find(s => s.method === 'POST');
      expect(postStats).toEqual({
        method: 'POST',
        total: 2,
        passed: 1,
        failed: 1,
        passRate: 50,
      });

      const deleteStats = stats.find(s => s.method === 'DELETE');
      expect(deleteStats).toEqual({
        method: 'DELETE',
        total: 1,
        passed: 1,
        failed: 0,
        passRate: 100,
      });
    });

    it('should skip results without method', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed', { method: 'GET' }),
        createTestResult('2', 'passed'), // No method
      ];

      const stats = calculateMethodStats(results);
      expect(stats).toHaveLength(1);
      expect(stats[0].total).toBe(1);
    });

    it('should return empty array for results without methods', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed'),
        createTestResult('2', 'failed'),
      ];

      const stats = calculateMethodStats(results);
      expect(stats).toHaveLength(0);
    });
  });

  describe('calculatePathStats', () => {
    it('should calculate path statistics correctly', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed', { path: '/pets' }),
        createTestResult('2', 'passed', { path: '/pets' }),
        createTestResult('3', 'failed', { path: '/pets' }),
        createTestResult('4', 'passed', { path: '/pets/{petId}' }),
        createTestResult('5', 'error', { path: '/users' }),
      ];

      const stats = calculatePathStats(results);

      expect(stats).toHaveLength(3);

      const petsStats = stats.find(s => s.path === '/pets');
      expect(petsStats).toEqual({
        path: '/pets',
        total: 3,
        passed: 2,
        failed: 1,
        passRate: (2 / 3) * 100,
      });

      const petByIdStats = stats.find(s => s.path === '/pets/{petId}');
      expect(petByIdStats).toEqual({
        path: '/pets/{petId}',
        total: 1,
        passed: 1,
        failed: 0,
        passRate: 100,
      });

      const usersStats = stats.find(s => s.path === '/users');
      expect(usersStats).toEqual({
        path: '/users',
        total: 1,
        passed: 0,
        failed: 1,
        passRate: 0,
      });
    });

    it('should skip results without path', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed', { path: '/pets' }),
        createTestResult('2', 'passed'), // No path
      ];

      const stats = calculatePathStats(results);
      expect(stats).toHaveLength(1);
      expect(stats[0].total).toBe(1);
    });

    it('should return empty array for results without paths', () => {
      const results: TestResultWithMetadata[] = [
        createTestResult('1', 'passed'),
        createTestResult('2', 'failed'),
      ];

      const stats = calculatePathStats(results);
      expect(stats).toHaveLength(0);
    });
  });

  describe('createRunReportWithAggregations', () => {
    it('should create complete RunReport with all aggregations', () => {
      const startedAt = new Date('2024-01-01T10:00:00Z');
      const completedAt = new Date('2024-01-01T10:01:00Z');

      const resultsWithMetadata: TestResultWithMetadata[] = [
        createTestResult('1', 'passed', { method: 'GET', path: '/pets', tags: ['pets'] }),
        createTestResult('2', 'failed', { method: 'POST', path: '/pets', tags: ['pets'] }),
        createTestResult('3', 'passed', { method: 'GET', path: '/users', tags: ['users'] }),
      ];

      const report = createRunReportWithAggregations(
        {
          runId: 'run-1',
          specId: 'spec-1',
          envName: 'test',
          startedAt,
          completedAt,
        },
        resultsWithMetadata
      );

      // Check basic fields
      expect(report.runId).toBe('run-1');
      expect(report.specId).toBe('spec-1');
      expect(report.envName).toBe('test');
      expect(report.startedAt).toBe(startedAt);
      expect(report.completedAt).toBe(completedAt);
      expect(report.duration).toBe(60000); // 1 minute in ms

      // Check summary
      expect(report.summary.total).toBe(3);
      expect(report.summary.passed).toBe(2);
      expect(report.summary.failed).toBe(1);

      // Check tag stats
      expect(report.tagStats).toHaveLength(2);
      expect(report.tagStats.find(s => s.tag === 'pets')).toEqual({
        tag: 'pets',
        total: 2,
        passed: 1,
        failed: 1,
        passRate: 50,
      });

      // Check method stats
      expect(report.methodStats).toHaveLength(2);
      expect(report.methodStats.find(s => s.method === 'GET')).toEqual({
        method: 'GET',
        total: 2,
        passed: 2,
        failed: 0,
        passRate: 100,
      });

      // Check path stats
      expect(report.pathStats).toHaveLength(2);
      expect(report.pathStats.find(s => s.path === '/pets')).toEqual({
        path: '/pets',
        total: 2,
        passed: 1,
        failed: 1,
        passRate: 50,
      });

      // Check test results don't have metadata fields
      expect(report.testResults).toHaveLength(3);
      expect((report.testResults[0] as any).method).toBeUndefined();
      expect((report.testResults[0] as any).path).toBeUndefined();
      expect((report.testResults[0] as any).tags).toBeUndefined();
    });

    it('should handle empty results', () => {
      const startedAt = new Date('2024-01-01T10:00:00Z');
      const completedAt = new Date('2024-01-01T10:00:01Z');

      const report = createRunReportWithAggregations(
        {
          runId: 'run-1',
          specId: 'spec-1',
          envName: 'test',
          startedAt,
          completedAt,
        },
        []
      );

      expect(report.testResults).toHaveLength(0);
      expect(report.tagStats).toHaveLength(0);
      expect(report.methodStats).toHaveLength(0);
      expect(report.pathStats).toHaveLength(0);
      expect(report.summary.total).toBe(0);
    });

    it('should preserve optional fields from partial', () => {
      const startedAt = new Date('2024-01-01T10:00:00Z');
      const completedAt = new Date('2024-01-01T10:00:01Z');

      const report = createRunReportWithAggregations(
        {
          runId: 'run-1',
          specId: 'spec-1',
          envName: 'test',
          startedAt,
          completedAt,
          environmentDetails: {
            baseUrl: 'https://api.example.com',
            headers: { 'X-API-Key': 'test-key' },
          },
          runErrors: ['Connection timeout on startup'],
        },
        []
      );

      expect(report.environmentDetails).toEqual({
        baseUrl: 'https://api.example.com',
        headers: { 'X-API-Key': 'test-key' },
      });
      expect(report.runErrors).toEqual(['Connection timeout on startup']);
    });
  });
});
