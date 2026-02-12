/**
 * ============================================================
 *  Agent Orchestrator
 * ============================================================
 *
 *  WHAT IT DOES:
 *    Coordinates the full agentic loop:
 *
 *    1. PLAN     → PlannerAgent reads spec, creates test strategy
 *    2. WRITE    → TestWriterAgent asks LLM to write test code
 *    3. PERSIST  → Write files to disk
 *    4. EXECUTE  → ExecutorAgent runs mvn test
 *    5. REFLECT  → ReflectorAgent analyzes failures
 *    6. FIX      → TestWriterAgent rewrites broken tests
 *    7. LOOP     → Go back to step 4 (up to maxIterations)
 *
 *  WHY AN ORCHESTRATOR:
 *    Each agent is independent and does one thing well.
 *    The orchestrator connects them into an autonomous pipeline.
 *    The user clicks ONE button and the system does everything.
 *
 *  STATUS POLLING:
 *    The orchestrator stores progress in memory so the UI can
 *    poll for updates (phase, logs, results).
 *
 * ============================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { LlmRouter } from '../../infrastructure/llm';
import { ISpecRepository } from '../../domain/repositories';
import { NormalizedSpec } from '../../domain/models/NormalizedSpec';
import { NotFoundError } from '../../core/errors/NotFoundError';

import { PlannerAgent } from './PlannerAgent';
import { TestWriterAgent } from './TestWriterAgent';
import { ExecutorAgent } from './ExecutorAgent';
import { ReflectorAgent } from './ReflectorAgent';
import type {
  AgentRunConfig,
  AgentRunStatus,
  AgentPhase,
  AgentLogEntry,
  AgentIteration,
} from './types';

export class AgentOrchestrator {
  private readonly planner: PlannerAgent;
  private readonly writer: TestWriterAgent;
  private readonly executor: ExecutorAgent;
  private readonly reflector: ReflectorAgent;

  /** In-memory store for run status (UI polls this) */
  private runs = new Map<string, AgentRunStatus>();

  constructor(
    private readonly llmRouter: LlmRouter,
    private readonly specRepository: ISpecRepository
  ) {
    this.planner = new PlannerAgent(llmRouter);
    this.writer = new TestWriterAgent(llmRouter);
    this.executor = new ExecutorAgent();
    this.reflector = new ReflectorAgent(llmRouter);
  }

  /**
   * Start an agent run. Returns immediately with a runId.
   * The actual work happens asynchronously.
   */
  startRun(config: AgentRunConfig): string {
    const runId = uuidv4();
    const maxIterations = config.maxIterations ?? 3;

    const status: AgentRunStatus = {
      runId,
      phase: 'planning',
      currentIteration: 0,
      maxIterations,
      log: [],
      iterations: [],
      startedAt: new Date(),
    };

    this.runs.set(runId, status);

    // Run asynchronously — don't await
    this.runPipeline(runId, config).catch(err => {
      this.setPhase(runId, 'failed');
      this.log(runId, 'failed', `Unrecoverable error: ${err.message}`);
      const run = this.runs.get(runId);
      if (run) {
        run.error = err.message;
        run.completedAt = new Date();
      }
    });

    return runId;
  }

  /**
   * Get current status for a run (called by polling endpoint).
   */
  getStatus(runId: string): AgentRunStatus | null {
    return this.runs.get(runId) || null;
  }

  // ──────────────────────────────────────────────
  //  The main agentic pipeline
  // ──────────────────────────────────────────────

  private async runPipeline(runId: string, config: AgentRunConfig): Promise<void> {
    const maxIterations = config.maxIterations ?? 5;
    const baseDirectory = config.baseDirectory || './swagger-tests';
    const basePackage = config.basePackage || 'com.api.tests';
    const autoExecute = config.autoExecute !== false;

    // ── Phase 1: Load spec ──
    this.log(runId, 'planning', 'Loading OpenAPI specification...');
    const spec = await this.specRepository.findById(config.specId);
    if (!spec) throw new NotFoundError('Spec', config.specId);
    this.log(runId, 'planning', `Loaded spec: ${spec.info?.title} (${spec.operations.length} operations)`);

    // ── Phase 2: Plan ──
    this.setPhase(runId, 'planning');
    this.log(runId, 'planning', '🧠 PlannerAgent: Analyzing spec and building test strategy...');
    const testPlan = await this.planner.plan(spec);
    const run = this.runs.get(runId)!;
    run.testPlan = testPlan;
    this.log(runId, 'planning', `📡 LLM provider: ${this.llmRouter.lastProvider}`);
    const positiveCount = testPlan.items.filter(i => (i.category || 'positive') === 'positive').length;
    const negativeCount = testPlan.items.filter(i => i.category === 'negative').length;
    const edgeCount = testPlan.items.filter(i => i.category === 'edge-case').length;
    this.log(runId, 'planning', `✅ Plan created: ${testPlan.items.length} tests (${positiveCount} positive, ${negativeCount} negative, ${edgeCount} edge-case), ${testPlan.dependencies.length} dependencies`);
    this.log(runId, 'planning', `Strategy: ${testPlan.reasoning}`);

    // ── Phase 3: Write test code ──
    this.setPhase(runId, 'writing');
    this.log(runId, 'writing', '✍️ TestWriterAgent: Writing test code with LLM...');
    const specTitle = spec.info?.title || undefined;
    let testSuite = await this.writer.write(testPlan, basePackage, specTitle);
    this.log(runId, 'writing', `📡 LLM provider: ${this.llmRouter.lastProvider}`);
    this.log(runId, 'writing', `✅ Generated ${testSuite.files.length} files`);

    // ── Phase 4: Persist to disk ──
    this.setPhase(runId, 'persisting');
    const suitePath = path.resolve(baseDirectory, testSuite.suiteName);
    this.persistFiles(suitePath, testSuite.files);
    run.testSuitePath = suitePath;
    this.log(runId, 'persisting', `📁 Written to ${suitePath}`);

    // ── Phase 5+: Execute → Reflect → Fix → Loop ──
    if (!autoExecute) {
      this.setPhase(runId, 'completed');
      this.log(runId, 'completed', 'Auto-execute disabled. Tests are ready to run manually.');
      run.completedAt = new Date();
      return;
    }

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      run.currentIteration = iteration;

      // Execute
      this.setPhase(runId, 'executing');
      this.log(runId, 'executing', `🚀 ExecutorAgent: Running tests (iteration ${iteration}/${maxIterations})...`);
      const execResult = await this.executor.execute(suitePath);

      const isCompilation = execResult.testResults.some(t => t.testName === 'COMPILATION');
      if (isCompilation) {
        this.log(runId, 'executing', `❌ Compilation failed — tests could not run (${execResult.durationMs}ms)`);
      } else {
        this.log(
          runId,
          'executing',
          `Results: ${execResult.passed}/${execResult.total} passed, ${execResult.failed} failed (${execResult.durationMs}ms)`
        );
      }

      const iterationEntry: AgentIteration = {
        iteration,
        executionResult: execResult,
        fixesApplied: 0,
      };

      // All passed? Done!
      if (execResult.success) {
        run.iterations.push(iterationEntry);
        run.finalResult = execResult;
        this.setPhase(runId, 'completed');
        this.log(runId, 'completed', `✅ All ${execResult.total} tests passed on iteration ${iteration}!`);
        run.completedAt = new Date();
        return;
      }

      // Last iteration — no more retries
      if (iteration === maxIterations) {
        run.iterations.push(iterationEntry);
        run.finalResult = execResult;
        this.setPhase(runId, 'completed');
        this.log(
          runId,
          'completed',
          `⚠️ Completed after ${maxIterations} iterations. ${execResult.passed}/${execResult.total} tests passing.`
        );
        run.completedAt = new Date();
        return;
      }

      // Reflect on failures
      this.setPhase(runId, 'reflecting');
      this.log(runId, 'reflecting', '🔍 ReflectorAgent: Analyzing failures...');
      const testFileMap = this.readTestFiles(suitePath, basePackage);
      const reflection = await this.reflector.reflect(execResult, testFileMap, iteration);
      iterationEntry.reflection = reflection;
      this.log(runId, 'reflecting', `📡 LLM provider: ${this.llmRouter.lastProvider}`);
      this.log(runId, 'reflecting', `Diagnosis: ${reflection.failureSource} — ${reflection.summary}`);

      if (!reflection.shouldRetry) {
        run.iterations.push(iterationEntry);
        run.finalResult = execResult;
        this.setPhase(runId, 'completed');
        this.log(runId, 'completed', `Reflector says: do not retry. Done.`);
        run.completedAt = new Date();
        return;
      }

      // If shouldRetry but no fixes (e.g., parsing failed), still continue
      // to the next iteration — the existing code may partially work
      if (reflection.fixes.length === 0) {
        run.iterations.push(iterationEntry);
        this.log(runId, 'reflecting', `⚠️ No fixes extracted — re-running tests as-is...`);
        continue;
      }

      // Apply fixes — run autoFix on each to prevent Reflector from re-introducing errors
      this.setPhase(runId, 'fixing');
      let fixesApplied = 0;
      for (const fix of reflection.fixes) {
        const fixPath = path.join(suitePath, fix.filePath);
        try {
          this.ensureDir(path.dirname(fixPath));
          // Post-process the fix: add missing imports, fix body strings, remove baseUri
          const fixedContent = this.writer.postProcessCode(fix.newContent, basePackage);
          fs.writeFileSync(fixPath, fixedContent, 'utf-8');
          fixesApplied++;
          this.log(runId, 'fixing', `🔧 Fixed: ${fix.filePath} — ${fix.explanation}`);
        } catch (err: any) {
          this.log(runId, 'fixing', `⚠️ Could not write fix for ${fix.filePath}: ${err.message}`);
        }
      }
      iterationEntry.fixesApplied = fixesApplied;
      run.iterations.push(iterationEntry);
      this.log(runId, 'fixing', `Applied ${fixesApplied} fixes. Re-running tests...`);
    }
  }

  // ──────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────

  private persistFiles(basePath: string, files: { path: string; content: string }[]): void {
    for (const file of files) {
      const fullPath = path.join(basePath, file.path);
      this.ensureDir(path.dirname(fullPath));
      fs.writeFileSync(fullPath, file.content, 'utf-8');
    }
  }

  private readTestFiles(suitePath: string, basePackage: string): Map<string, string> {
    const map = new Map<string, string>();
    const pkgPath = basePackage.replace(/\./g, '/');
    const testDir = path.join(suitePath, 'src/test/java', pkgPath);
    if (!fs.existsSync(testDir)) return map;

    const entries = fs.readdirSync(testDir);
    for (const entry of entries) {
      if (entry.endsWith('.java')) {
        const relPath = `src/test/java/${pkgPath}/${entry}`;
        map.set(relPath, fs.readFileSync(path.join(testDir, entry), 'utf-8'));
      }
    }
    return map;
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private setPhase(runId: string, phase: AgentPhase): void {
    const run = this.runs.get(runId);
    if (run) run.phase = phase;
  }

  private log(runId: string, phase: AgentPhase, message: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.log.push({ timestamp: new Date(), phase, message });
      console.log(`[Agent:${runId.slice(0, 8)}] [${phase}] ${message}`);
    }
  }
}
