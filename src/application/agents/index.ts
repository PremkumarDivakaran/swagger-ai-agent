/**
 * AI Agent for Swagger Test Generation
 *
 * Architecture:
 *
 *   ┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌───────────┐
 *   │ Planner  │───▶│ Test Writer │───▶│ Executor │───▶│ Reflector │
 *   │  Agent   │    │   Agent     │    │  Agent   │    │   Agent   │
 *   └──────────┘    └─────────────┘    └──────────┘    └─────┬─────┘
 *        ▲                                                    │
 *        └────────────── feedback loop ───────────────────────┘
 *
 * Files:
 *   types.ts           – All interfaces (AgentTestPlan, AgentRunStatus, etc.)
 *   PlannerAgent.ts    – LLM reads spec → builds test plan + dependencies
 *   TestWriterAgent.ts – LLM writes complete Java test classes
 *   ExecutorAgent.ts   – Runs mvn test, parses results
 *   ReflectorAgent.ts  – LLM analyzes failures → produces fixes
 *   AgentOrchestrator.ts – Coordinates Plan→Write→Execute→Reflect→Fix loop
 */

export * from './types';
export { PlannerAgent } from './PlannerAgent';
export { TestWriterAgent } from './TestWriterAgent';
export { ExecutorAgent } from './ExecutorAgent';
export { ReflectorAgent } from './ReflectorAgent';
export { AgentOrchestrator } from './AgentOrchestrator';
