/**
 * Test Report Page
 * Detailed test execution report
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { PageContainer } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
} from '@/components/common';
import { executionService } from '@/services';
import { useToast } from '@/stores';
import { cn, formatDuration, formatPercentage, formatDate, getMethodColor, formatMethod } from '@/utils';
import type { GetRunStatusResponse, TestResult } from '@/types';

export function TestReport() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [report, setReport] = useState<GetRunStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadReport = async () => {
    if (!runId) return;

    setIsLoading(true);
    setError(null);

    try {
      const status = await executionService.getRunStatus(runId, {
        includeDetails: true,
        includeAggregations: true,
      });
      setReport(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [runId]);

  const toggleExpanded = (operationId: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(operationId)) {
      newExpanded.delete(operationId);
    } else {
      newExpanded.add(operationId);
    }
    setExpandedTests(newExpanded);
  };

  const expandAll = () => {
    if (report?.testResults) {
      setExpandedTests(new Set(report.testResults.map((t) => t.testCaseId)));
    }
  };

  const collapseAll = () => {
    setExpandedTests(new Set());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', 'Content copied to clipboard');
  };

  const filteredTests = report?.testResults?.filter((test) => {
    if (filterStatus === 'all') return true;
    return test.status === filterStatus;
  }) || [];

  if (isLoading) {
    return (
      <PageContainer title="Test Report">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner label="Loading report..." size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Test Report">
        <ErrorMessage title="Failed to load report" message={error} onRetry={loadReport} />
      </PageContainer>
    );
  }

  if (!report) {
    return (
      <PageContainer title="Test Report">
        <EmptyState title="Report not found" description="The requested test report could not be found" />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Test Report"
      description={`Run ID: ${runId}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
          <Button variant="outline" onClick={loadReport} icon={<RefreshCw className="h-4 w-4" />}>
            Refresh
          </Button>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={report.status} size="lg" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {report.summary ? formatPercentage(report.summary.passRate) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">
                  {report.summary ? formatDuration(report.summary.totalDuration) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-100 dark:bg-gray-900/30 p-3">
                <AlertCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{report.summary?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Summary */}
      {report.summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => setFilterStatus('all')}
                className={cn(
                  'text-center p-4 rounded-lg border transition-colors',
                  filterStatus === 'all' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                )}
              >
                <p className="text-2xl font-bold">{report.summary.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </button>
              <button
                onClick={() => setFilterStatus('passed')}
                className={cn(
                  'text-center p-4 rounded-lg border transition-colors',
                  filterStatus === 'passed' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'hover:bg-accent'
                )}
              >
                <p className="text-2xl font-bold text-green-600">{report.summary.passed}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </button>
              <button
                onClick={() => setFilterStatus('failed')}
                className={cn(
                  'text-center p-4 rounded-lg border transition-colors',
                  filterStatus === 'failed' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:bg-accent'
                )}
              >
                <p className="text-2xl font-bold text-red-600">{report.summary.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </button>
              <button
                onClick={() => setFilterStatus('skipped')}
                className={cn(
                  'text-center p-4 rounded-lg border transition-colors',
                  filterStatus === 'skipped' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-accent'
                )}
              >
                <p className="text-2xl font-bold text-yellow-600">{report.summary.skipped}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Details</CardTitle>
              <CardDescription>
                {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} 
                {filterStatus !== 'all' && ` (filtered by ${filterStatus})`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTests.length === 0 ? (
            <EmptyState
              title="No tests found"
              description={filterStatus !== 'all' ? 'Try changing the filter' : 'No test results available'}
            />
          ) : (
            <div className="space-y-3">
              {filteredTests.map((test) => (
                <TestResultCard
                  key={test.operationId}
                  test={test}
                  isExpanded={expandedTests.has(test.testCaseId)}
                  onToggle={() => toggleExpanded(test.testCaseId)}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Run Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Run ID</p>
              <p className="font-mono text-sm">{report.runId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Spec ID</p>
              <p className="font-mono text-sm">{report.specId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Environment</p>
              <p className="font-medium">{report.envName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(report.createdAt)}</p>
            </div>
            {report.startedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">{formatDate(report.startedAt)}</p>
              </div>
            )}
            {report.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">{formatDate(report.completedAt)}</p>
              </div>
            )}
            {report.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{report.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

// Test Result Card Component
interface TestResultCardProps {
  test: TestResult;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
}

function TestResultCard({ test, isExpanded, onToggle, onCopy }: TestResultCardProps) {
  // Extract method from testCaseName (e.g., "POST /pet - Happy Path" -> "POST")
  const method = test.request?.method || test.testCaseName?.split(' ')[0] || 'GET';
  // Extract path from testCaseName (e.g., "POST /pet/{petId}/uploadImage - Happy Path" -> "/pet/{petId}/uploadImage")
  const pathMatch = test.testCaseName?.match(/^\w+\s+(\/[^\s]+)/);
  const path = test.request?.url || pathMatch?.[1] || '';
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <StatusBadge status={test.status} iconOnly />
          <span className={cn('px-2 py-0.5 rounded text-xs font-bold', getMethodColor(method))}>
            {formatMethod(method)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{test.testCaseName || test.operationId}</p>
            <p className="text-sm text-muted-foreground truncate">{path}</p>
            {test.skipReason && (
              <p className="text-xs text-yellow-600 mt-1">{test.skipReason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {test.duration !== undefined && test.duration > 0 && (
            <span className="text-sm text-muted-foreground">{formatDuration(test.duration)}</span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-4 bg-muted/30 space-y-4">
          {/* Request */}
          {test.request && test.request.url && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Request</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(JSON.stringify(test.request, null, 2))}
                  icon={<Copy className="h-3 w-3" />}
                >
                  Copy
                </Button>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <p className="text-sm font-mono mb-2">
                  {test.request.method} {test.request.url}
                </p>
                {test.request.headers && Object.keys(test.request.headers).length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Headers</summary>
                    <pre className="mt-2 text-xs overflow-x-auto">
                      {JSON.stringify(test.request.headers, null, 2)}
                    </pre>
                  </details>
                )}
                {test.request.body ? (
                  <details className="text-sm mt-2">
                    <summary className="cursor-pointer text-muted-foreground">Body</summary>
                    <pre className="mt-2 text-xs overflow-x-auto">
                      {typeof test.request.body === 'string' 
                        ? test.request.body 
                        : JSON.stringify(test.request.body as object, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </div>
          )}

          {/* Response */}
          {test.response && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Response</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(JSON.stringify(test.response, null, 2))}
                  icon={<Copy className="h-3 w-3" />}
                >
                  Copy
                </Button>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-bold',
                      test.response.statusCode >= 200 && test.response.statusCode < 300
                        ? 'bg-green-100 text-green-700'
                        : test.response.statusCode >= 400
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {test.response.statusCode}
                  </span>
                  <span className="text-sm text-muted-foreground">{test.response.statusText}</span>
                  {test.response.responseTime && (
                    <span className="text-sm text-muted-foreground">• {formatDuration(test.response.responseTime)}</span>
                  )}
                </div>
                {test.response.body ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Body (may be truncated)</summary>
                    <pre className="mt-2 text-xs overflow-x-auto max-h-64">
                      {typeof test.response.body === 'string'
                        ? test.response.body.substring(0, 5000) + (test.response.body.length > 5000 ? '...' : '')
                        : JSON.stringify(test.response.body as object, null, 2).substring(0, 5000)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </div>
          )}

          {/* Assertions */}
          {test.assertions && test.assertions.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Assertions</h4>
              <div className="space-y-2">
                {test.assertions.map((assertion, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-lg text-sm',
                      assertion.passed
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    )}
                  >
                    {assertion.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{assertion.description}</span>
                      {!assertion.passed && assertion.error && (
                        <p className="text-red-600 text-xs mt-1">{assertion.error}</p>
                      )}
                      {!assertion.passed && assertion.expected !== undefined && (
                        <p className="text-muted-foreground text-xs mt-1">
                          Expected: {String(assertion.expected)}, Actual: {String(assertion.actual)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {test.error && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-red-600">Error</h4>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{test.error.message}</p>
                {test.error.stack && (
                  <details className="text-sm mt-2">
                    <summary className="cursor-pointer text-red-600">Stack Trace</summary>
                    <pre className="mt-2 text-xs overflow-x-auto text-red-600">{test.error.stack}</pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TestReport;
