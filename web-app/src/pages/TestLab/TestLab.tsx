import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  LoadingSpinner,
} from '@/components/common';
import { useToast } from '@/hooks';
import { useSpecStore } from '@/stores';
import { specService, testgenService } from '@/services';
import type { AgentRunFile, AgentPushRequest, AgentPushResponse } from '@/services/testgen.service';
import { apiConfig } from '@/config/api.config';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Beaker,
  Sparkles,
  BarChart2,
  FileCode,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Send,
  Rocket,
  Settings2,
  Eye,
  ArrowRight,
  Zap,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { cn } from '@/utils/cn';

type Step = 'select' | 'configure' | 'generate' | 'execute' | 'review' | 'push';

const STEPS: { id: Step; label: string; icon: any; color: string }[] = [
  { id: 'select', label: 'Select', icon: FileCode, color: 'from-blue-500 to-cyan-500' },
  { id: 'configure', label: 'Configure', icon: Settings2, color: 'from-violet-500 to-purple-500' },
  { id: 'generate', label: 'Launch AI', icon: Rocket, color: 'from-orange-500 to-amber-500' },
  { id: 'execute', label: 'Results', icon: BarChart2, color: 'from-green-500 to-emerald-500' },
  { id: 'review', label: 'Review', icon: Eye, color: 'from-pink-500 to-rose-500' },
  { id: 'push', label: 'GitHub', icon: GitBranch, color: 'from-gray-600 to-gray-800' },
];

const SESSION_KEY = 'testlab-session';

