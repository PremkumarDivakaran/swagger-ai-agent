/**
 * Test Execution Page
 * Create plans and run API tests
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
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
  type Status,
} from '@/components/common';
import { specService, executionService, environmentService } from '@/services';
import { useSpecStore, useExecutionStore, useToast } from '@/stores';
import { cn, formatDuration, formatPercentage } from '@/utils';
import type { Environment, SelectionCriteria } from '@/types';

export function TestExecution() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const specs = useSpecStore((state) => state.specs);
  const setSpecs = useSpecStore((state) => state.setSpecs);
  const storedSelectedOperationIds = useSpecStore((state) => state.selectedOperationIds);
  const operations = useSpecStore((state) => state.operations);
  
  const currentPlan = useExecutionStore((state) => state.currentPlan);
  const setCurrentPlan = useExecutionStore((state) => state.setCurrentPlan);
  const currentStatus = useExecutionStore((state) => state.currentStatus);
  const setCurrentStatus = useExecutionStore((state) => state.setCurrentStatus);
  const setPolling = useExecutionStore((state) => state.setPolling);

  const [selectedSpecId, setSelectedSpecId] = useState<string>(searchParams.get('specId') || '');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvName, setSelectedEnvName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  // Selection mode - 'full' runs all or selected operations, 'tag' filters by tag
  const [selectionMode, setSelectionMode] = useState<'full' | 'tag'>('full');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config options
  const [parallel, setParallel] = useState(false);
  const [stopOnFailure, setStopOnFailure] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Load specs
  useEffect(() => {
    const loadSpecs = async () => {
      setIsLoadingSpecs(true);
      try {
        const response = await specService.listSpecs();
        setSpecs(response.specs);
      } catch (err) {
        console.error('Failed to load specs:', err);
      } finally {
        setIsLoadingSpecs(false);
      }
    };

    if (specs.length === 0) {
      loadSpecs();
    }
  }, []);

  // Load operations when spec changes (needed for exclude calculation)
  const setOperations = useSpecStore((state) => state.setOperations);
  useEffect(() => {
    const loadOperations = async () => {
      if (!selectedSpecId) return;
      
      try {
        const response = await specService.listOperations(selectedSpecId);
        setOperations(response.operations);
      } catch (err) {
        console.error('Failed to load operations:', err);
      }
    };

    // Only load if we have selected operations (need all ops to calculate exclude)
    if (selectedSpecId && storedSelectedOperationIds.length > 0 && operations.length === 0) {
      loadOperations();
    }
  }, [selectedSpecId, storedSelectedOperationIds.length]);

  // Load environments when spec changes
  // Load environments and spec metadata when spec changes
  useEffect(() => {
    const loadEnvironmentsAndSpecMeta = async () => {
      if (!selectedSpecId) {
        setEnvironments([]);
        setBaseUrl('');
        return;
      }

      try {
        // Load environments
        const envResponse = await environmentService.listEnvironments(selectedSpecId);
        setEnvironments(envResponse.environments);
        
        if (envResponse.environments.length > 0) {
          // Use existing environment
          setSelectedEnvName(envResponse.environments[0].name);
          setBaseUrl(envResponse.environments[0].baseUrl);
        } else {
          // No environments - get default URL from spec's server info
          try {
            const specMeta = await specService.getSpec(selectedSpecId);
            if (specMeta.servers && specMeta.servers.length > 0) {
              // Use the first server URL (includes scheme, host, and basePath)
              setBaseUrl(specMeta.servers[0].url);
            } else {
              setBaseUrl('');
            }
          } catch (specErr) {
            console.error('Failed to load spec metadata:', specErr);
            setBaseUrl('');
          }
        }
      } catch (err) {
        // Environments might not exist yet - try to get URL from spec
        setEnvironments([]);
        try {
          const specMeta = await specService.getSpec(selectedSpecId);
          if (specMeta.servers && specMeta.servers.length > 0) {
            setBaseUrl(specMeta.servers[0].url);
          } else {
            setBaseUrl('');
          }
        } catch (specErr) {
          console.error('Failed to load spec metadata:', specErr);
          setBaseUrl('');
        }
      }
    };

    loadEnvironmentsAndSpecMeta();
  }, [selectedSpecId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const startPolling = (runId: string) => {
    setPolling(true);
    
    const poll = async () => {
      try {
        const status = await executionService.getRunStatus(runId, {
          includeDetails: true,
          includeAggregations: true,
        });
        setCurrentStatus(status);

        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          stopPolling();
          if (status.status === 'completed') {
            toast.success('Test Run Complete', `${status.summary?.passed || 0} passed, ${status.summary?.failed || 0} failed`);
          } else if (status.status === 'failed') {
            toast.error('Test Run Failed', 'Some tests failed');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
  };

  const handleCreatePlan = async () => {
    if (!selectedSpecId) {
      toast.error('Error', 'Please select a specification');
      return;
    }

    // Note: baseUrl is optional - backend will use spec's default server URL if not provided

    setIsCreatingPlan(true);
    setError(null);

    try {
      // If no environment exists, create one (backend will use spec's default server URL)
      let envName = selectedEnvName;
      if (!envName) {
        const newEnv = await environmentService.createEnvironment({
          name: 'default',
          specId: selectedSpecId,
          baseUrl: baseUrl || undefined, // Optional - backend auto-populates from spec
        });
        envName = newEnv.name;
        // Update baseUrl with the one returned from backend (may have been auto-populated)
        if (newEnv.baseUrl) {
          setBaseUrl(newEnv.baseUrl);
        }
        setEnvironments([...environments, newEnv]);
        setSelectedEnvName(envName);
      }

      // Build selection criteria
      const selection: SelectionCriteria = {
        mode: selectionMode === 'full' ? 'full' : 'tag',
      };
      
      // If we have selected operations from Operations page and mode is 'full',
      // use exclude to filter down to only selected operations
      if (selectionMode === 'full' && storedSelectedOperationIds.length > 0) {
        // Get all operation IDs and exclude the ones NOT selected
        const allOperationIds = operations.map(op => op.operationId);
        const excludeIds = allOperationIds.filter(id => !storedSelectedOperationIds.includes(id));
        if (excludeIds.length > 0) {
          selection.exclude = excludeIds;
        }
      }
      
      if (selectionMode === 'tag' && selectedTags.length > 0) {
        selection.tags = selectedTags;
      }

      const plan = await executionService.createRunPlan({
        specId: selectedSpecId,
        envName: envName,
        selection,
        description: description || undefined,
        config: {
          parallel,
          stopOnFailure,
        },
      });

      setCurrentPlan(plan);
      toast.success('Plan Created', `Created plan with ${plan.testCount} tests`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create plan';
      setError(message);
      toast.error('Error', message);
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleRunTests = async () => {
    if (!currentPlan) {
      toast.error('Error', 'No plan to run');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const result = await executionService.executeRun({
        runId: currentPlan.runId,
      });

      toast.info('Tests Started', result.message);
      startPolling(result.runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run tests';
      setError(message);
      toast.error('Error', message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleViewReport = () => {
    if (currentStatus) {
      navigate(`/report/${currentStatus.runId}`);
    }
  };

  const handleReset = () => {
    stopPolling();
    setCurrentPlan(null);
    setCurrentStatus(null);
    setError(null);
  };

  const isTestsRunning = currentStatus?.status === 'running';
  const isCompleted = currentStatus?.status === 'completed' || currentStatus?.status === 'failed';

  return (
    <PageContainer
      title="Test Execution"
      description="Create test plans and run API tests"
      actions={
        isCompleted && (
          <Button variant="outline" onClick={handleReset} icon={<RefreshCw className="h-4 w-4" />}>
            New Run
          </Button>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Spec Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Specification</CardTitle>
              <CardDescription>Choose an imported OpenAPI spec to test</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSpecs ? (
                <LoadingSpinner label="Loading specs..." />
              ) : specs.length === 0 ? (
                <EmptyState
                  title="No specifications"
                  description="Import a spec first to run tests"
                  action={
                    <Button variant="outline" onClick={() => navigate('/import')}>
                      Import Spec
                    </Button>
                  }
                />
              ) : (
                <select
                  value={selectedSpecId}
                  onChange={(e) => setSelectedSpecId(e.target.value)}
                  disabled={!!currentPlan}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">Select a specification...</option>
                  {specs.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.title} (v{spec.version}) - {spec.operationCount} operations
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>

          {/* Environment */}
          <Card>
            <CardHeader>
              <CardTitle>2. Configure Environment</CardTitle>
              <CardDescription>Set the base URL for API requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {environments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Environment</label>
                  <select
                    value={selectedEnvName}
                    onChange={(e) => {
                      setSelectedEnvName(e.target.value);
                      const env = environments.find((en) => en.name === e.target.value);
                      if (env) setBaseUrl(env.baseUrl);
                    }}
                    disabled={!!currentPlan}
                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    {environments.map((env) => (
                      <option key={env.envId} value={env.name}>
                        {env.name} - {env.baseUrl}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Base URL
                  <span className="text-xs text-muted-foreground ml-2">(optional - auto-populated from spec)</span>
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={!!currentPlan}
                  placeholder={environments.length === 0 ? "Leave empty to use spec's default URL" : "https://api.example.com"}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                {baseUrl && environments.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Using URL from spec: {baseUrl}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!!currentPlan}
                  placeholder="Test run description"
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Selection Mode */}
          <Card>
            <CardHeader>
              <CardTitle>3. Select Operations</CardTitle>
              <CardDescription>Choose which operations to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Selection Mode</label>
                <select
                  value={selectionMode}
                  onChange={(e) => setSelectionMode(e.target.value as 'full' | 'tag')}
                  disabled={!!currentPlan}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="full">
                    {storedSelectedOperationIds.length > 0 
                      ? `Selected Operations (${storedSelectedOperationIds.length})` 
                      : 'All Operations'}
                  </option>
                  <option value="tag">By Tag</option>
                </select>
              </div>

              {selectionMode === 'full' && storedSelectedOperationIds.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Running {storedSelectedOperationIds.length} selected operation(s):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {storedSelectedOperationIds.slice(0, 5).map((id) => (
                      <span key={id} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                        {id}
                      </span>
                    ))}
                    {storedSelectedOperationIds.length > 5 && (
                      <span className="px-2 py-0.5 bg-muted-foreground/20 text-muted-foreground text-xs rounded">
                        +{storedSelectedOperationIds.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectionMode === 'tag' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      // Parse tags on change
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      setSelectedTags(tags);
                    }}
                    disabled={!!currentPlan}
                    placeholder="pet, store, user"
                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                  {selectedTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedTags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Config Options */}
          <Card>
            <CardHeader>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <CardTitle>4. Run Options</CardTitle>
                  <CardDescription>Advanced execution settings</CardDescription>
                </div>
                <Settings className={cn('h-5 w-5 transition-transform', showConfig && 'rotate-90')} />
              </button>
            </CardHeader>
            {showConfig && (
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={parallel}
                    onChange={(e) => setParallel(e.target.checked)}
                    disabled={!!currentPlan}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span>Run tests in parallel</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={stopOnFailure}
                    onChange={(e) => setStopOnFailure(e.target.checked)}
                    disabled={!!currentPlan}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span>Stop on first failure</span>
                </label>
              </CardContent>
            )}
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            {!currentPlan ? (
              <Button
                onClick={handleCreatePlan}
                loading={isCreatingPlan}
                disabled={!selectedSpecId || (!selectedEnvName && !baseUrl)}
                className="flex-1"
              >
                Create Test Plan
              </Button>
            ) : !isTestsRunning && !isCompleted ? (
              <>
                <Button
                  onClick={handleRunTests}
                  loading={isRunning}
                  icon={<Play className="h-4 w-4" />}
                  className="flex-1"
                >
                  Run Tests
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
              </>
            ) : isTestsRunning ? (
              <Button variant="destructive" onClick={stopPolling} icon={<Square className="h-4 w-4" />}>
                Stop Polling
              </Button>
            ) : (
              <Button onClick={handleViewReport} className="flex-1">
                View Detailed Report
              </Button>
            )}
          </div>

          {error && <ErrorMessage message={error} />}
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Plan Summary */}
          {currentPlan && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Test Plan</CardTitle>
                  <StatusBadge status={(currentStatus?.status || currentPlan.status) as Status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Run ID</p>
                    <p className="font-mono text-sm truncate">{currentPlan.runId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tests</p>
                    <p className="font-semibold">{currentPlan.testCount}</p>
                  </div>
                </div>

                {currentPlan.description && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p>{currentPlan.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {currentStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Progress Bar - compute from summary if available */}
                {(() => {
                  const summary = currentStatus.summary;
                  const total = summary?.total || currentStatus.testCount || 0;
                  const completed = summary ? (summary.passed + summary.failed + summary.skipped) : 0;
                  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                  
                  return (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>{completed} / {total}</span>
                        <span>{formatPercentage(percentage)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Aggregations - use summary instead */}
                {currentStatus.summary && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-green-600">{currentStatus.summary.passed}</p>
                      <p className="text-xs text-muted-foreground">Passed</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-red-600">{currentStatus.summary.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-yellow-600">{currentStatus.summary.skipped}</p>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </div>
                  </div>
                )}

                {/* Duration */}
                {currentStatus.summary && currentStatus.summary.totalDuration > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Duration</span>
                      <span className="font-medium">{formatDuration(currentStatus.summary.totalDuration)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Pass Rate</span>
                      <span className="font-medium">{formatPercentage(currentStatus.summary.passRate)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test Results List */}
          {currentStatus?.testResults && currentStatus.testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {currentStatus.testResults.map((test) => {
                    // Extract method from testCaseName or request
                    const method = test.request?.method || test.testCaseName?.split(' ')[0] || 'GET';
                    return (
                      <div
                        key={test.testCaseId}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge status={test.status} iconOnly size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{test.testCaseName || test.operationId}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {method.toUpperCase()} {test.request?.url || ''}
                            </p>
                            {test.skipReason && (
                              <p className="text-xs text-yellow-600">{test.skipReason}</p>
                            )}
                          </div>
                        </div>
                        {test.duration !== undefined && test.duration > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(test.duration)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!currentPlan && !currentStatus && (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Play}
                  title="No active test run"
                  description="Select a specification and configure the environment to create a test plan"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default TestExecution;
