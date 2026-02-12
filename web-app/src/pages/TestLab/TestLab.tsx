import { useState, useEffect } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common';
import { useToast } from '@/hooks';
import { useSpecStore } from '@/stores';
import { specService, testgenService } from '@/services';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft,
  Beaker,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * TestLab - AI REST Assured Test Generation and Execution
 * Step-by-step wizard: Select Spec → Configure → Launch AI → View Results
 */

type Step = 'select' | 'configure' | 'generate' | 'execute';

const steps: { id: Step; label: string; description: string }[] = [
  { id: 'select', label: 'Select Spec', description: 'Choose specification and operations' },
  { id: 'configure', label: 'Configure', description: 'Set options' },
  { id: 'generate', label: 'Launch AI', description: 'AI writes and runs tests' },
  { id: 'execute', label: 'Results', description: 'View test results' },
];

export function TestLab() {
  const toast = useToast();
  const specs = useSpecStore((state) => state.specs);
  const setSpecs = useSpecStore((state) => state.setSpecs);
  const operations = useSpecStore((state) => state.operations);
  const setOperations = useSpecStore((state) => state.setOperations);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

  // Step 1: Select state
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<'full' | 'tag' | 'single'>('full');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedOperationIds, setSelectedOperationIds] = useState<string[]>([]);

  // Step 2: Configure state
  const [baseDirectory, setBaseDirectory] = useState('./swagger-tests');
  const [maxIterations, setMaxIterations] = useState(5);

  // Step 3/4: Agent state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [agentRunId, setAgentRunId] = useState<string>('');
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [agentLog, setAgentLog] = useState<{ timestamp: string; phase: string; message: string }[]>([]);
  const [testSuitePath, setTestSuitePath] = useState<string>('');

  // Load specs on mount
  useEffect(() => {
    loadSpecs();
  }, []);

  // Reload specs when returning to select step
  useEffect(() => {
    if (currentStep === 'select') {
      loadSpecs();
    }
  }, [currentStep]);

  // Load operations when spec selected
  useEffect(() => {
    if (selectedSpecId) {
      loadOperations(selectedSpecId);
    }
  }, [selectedSpecId]);

  const loadSpecs = async () => {
    try {
      const response = await specService.listSpecs();
      setSpecs(response.specs || []);
    } catch (error) {
      console.error('Failed to load specs:', error);
      toast.error('Failed to load specifications');
    }
  };

  const loadOperations = async (specId: string) => {
    try {
      const response = await specService.listOperations(specId);
      setOperations(response.operations || []);
    } catch (error) {
      console.error('Failed to load operations:', error);
      toast.error('Failed to load operations');
    }
  };

  const goToStep = (step: Step) => {
    const stepIndex = steps.findIndex((s) => s.id === step);
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex > currentIndex) {
      const canProceed = steps.slice(0, stepIndex).every((s) => completedSteps.has(s.id));
      if (!canProceed) return;
    }
    setCurrentStep(step);
  };

  const completeStep = (step: Step) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  };

  const handleSelectComplete = () => {
    if (!selectedSpecId) {
      toast.error('Please select a specification');
      return;
    }
    completeStep('select');
    setCurrentStep('configure');
  };

  const handleConfigureComplete = () => {
    completeStep('configure');
    setCurrentStep('generate');
  };

  const handleLaunchAgent = async () => {
    setIsGenerating(true);
    try {
      const response = await testgenService.startAgentRun({
        specId: selectedSpecId,
        maxIterations,
        baseDirectory,
        basePackage: 'com.api.tests',
        autoExecute: true,
      });

      if (response?.runId) {
        setAgentRunId(response.runId);
        setAgentLog([]);
        setAgentStatus(null);
        toast.success('AI REST Assured started! Watching progress...');
        completeStep('generate');
        setTimeout(() => setCurrentStep('execute'), 100);

        // Start polling agent status
        setIsExecuting(true);
        const pollInterval = setInterval(async () => {
          try {
            const status = await testgenService.getAgentRunStatus(response.runId);
            setAgentStatus(status);
            setAgentLog(status.log || []);
            if (status.testSuitePath) setTestSuitePath(status.testSuitePath);

            if (status.phase === 'completed' || status.phase === 'failed') {
              clearInterval(pollInterval);
              setIsExecuting(false);
              setIsGenerating(false);
              completeStep('execute');
              if (status.phase === 'completed') {
                toast.success(`AI REST Assured completed: ${status.finalResult?.passed}/${status.finalResult?.total} tests passed`);
              } else {
                toast.error(status.error || 'AI REST Assured run failed');
              }
            }
          } catch {
            clearInterval(pollInterval);
            setIsExecuting(false);
            setIsGenerating(false);
            toast.error('Lost connection to AI REST Assured');
          }
        }, 2500);
      } else {
        toast.error('Failed to start AI REST Assured');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to launch AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStepStatus = (step: Step): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.has(step)) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  const handleReset = () => {
    setCurrentStep('select');
    setCompletedSteps(new Set());
    setAgentRunId('');
    setAgentStatus(null);
    setAgentLog([]);
    setTestSuitePath('');
    setIsExecuting(false);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Beaker className="h-8 w-8 text-primary" />
          Test Lab
        </h1>
        <p className="text-muted-foreground">
          AI-powered API test generation — autonomous REST Assured tests with self-healing
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 flex-1 p-4 rounded-lg transition-all',
                    status === 'current' && 'bg-primary/10',
                    status === 'upcoming' && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'rounded-full p-2',
                    status === 'completed' && 'bg-green-500 text-white',
                    status === 'current' && 'bg-primary text-primary-foreground',
                    status === 'upcoming' && 'bg-muted text-muted-foreground'
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </button>

                {!isLast && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-6">
        {/* Step 1: Select Spec */}
        {currentStep === 'select' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Select Specification</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Specification</label>
                <select
                  value={selectedSpecId}
                  onChange={(e) => setSelectedSpecId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select a specification...</option>
                  {specs.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.title} v{spec.version} ({spec.operationCount} operations)
                    </option>
                  ))}
                </select>
                {specs.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No specifications found. Please import a spec from the{' '}
                    <a href="/specs?tab=import" className="text-primary hover:underline">
                      Specs page
                    </a>
                    .
                  </p>
                )}
              </div>

              {selectedSpecId && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Operation Selection</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectionMode === 'full'}
                          onChange={() => setSelectionMode('full')}
                          className="text-primary"
                        />
                        <span>All Operations</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectionMode === 'tag'}
                          onChange={() => setSelectionMode('tag')}
                          className="text-primary"
                        />
                        <span>Filter by Tags</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectionMode === 'single'}
                          onChange={() => setSelectionMode('single')}
                          className="text-primary"
                        />
                        <span>Select Specific Operations</span>
                      </label>
                    </div>
                  </div>

                  {selectionMode === 'tag' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Tags</label>
                      <input
                        type="text"
                        placeholder="Enter tags (comma-separated)"
                        value={selectedTags.join(', ')}
                        onChange={(e) => setSelectedTags(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      />
                    </div>
                  )}

                  {selectionMode === 'single' && operations.length > 0 && (
                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                      {operations.map((op) => (
                        <label key={op.operationId} className="flex items-center gap-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedOperationIds.includes(op.operationId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOperationIds([...selectedOperationIds, op.operationId]);
                              } else {
                                setSelectedOperationIds(selectedOperationIds.filter((id) => id !== op.operationId));
                              }
                            }}
                            className="text-primary"
                          />
                          <span className="text-sm">
                            <span className="font-mono text-xs px-2 py-1 bg-muted rounded">
                              {op.method?.toUpperCase()}
                            </span>{' '}
                            {op.path}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSelectComplete} disabled={!selectedSpecId}>
                Next: Configure
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {currentStep === 'configure' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Configure AI REST Assured</h2>
            
            <div className="space-y-4">
              {/* AI Mode info card */}
              <div className="rounded-lg border-2 border-purple-400 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-700 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-1">
                      AI REST Assured Mode
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-400">
                      AI analyzes your spec, writes REST Assured + JUnit 5 tests, executes them,
                      and automatically self-heals failures. Fully autonomous — no templates.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Base Directory</label>
                <input
                  type="text"
                  value={baseDirectory}
                  onChange={(e) => setBaseDirectory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="./swagger-tests"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Self-Healing Iterations: <span className="text-primary font-bold">{maxIterations}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 (fast)</span>
                  <span>10 (thorough)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('select')}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleConfigureComplete}>
                Next: Launch AI
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Launch AI */}
        {currentStep === 'generate' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Launch AI REST Assured</h2>
            
            {!agentRunId && (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                <p className="text-muted-foreground mb-6">
                  AI will analyze your spec, write REST Assured tests, execute them, and self-heal failures
                </p>
                <Button
                  onClick={handleLaunchAgent}
                  disabled={isGenerating}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isGenerating ? 'Launching...' : 'Launch AI REST Assured'}
                </Button>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('configure')} disabled={isGenerating}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {currentStep === 'execute' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">AI REST Assured Progress</h2>

            {/* Agent phase badge */}
            {agentStatus && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                  agentStatus.phase === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  agentStatus.phase === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                )}>
                  {isExecuting && <LoadingSpinner size="sm" />}
                  {agentStatus.phase.toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground">
                  Iteration {agentStatus.currentIteration}/{agentStatus.maxIterations}
                </span>
                {agentStatus.testPlan && (
                  <span className="text-sm text-muted-foreground">
                    | {agentStatus.testPlan.itemCount} operations, {agentStatus.testPlan.dependencyCount} dependencies
                  </span>
                )}
              </div>
            )}

            {/* Test plan reasoning */}
            {agentStatus?.testPlan && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="font-semibold text-sm mb-1">AI Strategy</h4>
                <p className="text-sm text-muted-foreground">{agentStatus.testPlan.reasoning}</p>
              </div>
            )}

            {/* Live log */}
            <div className="rounded-lg border bg-black/90 text-green-400 p-4 font-mono text-xs max-h-80 overflow-y-auto">
              {agentLog.length === 0 && (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Starting AI REST Assured...</span>
                </div>
              )}
              {agentLog.map((entry, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-gray-500">[{entry.phase}]</span> {entry.message}
                </div>
              ))}
            </div>

            {/* Iteration history */}
            {agentStatus?.iterations && agentStatus.iterations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Iteration History</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {agentStatus.iterations.map((it: any) => (
                    <div key={it.iteration} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium mb-1">Iteration {it.iteration}</div>
                      <div className="text-green-600">{it.passed} passed</div>
                      <div className="text-red-600">{it.failed} failed</div>
                      {it.fixesApplied > 0 && (
                        <div className="text-purple-600">{it.fixesApplied} fixes applied</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final result */}
            {agentStatus?.finalResult && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Final Results
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{agentStatus.finalResult.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-2xl font-bold text-green-600">{agentStatus.finalResult.passed}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="text-2xl font-bold text-red-600">{agentStatus.finalResult.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="text-2xl font-bold text-yellow-600">{agentStatus.finalResult.skipped}</div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                </div>
                {testSuitePath && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Tests saved to: <code className="bg-muted px-2 py-0.5 rounded">{testSuitePath}</code>
                  </div>
                )}
              </Card>
            )}

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('generate')}
                disabled={isExecuting}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleReset} disabled={isExecuting}>
                {isExecuting ? 'Running...' : 'Start New Test'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TestLab;