export function TestLab() {
  const toast = useToast();
  const specs = useSpecStore((s) => s.specs);
  const setSpecs = useSpecStore((s) => s.setSpecs);
  const operations = useSpecStore((s) => s.operations);
  const setOperations = useSpecStore((s) => s.setOperations);

  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

  // Step 1
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [selectionMode, setSelectionMode] = useState<'full' | 'tag' | 'single'>('full');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedOperationIds, setSelectedOperationIds] = useState<string[]>([]);

  // Step 2
  const [baseDirectory, setBaseDirectory] = useState('./swagger-tests');
  const [maxIterations, setMaxIterations] = useState(5);

  // Step 3/4
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [agentRunId, setAgentRunId] = useState('');
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [agentLog, setAgentLog] = useState<{ timestamp: string; phase: string; message: string }[]>([]);
  const [testSuitePath, setTestSuitePath] = useState('');

  // Step 5
  const [reviewFiles, setReviewFiles] = useState<AgentRunFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [rerunning, setRerunning] = useState(false);

  // Step 6
  const [repoFullName, setRepoFullName] = useState('PremkumarDivakaran/swagger-tests');
  const [branchName, setBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<AgentPushResponse | null>(null);

  const [showAllure, setShowAllure] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [restored, setRestored] = useState(false);

  const loadSpecs = async () => { try { const r = await specService.listSpecs(); setSpecs(r.specs || []); } catch { toast.error('Failed to load specs'); } };
  const loadOperations = async (id: string) => { try { const r = await specService.listOperations(id); setOperations(r.operations || []); } catch { toast.error('Failed to load operations'); } };

  // ── Restore session state on mount (validate against backend first) ──
  useEffect(() => {
    let cancelled = false;

    const restoreState = (s: any) => {
      setCurrentStep(s.currentStep || 'select');
      setCompletedSteps(new Set(s.completedSteps || []));
      setSelectedSpecId(s.selectedSpecId || '');
      setSelectionMode(s.selectionMode || 'full');
      setSelectedTags(s.selectedTags || []);
      setSelectedOperationIds(s.selectedOperationIds || []);
      setBaseDirectory(s.baseDirectory || './swagger-tests');
      setMaxIterations(s.maxIterations ?? 5);
      setAgentRunId(s.agentRunId);
      setTestSuitePath(s.testSuitePath || '');
      setReviewFiles(s.reviewFiles || []);
      setPushResult(s.pushResult || null);
      setShowAllure(s.showAllure || false);
    };

    const restore = async () => {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const s = JSON.parse(saved);
          if (s.agentRunId) {
            // Validate the saved run still exists on the backend
            try {
              const status = await testgenService.getAgentRunStatus(s.agentRunId);
              if (cancelled) return;
              // Backend recognizes this run — restore state with fresh status
              restoreState(s);
              setAgentStatus(status);
              setAgentLog(status.log || []);
            } catch {
              // Backend returned 404 or error — server was restarted, clear stale state
              if (cancelled) return;
              sessionStorage.removeItem(SESSION_KEY);
            }
          }
        }
      } catch { /* ignore parse errors */ }
      if (!cancelled) {
        setRestored(true);
        loadSpecs();
      }
    };

    restore();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist session state on changes ──
  useEffect(() => {
    if (!restored) return;
    if (!agentRunId && currentStep === 'select') {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      currentStep,
      completedSteps: Array.from(completedSteps),
      selectedSpecId,
      selectionMode,
      selectedTags,
      selectedOperationIds,
      baseDirectory,
      maxIterations,
      agentRunId,
      agentStatus,
      agentLog,
      testSuitePath,
      reviewFiles,
      pushResult,
      showAllure,
    }));
  }, [restored, currentStep, completedSteps, selectedSpecId, selectionMode,
      selectedTags, selectedOperationIds, baseDirectory, maxIterations,
      agentRunId, agentStatus, agentLog, testSuitePath, reviewFiles,
      pushResult, showAllure]);

  // ── Resume polling if restored mid-execution ──
  useEffect(() => {
    if (!restored || !agentRunId) return;
    const phase = agentStatus?.phase;
    if (phase && phase !== 'completed' && phase !== 'failed') {
      setIsExecuting(true);
      const poll = setInterval(async () => {
        try {
          const s = await testgenService.getAgentRunStatus(agentRunId);
          setAgentStatus(s);
          setAgentLog(s.log || []);
          if (s.testSuitePath) setTestSuitePath(s.testSuitePath);
          if (s.phase === 'completed' || s.phase === 'failed') {
            clearInterval(poll);
            setIsExecuting(false);
            completeStep('execute');
            if (s.phase === 'completed') toast.success(`Done: ${s.finalResult?.passed}/${s.finalResult?.total} passed`);
            else toast.error(s.error || 'Run failed');
          }
        } catch { clearInterval(poll); setIsExecuting(false); }
      }, 2500);
      return () => clearInterval(poll);
    }
  }, [restored]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (currentStep === 'select') loadSpecs(); }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedSpecId) loadOperations(selectedSpecId); }, [selectedSpecId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [agentLog]);

  const goToStep = (step: Step) => {
    const si = STEPS.findIndex((s) => s.id === step);
    const ci = STEPS.findIndex((s) => s.id === currentStep);
    if (si > ci && !STEPS.slice(0, si).every((s) => completedSteps.has(s.id))) return;
    setCurrentStep(step);
  };
  const completeStep = (step: Step) => setCompletedSteps((p) => new Set(p).add(step));
  const getStatus = (step: Step) => completedSteps.has(step) ? 'completed' : step === currentStep ? 'current' : 'upcoming';

  const handleSelectComplete = () => { if (!selectedSpecId) { toast.error('Please select a specification'); return; } completeStep('select'); setCurrentStep('configure'); };
  const handleConfigureComplete = () => { completeStep('configure'); setCurrentStep('generate'); };

  const handleLaunchAgent = async () => {
    setIsGenerating(true);
    try {
      const operationFilter = selectionMode === 'full'
        ? undefined
        : selectionMode === 'tag'
          ? { mode: 'tag' as const, tags: selectedTags }
          : { mode: 'single' as const, operationIds: selectedOperationIds };
      const response = await testgenService.startAgentRun({ specId: selectedSpecId, maxIterations, baseDirectory, basePackage: 'com.api.tests', autoExecute: true, operationFilter });
      if (response?.runId) {
        setAgentRunId(response.runId); setAgentLog([]); setAgentStatus(null);
        toast.success('AI REST Assured started!');
        completeStep('generate'); setTimeout(() => setCurrentStep('execute'), 100);
        setIsExecuting(true);
        const poll = setInterval(async () => {
          try {
            const s = await testgenService.getAgentRunStatus(response.runId);
            setAgentStatus(s); setAgentLog(s.log || []);
            if (s.testSuitePath) setTestSuitePath(s.testSuitePath);
            if (s.phase === 'completed' || s.phase === 'failed') {
              clearInterval(poll); setIsExecuting(false); setIsGenerating(false); completeStep('execute');
              if (s.phase === 'completed') toast.success(`Done: ${s.finalResult?.passed}/${s.finalResult?.total} passed`);
              else toast.error(s.error || 'Run failed');
            }
          } catch { clearInterval(poll); setIsExecuting(false); setIsGenerating(false); toast.error('Lost connection'); }
        }, 2500);
      }
    } catch (e: any) { toast.error(e.message || 'Failed to launch'); } finally { setIsGenerating(false); }
  };

  const handleGoToReview = async () => {
    setLoadingFiles(true);
    try { const r = await testgenService.getAgentRunFiles(agentRunId); setReviewFiles(r.files || []); setSelectedFileIndex(0); completeStep('execute'); setCurrentStep('review'); }
    catch (e: any) { toast.error(e.message || 'Failed to load files'); } finally { setLoadingFiles(false); }
  };

  const handleApprove = () => {
    completeStep('review');
    const specName = testSuitePath.split('/').pop() || 'tests';
    setBranchName(`ai-tests/${specName}`);
    setCommitMessage(`Add AI-generated REST Assured tests for ${specName}`);
    setCurrentStep('push');
  };

  const handleReject = () => setShowFeedbackInput(true);

  const handleRerunWithFeedback = async () => {
    if (!rejectionFeedback.trim()) { toast.error('Please provide feedback'); return; }
    setRerunning(true);
    try {
      const response = await testgenService.rerunWithFeedback(agentRunId, { specId: selectedSpecId, feedback: rejectionFeedback, maxIterations, baseDirectory });
      if (response?.runId) {
        setAgentRunId(response.runId); setAgentLog([]); setAgentStatus(null); setShowFeedbackInput(false); setRejectionFeedback(''); setReviewFiles([]);
        setIsExecuting(true); setCurrentStep('execute');
        setCompletedSteps((p) => { const n = new Set(p); n.delete('execute'); n.delete('review'); n.delete('push'); return n; });
        toast.success('AI is regenerating with your feedback...');
        const poll = setInterval(async () => {
          try {
            const s = await testgenService.getAgentRunStatus(response.runId);
            setAgentStatus(s); setAgentLog(s.log || []);
            if (s.testSuitePath) setTestSuitePath(s.testSuitePath);
            if (s.phase === 'completed' || s.phase === 'failed') { clearInterval(poll); setIsExecuting(false); setRerunning(false); completeStep('execute'); }
          } catch { clearInterval(poll); setIsExecuting(false); setRerunning(false); }
        }, 2500);
      }
    } catch (e: any) { toast.error(e.message || 'Failed to rerun'); } finally { setRerunning(false); }
  };

  const handlePushToGitHub = async () => {
    if (!repoFullName) { toast.error('Enter a repository name'); return; }
    setPushing(true); setPushResult(null);
    try {
      const r = await testgenService.pushToGitHub(agentRunId, { repoFullName, branchName, commitMessage, baseBranch } as AgentPushRequest);
      setPushResult(r);
      if (r.success) { completeStep('push'); toast.success('Pushed to GitHub!'); } else toast.error(r.error || 'Push failed');
    } catch (e: any) { toast.error(e.message || 'Push failed'); } finally { setPushing(false); }
  };

  const handleReset = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentStep('select'); setCompletedSteps(new Set()); setAgentRunId(''); setAgentStatus(null); setAgentLog([]);
    setTestSuitePath(''); setIsExecuting(false); setIsGenerating(false); setReviewFiles([]); setShowFeedbackInput(false);
    setRejectionFeedback(''); setPushResult(null); setShowAllure(false);
    setSelectedSpecId(''); setSelectionMode('full'); setSelectedTags([]); setSelectedOperationIds([]);
    setBranchName(''); setCommitMessage('');
  };

  const allureReportUrl = agentRunId ? `${apiConfig.baseUrl}/api/testgen/agent/run/${agentRunId}/report/` : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/10 dark:from-purple-500/10 dark:to-pink-500/20" />
        <div className="relative flex items-center gap-4">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-3.5 shadow-lg">
            <Beaker className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Test Lab</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI-powered REST Assured tests — autonomous generation with self-healing
            </p>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-muted/30 via-transparent to-muted/30" />
        <CardContent className="relative py-5 px-4">
          <div className="flex items-center">
            {STEPS.map((step, i) => {
              const status = getStatus(step.id);
              const Icon = step.icon;
              const isLast = i === STEPS.length - 1;
              return (
                <div key={step.id} className="flex items-center flex-1 min-w-0">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={status === 'upcoming'}
                    className={cn(
                      'flex flex-col items-center gap-2 flex-1 py-2 rounded-xl transition-all min-w-0',
                      status === 'current' && 'scale-105',
                      status === 'upcoming' && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className={cn(
                      'rounded-xl p-2 shadow-md transition-all',
                      status === 'completed' && 'bg-gradient-to-br from-green-500 to-emerald-500',
                      status === 'current' && `bg-gradient-to-br ${step.color} ring-2 ring-offset-2 ring-primary/30`,
                      status === 'upcoming' && 'bg-muted'
                    )}>
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      ) : (
                        <Icon className={cn('h-4 w-4', status === 'current' ? 'text-white' : 'text-muted-foreground')} />
                      )}
                    </div>
                    <span className={cn(
                      'text-[11px] font-bold',
                      status === 'current' ? 'text-foreground' : 'text-muted-foreground'
                    )}>{step.label}</span>
                  </button>
                  {!isLast && (
                    <div className={cn(
                      'h-0.5 flex-shrink-0 w-6 mx-0.5 rounded-full',
                      completedSteps.has(step.id) ? 'bg-green-500' : 'bg-border'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="overflow-hidden">
        <CardContent className="pt-6 pb-6 overflow-hidden">

          {/* ─── Step 1: Select Spec ─── */}
          {currentStep === 'select' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2 shadow-md">
                  <FileCode className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Select Specification</h2>
                  <p className="text-xs text-muted-foreground">Choose the API spec and operations to test</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Specification</label>
                  <select
                    value={selectedSpecId}
                    onChange={(e) => setSelectedSpecId(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 rounded-lg bg-background text-sm"
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
                      No specs found. <a href="/specs?tab=import" className="text-primary hover:underline font-medium">Import one first</a>.
                    </p>
                  )}
                </div>

                {selectedSpecId && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-3">Operation Selection</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { value: 'full', label: 'All Operations', desc: 'Test everything', icon: Zap },
                          { value: 'tag', label: 'Filter by Tags', desc: 'Group by category', icon: Shield },
                          { value: 'single', label: 'Specific Operations', desc: 'Hand-pick endpoints', icon: Eye },
                        ].map((opt) => {
                          const SelIcon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setSelectionMode(opt.value as any)}
                              className={cn(
                                'flex items-start gap-3 p-3.5 rounded-lg border-2 text-left transition-all',
                                selectionMode === opt.value
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border hover:border-muted-foreground/30'
                              )}
                            >
                              <SelIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', selectionMode === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                              <div>
                                <div className="font-semibold text-sm">{opt.label}</div>
                                <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectionMode === 'tag' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Tags</label>
                        <input type="text" placeholder="Enter tags (comma-separated)" value={selectedTags.join(', ')}
                          onChange={(e) => setSelectedTags(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                          className="w-full px-4 py-2.5 border-2 rounded-lg bg-background text-sm" />
                      </div>
                    )}

                    {selectionMode === 'single' && operations.length > 0 && (
                      <div className="border-2 rounded-lg p-4 max-h-60 overflow-y-auto space-y-1">
                        {operations.map((op) => (
                          <label key={op.operationId} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-accent transition-colors cursor-pointer">
                            <input type="checkbox" checked={selectedOperationIds.includes(op.operationId)}
                              onChange={(e) => e.target.checked ? setSelectedOperationIds([...selectedOperationIds, op.operationId]) : setSelectedOperationIds(selectedOperationIds.filter((id) => id !== op.operationId))} />
                            <span className="font-mono text-[11px] px-2 py-0.5 bg-muted rounded font-bold">{op.method?.toUpperCase()}</span>
                            <span className="text-sm truncate">{op.path}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSelectComplete} disabled={!selectedSpecId} icon={<ArrowRight className="h-4 w-4" />}>
                  Next: Configure
                </Button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Configure ─── */}
          {currentStep === 'configure' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 p-2 shadow-md">
                  <Settings2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Configure AI REST Assured</h2>
                  <p className="text-xs text-muted-foreground">Fine-tune the autonomous agent settings</p>
                </div>
              </div>

              {/* AI Mode banner */}
              <div className="relative overflow-hidden rounded-xl border-2 border-purple-400 dark:border-purple-700 p-5">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
                <div className="relative flex items-start gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-2 shadow-md">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-800 dark:text-purple-300">AI REST Assured Mode</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                      AI analyzes your spec, writes REST Assured + JUnit 5 tests, executes them, and automatically self-heals failures. Fully autonomous — no templates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium mb-2">Base Directory</label>
                  <input type="text" value={baseDirectory} onChange={(e) => setBaseDirectory(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 rounded-lg bg-background text-sm" placeholder="./swagger-tests" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Self-Healing Iterations: <span className="text-primary font-bold text-base">{maxIterations}</span>
                  </label>
                  <input type="range" min={1} max={10} value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1 (fast)</span><span>10 (thorough)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep('select')} icon={<ChevronLeft className="h-4 w-4" />}>Back</Button>
                <Button onClick={handleConfigureComplete} icon={<ArrowRight className="h-4 w-4" />}>Next: Launch AI</Button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Launch AI ─── */}
          {currentStep === 'generate' && (
            <div className="space-y-6">
              {!agentRunId && (
                <div className="text-center py-16">
                  <div className="relative inline-block mb-6">
                    <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 shadow-xl">
                      <Rocket className="h-12 w-12 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 rounded-full bg-green-500 p-1 shadow-md">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Ready to Launch</h2>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    AI will analyze your spec, write REST Assured tests, execute them, and self-heal failures automatically
                  </p>
                  <Button
                    onClick={handleLaunchAgent}
                    disabled={isGenerating}
                    loading={isGenerating}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg px-8"
                    icon={<Rocket className="h-5 w-5" />}
                  >
                    {isGenerating ? 'Launching...' : 'Launch AI REST Assured'}
                  </Button>
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('configure')} disabled={isGenerating} icon={<ChevronLeft className="h-4 w-4" />}>Back</Button>
                <div />
              </div>
            </div>
          )}

          {/* ─── Step 4: Results ─── */}
          {currentStep === 'execute' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 p-2 shadow-md">
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">AI REST Assured Progress</h2>
                  <p className="text-xs text-muted-foreground">Live execution and self-healing</p>
                </div>
                {agentStatus && (
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                    agentStatus.phase === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    agentStatus.phase === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  )}>
                    {isExecuting && <LoadingSpinner size="sm" />}
                    {agentStatus.phase.toUpperCase()}
                    {agentStatus.currentIteration > 0 && ` (${agentStatus.currentIteration}/${agentStatus.maxIterations})`}
                  </span>
                )}
              </div>

              {/* Live log */}
              <div ref={logRef} className="rounded-xl border-2 border-gray-800 bg-gray-950 text-green-400 p-4 font-mono text-xs max-h-72 overflow-y-auto shadow-inner">
                {agentLog.length === 0 && <div className="flex items-center gap-2"><LoadingSpinner size="sm" /><span>Starting AI REST Assured...</span></div>}
                {agentLog.map((entry, i) => (
                  <div key={i} className="py-0.5">
                    <span className="text-gray-600">[{entry.phase}]</span> {entry.message}
                  </div>
                ))}
              </div>

              {/* Iteration history */}
              {agentStatus?.iterations?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Iteration History</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {agentStatus.iterations.map((it: any) => (
                      <div key={it.iteration} className="rounded-xl border-2 p-3 text-sm hover:shadow-md transition-shadow">
                        <div className="font-bold text-xs text-muted-foreground mb-2">ITERATION {it.iteration}</div>
                        <div className="space-y-1">
                          <div className="flex justify-between"><span className="text-xs">Passed</span><span className="font-bold text-green-600">{it.passed}</span></div>
                          <div className="flex justify-between"><span className="text-xs">Failed</span><span className="font-bold text-red-600">{it.failed}</span></div>
                          {it.fixesApplied > 0 && <div className="flex justify-between"><span className="text-xs">Fixes</span><span className="font-bold text-purple-600">{it.fixesApplied}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final result */}
              {agentStatus?.finalResult && (
                <div className="relative overflow-hidden rounded-xl border-2 p-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/10" />
                  <h3 className="relative text-lg font-bold mb-4 flex items-center gap-2">
                    <BarChart2 className="h-5 w-5" /> Final Results
                  </h3>
                  <div className="relative grid grid-cols-4 gap-4">
                    {[
                      { label: 'Total', value: agentStatus.finalResult.total, bg: 'bg-muted', color: '' },
                      { label: 'Passed', value: agentStatus.finalResult.passed, bg: 'bg-green-50 dark:bg-green-950/20', color: 'text-green-600' },
                      { label: 'Failed', value: agentStatus.finalResult.failed, bg: 'bg-red-50 dark:bg-red-950/20', color: 'text-red-600' },
                      { label: 'Skipped', value: agentStatus.finalResult.skipped, bg: 'bg-yellow-50 dark:bg-yellow-950/20', color: 'text-yellow-600' },
                    ].map((s) => (
                      <div key={s.label} className={cn('text-center p-4 rounded-xl', s.bg)}>
                        <div className={cn('text-3xl font-extrabold', s.color)}>{s.value}</div>
                        <div className="text-xs font-medium text-muted-foreground mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allure Report */}
              {agentStatus?.phase === 'completed' && agentRunId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setShowAllure(!showAllure)}>
                      {showAllure ? 'Hide' : 'Show'} Allure Report
                    </Button>
                    <a href={allureReportUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                      Open in new tab <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {showAllure && (
                    <div className="rounded-xl border-2 overflow-hidden shadow-lg" style={{ height: '600px' }}>
                      <iframe src={allureReportUrl} className="w-full h-full border-0" title="Allure Report" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep('generate')} disabled={isExecuting} icon={<ChevronLeft className="h-4 w-4" />}>Back</Button>
                <div className="flex gap-2">
                  {agentStatus?.phase === 'completed' && (
                    <Button onClick={handleGoToReview} loading={loadingFiles} icon={<Eye className="h-4 w-4" />}>
                      {loadingFiles ? 'Loading...' : 'Review Tests'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleReset} disabled={isExecuting}>Start New</Button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 5: Review ─── */}
          {currentStep === 'review' && (
            <div className="space-y-5 max-w-full overflow-hidden">
              {/* Sticky action bar — always visible */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-card z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 p-2 shadow-md flex-shrink-0">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold truncate">Review Generated Tests</h2>
                    <p className="text-xs text-muted-foreground">{reviewFiles.length} files generated</p>
                  </div>
                </div>
                {!showFeedbackInput && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" onClick={handleReject} className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20" icon={<ThumbsDown className="h-4 w-4" />}>
                      Reject
                    </Button>
                    <Button onClick={handleApprove} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md" icon={<ThumbsUp className="h-4 w-4" />}>
                      Approve & Push
                    </Button>
                  </div>
                )}
              </div>

              {/* File viewer — constrained to prevent horizontal overflow */}
              {reviewFiles.length > 0 && (
                <div className="flex flex-col lg:flex-row gap-4 overflow-hidden" style={{ height: '460px' }}>
                  {/* File list */}
                  <div className="w-full lg:w-56 flex-shrink-0 border-2 rounded-xl overflow-y-auto max-h-32 lg:max-h-full">
                    {reviewFiles.map((file, idx) => (
                      <button key={file.path} onClick={() => setSelectedFileIndex(idx)}
                        className={cn('w-full text-left px-3 py-2.5 text-xs border-b hover:bg-accent transition-colors',
                          idx === selectedFileIndex && 'bg-primary/10 text-primary font-semibold border-l-4 border-l-primary'
                        )} title={file.path}>
                        <div className="truncate font-medium">{file.path.split('/').pop()}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{file.path}</div>
                      </button>
                    ))}
                  </div>
                  {/* Code viewer */}
                  <div className="flex-1 min-w-0 border-2 rounded-xl overflow-hidden shadow-inner">
                    <div className="bg-muted px-4 py-2.5 text-xs font-mono border-b font-semibold truncate">{reviewFiles[selectedFileIndex]?.path}</div>
                    <pre className="p-4 text-xs font-mono overflow-auto h-[calc(100%-2.5rem)] max-w-full bg-gray-50 dark:bg-gray-950"><code>{reviewFiles[selectedFileIndex]?.content}</code></pre>
                  </div>
                </div>
              )}

              {/* Feedback input (shown on reject) */}
              {showFeedbackInput && (
                <div className="space-y-3 p-5 border-2 border-yellow-400 rounded-xl bg-yellow-50 dark:bg-yellow-950/20">
                  <label className="block text-sm font-bold">Feedback for AI</label>
                  <textarea value={rejectionFeedback} onChange={(e) => setRejectionFeedback(e.target.value)}
                    placeholder="e.g., Add more negative test cases, fix authentication flow..."
                    className="w-full px-4 py-2.5 border-2 rounded-lg bg-background text-sm min-h-[80px]" />
                  <div className="flex gap-2">
                    <Button onClick={handleRerunWithFeedback} loading={rerunning} icon={<Send className="h-4 w-4" />}>
                      {rerunning ? 'Regenerating...' : 'Send Feedback & Regenerate'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowFeedbackInput(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep('execute')} icon={<ChevronLeft className="h-4 w-4" />}>Back</Button>
                <div />
              </div>
            </div>
          )}

          {/* ─── Step 6: Push to GitHub ─── */}
          {currentStep === 'push' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-500 dark:to-gray-700 p-2 shadow-md">
                  <GitBranch className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Push to GitHub</h2>
                  <p className="text-xs text-muted-foreground">Create a pull request with the generated tests</p>
                </div>
              </div>

              {!pushResult?.success && (
                <div className="space-y-4 max-w-lg">
                  {[
                    { label: 'Repository (owner/name)', value: repoFullName, set: setRepoFullName, placeholder: 'e.g. user/swagger-tests' },
                    { label: 'Branch Name', value: branchName, set: setBranchName, placeholder: '' },
                    { label: 'Commit Message', value: commitMessage, set: setCommitMessage, placeholder: '' },
                    { label: 'Base Branch', value: baseBranch, set: setBaseBranch, placeholder: 'main' },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                      <input type="text" value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                        className="w-full px-4 py-2.5 border-2 rounded-lg bg-background text-sm" />
                    </div>
                  ))}
                </div>
              )}

              {pushResult?.success && (
                <div className="relative overflow-hidden rounded-xl border-2 border-green-400 p-8 text-center space-y-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />
                  <div className="relative">
                    <div className="inline-flex rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-4 shadow-xl mb-3">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-400">Successfully Pushed!</h3>
                    <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                      Branch: <code className="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded font-bold">{pushResult.branchName}</code>
                    </p>
                    {pushResult.prUrl && (
                      <a href={pushResult.prUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-primary hover:underline font-bold">
                        View Pull Request <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {pushResult && !pushResult.success && (
                <div className="rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-950/20 p-4">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">Push failed: {pushResult.error}</p>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep('review')} icon={<ChevronLeft className="h-4 w-4" />}>Back</Button>
                <div className="flex gap-2">
                  {!pushResult?.success && (
                    <Button onClick={handlePushToGitHub} loading={pushing} icon={<GitBranch className="h-4 w-4" />}>
                      {pushing ? 'Pushing...' : 'Create Pull Request'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleReset}>Start New</Button>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

export default TestLab;
