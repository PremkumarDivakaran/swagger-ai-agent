# Swagger AI Agent

> An autonomous AI agent that reads OpenAPI/Swagger specifications, generates REST Assured (Java) API tests using LLMs, executes them, self-heals failures, and pushes passing tests to GitHub — all from a single button click.

## Table of Contents

- [What is This?](#what-is-this)
- [How the AI Agent Works](#how-the-ai-agent-works)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
  - [Backend (`src/`)](#backend-src)
  - [Frontend (`web-app/`)](#frontend-web-app)
  - [Other Folders](#other-folders)
- [The Agent Pipeline in Detail](#the-agent-pipeline-in-detail)
- [LLM Providers](#llm-providers)
- [UI Workflow](#ui-workflow)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

---

## What is This?

**Swagger AI Agent** is a full-stack platform that automates API test creation end-to-end:

1. **Import** an OpenAPI/Swagger spec (URL, file upload, or paste)
2. **AI plans** the test strategy — positive, negative, and edge-case scenarios
3. **AI writes** complete REST Assured + JUnit 5 Java test classes
4. **Executes** them via Maven (`mvn test`)
5. **Self-heals** — when tests fail, the AI diagnoses root causes and rewrites code
6. **Iterates** until all tests pass or max iterations are reached
7. **Human reviews** the generated tests in the UI
8. **Pushes** approved tests to GitHub as a Pull Request

No manual test code writing required. One click triggers the full autonomous pipeline.

---

## How the AI Agent Works

```
User clicks "Launch AI REST Assured"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AgentOrchestrator                            │
│                                                                 │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │  Planner   │───▶│  TestWriter  │───▶│   Executor   │        │
│  │   Agent    │    │    Agent     │    │    Agent     │        │
│  │  (LLM)     │    │   (LLM)     │    │  (mvn test)  │        │
│  └────────────┘    └──────────────┘    └──────┬───────┘        │
│        ▲                                       │                │
│        │                               ┌──────▼───────┐        │
│        │                               │  SelfHeal    │        │
│        │                               │    Agent     │        │
│        │                               │   (LLM)     │        │
│        │                               └──────┬───────┘        │
│        │                                       │                │
│        └───────── feedback loop ───────────────┘                │
│                                                                 │
│  Repeat until all tests pass or max iterations reached          │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
  User reviews → Approves → Push to GitHub (PR)
```

### The Four Agents

| Agent | What it Does | Uses LLM? |
|-------|-------------|-----------|
| **PlannerAgent** | Reads the OpenAPI spec, identifies operation dependencies, creates a test plan with positive/negative/edge-case scenarios | Yes — for positive tests, dependencies, and assertions. Negative/edge-case tests are generated programmatically |
| **TestWriterAgent** | Takes the plan and writes complete Java test classes (REST Assured + JUnit 5), including `pom.xml`, base config, and Faker-based test data | Yes — generates entire Java files with imports, assertions, and dependency chaining |
| **ExecutorAgent** | Runs `mvn test`, parses Surefire XML reports, captures per-test pass/fail/error with messages | No — pure shell execution and XML parsing |
| **SelfHealAgent** | Analyzes test failures, distinguishes test bugs from API bugs, produces code fixes | Yes — diagnoses root cause and rewrites broken code. Has 3-layer defense against "fixing" actual API bugs |

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Java** 11+ and **Maven** (for executing generated REST Assured tests)
- **Git**
- An LLM API key (Groq, OpenAI, or TestLeaf)

### Installation

```bash
git clone <your-repo-url>
cd swagger-ai-agent

# Install backend dependencies
npm install

# Install frontend dependencies
cd web-app && npm install && cd ..
```

### Configuration

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# LLM — pick one provider: groq | openai | testleaf
LLM_ENABLED=true
LLM_PROVIDER=groq

# Groq (free tier available)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# TestLeaf (custom GPT-based API)
TESTLEAF_API_KEY=your_testleaf_api_key
TESTLEAF_MODEL=gpt-4o-mini

# GitHub (for Push to GitHub / PR creation)
GITHUB_TOKEN=your_github_personal_access_token
```

### Run the Application

```bash
# Terminal 1 — Backend (http://localhost:3001)
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd web-app && npm run dev
```

Or use the combined command:

```bash
npm run start:app
```

### Your First AI Test Run in 3 Minutes

1. Open `http://localhost:5173`
2. Go to **Specs** → Paste `https://petstore.swagger.io/v2/swagger.json` → **Import**
3. Go to **Test Lab** → Select the spec → **Launch AI REST Assured**
4. Watch the agent plan, write, execute, and self-heal in real-time
5. Review generated tests → **Approve** → Push to GitHub

---

## Project Structure

```
swagger-ai-agent/
├── src/                        # Backend (Node.js + Express + TypeScript)
│   ├── api/                    # HTTP layer (routes, controllers, DTOs, validators)
│   ├── application/            # Business logic (agents, use cases)
│   ├── core/                   # App bootstrap, config, errors, middleware
│   ├── domain/                 # Domain models and repository interfaces
│   ├── infrastructure/         # External integrations (LLM, GitHub, persistence)
│   ├── prompts/                # LLM prompt templates (separated files)
│   └── utils/                  # Shared utilities
├── web-app/                    # Frontend (React + Vite + TailwindCSS)
│   └── src/
│       ├── pages/              # UI pages (Dashboard, Specs, TestLab, Settings)
│       ├── components/         # Reusable UI components
│       ├── services/           # API client functions
│       ├── stores/             # Zustand state management
│       └── types/              # TypeScript interfaces
├── config/                     # Environment-specific config (dev, prod, test)
├── tests/                      # Unit tests (mirrors src/ structure)
├── swagger_docs/               # Sample OpenAPI specs for testing
├── swagger-tests/              # Generated test output (gitignored)
└── logs/                       # Application log files
```

### Backend (`src/`)

#### `src/application/agents/` — The AI Agent System (Heart of the Project)

This is where the autonomous pipeline lives. Each agent is independent and does one thing well.

| File | Role |
|------|------|
| `AgentOrchestrator.ts` | Coordinates the full loop: Plan → Write → Persist → Execute → Reflect → Fix → Iterate. Stores run status in-memory for UI polling. Handles operation filtering on a copy to avoid mutating the stored spec |
| `PlannerAgent.ts` | Reads the OpenAPI spec and asks the LLM to build a test strategy. Identifies operation dependencies (e.g., "POST must run before GET to have data"). Generates positive tests via LLM; generates negative/edge-case tests programmatically |
| `TestWriterAgent.ts` | Takes the test plan and asks the LLM to write complete Java classes. Generates `pom.xml`, `BaseTest.java`, config files, and per-tag test classes. Handles token limits by splitting large groups |
| `ExecutorAgent.ts` | Runs `mvn test` as a child process, parses Surefire XML reports for structured per-test results. Generates Allure reports. No LLM used |
| `SelfHealAgent.ts` | Analyzes failures using a 3-layer defense: (1) Pre-LLM programmatic filter removes API bugs, (2) Prompt instructs LLM to never weaken negative tests, (3) Post-LLM scrub rejects fixes that change 4xx expectations to 2xx |
| `types.ts` | All TypeScript interfaces: `AgentTestPlan`, `AgentRunStatus`, `AgentReflection`, `TestFix`, etc. |
| `index.ts` | Central re-export of all agents |

#### `src/prompts/` — LLM Prompt Templates

Prompts are separated from agent logic for maintainability.

| File | Agent | What it instructs the LLM to do |
|------|-------|-------------------------------|
| `planner.prompt.ts` | PlannerAgent | "Analyze this OpenAPI spec. Return a JSON test plan with operations, dependencies, assertions, and request bodies. Follow schema data types exactly." |
| `test-writer.prompt.ts` | TestWriterAgent | "Write complete Java test classes using REST Assured + JUnit 5. Use Faker for dynamic data. Match Swagger schema types (integer for IDs, not UUIDs)." |
| `self-heal.prompt.ts` | SelfHealAgent | "Diagnose these test failures. If a negative test expects 4xx but gets 2xx, that's an API bug — do NOT change the test. Only fix actual test code errors." |

#### `src/api/` — REST API Layer

Standard Express layered architecture. Each resource has 4 files:

| Subfolder | Purpose |
|-----------|---------|
| `routes/` | URL → controller mapping |
| `controllers/` | Parse request → call use case → send response |
| `dto/` | Request/response data shapes |
| `validators/` | Joi request validation schemas |

Key resources:

| Route Prefix | Purpose |
|-------------|---------|
| `/api/spec` | Import, list, get, delete OpenAPI specs |
| `/api/testgen` | Start agent runs, poll status, get files, push to GitHub, submit feedback |
| `/api/settings` | Read/write LLM & GitHub config (updates `.env` file) |

#### `src/core/` — App Bootstrap & Cross-Cutting Concerns

| File | Purpose |
|------|---------|
| `app.ts` | Creates the Express app, mounts middleware and routes |
| `server.ts` | Starts the HTTP server, serves Allure reports as static files |
| `env.ts` | Validates environment variables using Zod |
| `config.ts` | Loads hierarchical config from `config/` folder |
| `llm-factory.ts` | Creates the `LlmRouter` singleton based on `LLM_PROVIDER` |
| `errors/` | Custom error classes: `NotFoundError`, `ValidationError`, `ConflictError`, etc. |
| `middlewares/` | Error handler, request logger, rate limiter, auth, Joi validation |

#### `src/domain/` — Domain Models & Repository Interfaces

Pure business logic with no framework dependencies (Clean Architecture principle).

| Folder | Content |
|--------|---------|
| `models/` | `NormalizedSpec` (parsed spec), `Operation` (single API endpoint), `EnvironmentConfig`, `RunPlan`, etc. |
| `repositories/` | Interfaces only — `ISpecRepository`, `IEnvironmentRepository`, etc. Implementations live in `infrastructure/` |
| `services/llm/` | `ILlmProvider` interface — the contract all LLM providers implement |

#### `src/infrastructure/` — External Integrations

| Folder | Purpose |
|--------|---------|
| `llm/` | LLM provider implementations and routing |
| `github/` | `GitHubService.ts` — pushes test code to GitHub repos and creates PRs |
| `persistence/` | In-memory repository implementations (specs, environments, run plans) |
| `swagger/` | OpenAPI parsing: `SwaggerLoader` (fetch/read), `SwaggerParserAdapter` (parse), `OpenApiNormalizer` (normalize to internal model) |
| `logging/` | Winston logger setup with structured log utilities |
| `http/` | Axios HTTP client adapters |
| `mcp/` | Model Context Protocol server (legacy, not actively used) |

##### LLM Infrastructure Detail

| File | Purpose |
|------|---------|
| `LlmRouter.ts` | Routes all LLM requests to the configured provider. Supports caching and structured logging |
| `GroqProvider.ts` | Groq API integration (Llama models, free tier available) |
| `OpenAiProvider.ts` | OpenAI API integration (GPT-4o-mini, etc.) |
| `TestLeafProvider.ts` | Custom GPT-based API at `api.testleaf.com` |
| `LlmCache.ts` | In-memory cache for LLM responses to avoid duplicate API calls |

#### `src/utils/` — Shared Utilities

| File | Purpose |
|------|---------|
| `idGenerator.ts` | UUID and prefixed ID generation |
| `faker-schema.ts` | Schema-based fake data generation utilities |

### Frontend (`web-app/`)

A single-page application built with React + Vite + TailwindCSS.

#### Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/` | Landing page with health status and quick-action cards |
| **Specs** | `/specs` | Two tabs: **Import Spec** (URL/file/paste) + **Browse & Explore** (view operations) |
| **Test Lab** | `/test-lab` | The main AI agent UI — a 6-step wizard (see [UI Workflow](#ui-workflow)) |
| **Settings** | `/settings` | Configure LLM provider and API keys, GitHub token. Saves directly to `.env` |

#### Key Frontend Folders

| Folder | Purpose |
|--------|---------|
| `services/` | API client functions: `testgenService` (agent runs, polling, push), `specService` (import, list), `settingsService` (config) |
| `stores/` | Zustand stores: `spec.store` (imported specs), `notification.store` (toasts), `settings.store` (LLM/GitHub config) |
| `components/common/` | Reusable UI: `Button`, `Card`, `LoadingSpinner`, `Toast`, `StatusBadge`, `EmptyState` |
| `components/layout/` | `Sidebar` (collapsible), `MainLayout`, `Header`, `PageContainer` |
| `components/ui/` | Headless UI primitives (Tabs) |
| `types/` | TypeScript interfaces matching backend API responses |

### Other Folders

| Folder | Purpose |
|--------|---------|
| `config/` | Hierarchical env configs: `default.ts`, `development.ts`, `production.ts`, `test.ts` |
| `tests/` | Unit tests mirroring `src/` structure. Uses Jest + ts-jest |
| `swagger_docs/` | Sample OpenAPI specs (`petstore_swagger.json`, `fakestore_swagger.json`) for quick testing |
| `swagger-tests/` | Output folder for generated Maven test projects (gitignored) |
| `logs/` | Winston log files (`app.log`, `combined.log`, `error.log`) |

---

## The Agent Pipeline in Detail

When the user clicks **"Launch AI REST Assured"**, here is exactly what happens:

### Phase 1 — Planning

```
AgentOrchestrator loads the spec from InMemorySpecRepository
  → Applies operation filter (by tag or specific operations) on a COPY
  → PlannerAgent.plan(spec) is called
    → Builds a spec summary with schemas, parameters, and data types
    → Sends to LLM with planner.prompt.ts instructions
    → LLM returns: operations to test, dependencies, suggested request bodies, assertions
    → Programmatically generates negative tests (invalid IDs, empty bodies, missing auth)
    → Programmatically generates edge-case tests (boundary values, special characters)
  → Result: AgentTestPlan with 50-90 test items
```

### Phase 2 — Writing Code

```
TestWriterAgent.write(plan) is called
  → Sends plan + test-writer.prompt.ts to LLM
  → LLM generates complete Java project:
    ├── pom.xml (Maven config with REST Assured, JUnit 5, Faker, Allure dependencies)
    ├── src/test/java/com/api/config/BaseTest.java
    ├── src/test/java/com/api/config/TestConfig.java
    └── src/test/java/com/api/tests/
        ├── ProductsApiTest.java
        ├── UsersApiTest.java
        ├── CartsApiTest.java
        └── AuthApiTest.java
  → Files written to disk under swagger-tests/<spec-name>/
```

### Phase 3 — Execution

```
ExecutorAgent.execute(suitePath) is called
  → Runs: mvn test -f swagger-tests/<spec-name>/pom.xml
  → Parses target/surefire-reports/*.xml for structured results
  → Generates Allure report: mvn allure:report
  → Result: AgentExecutionResult { passed: 38, failed: 12, total: 50 }
```

### Phase 4 — Self-Healing (iterates until success or max iterations)

```
SelfHealAgent.reflect(failures, testCode) is called
  → Pre-LLM filter: removes negative test "failures" that are actually API bugs
    (e.g., POST with empty body returning 201 instead of 400)
  → Sends remaining failures to LLM with self-heal.prompt.ts
  → LLM diagnoses root cause and returns complete fixed file contents
  → Post-LLM scrub: rejects any fix that changes 4xx → 2xx for negative tests
  → TestWriterAgent rewrites the fixed files
  → Post-fix compilation check: runs mvn compile to verify fixes
  → Back to Phase 3 (Execute again)

Repeat up to maxIterations (default: 5)
```

### Phase 5 — Human Review & GitHub Push

```
UI shows all generated files for human review
  → User can Approve or Reject
  → If rejected with feedback: PlannerAgent re-generates with feedback
  → If approved: GitHubService pushes code to specified repo and creates a PR
```

---

## LLM Providers

The system uses a single LLM provider at a time, configured via `LLM_PROVIDER` in `.env`.

| Provider | Env Key | Endpoint | Models |
|----------|---------|----------|--------|
| **Groq** | `groq` | `api.groq.com` | `llama-3.3-70b-versatile` (free tier) |
| **OpenAI** | `openai` | `api.openai.com` | `gpt-4o-mini`, `gpt-4o` |
| **TestLeaf** | `testleaf` | `api.testleaf.com` | `gpt-4o-mini` (custom GPT wrapper) |

All providers implement the same `ILlmProvider` interface. Switching providers requires only changing one env variable — no code changes needed.

The `LlmRouter` handles:
- Routing requests to the selected provider
- Response caching to avoid duplicate API calls
- Structured logging (which provider, response time, token usage)
- Token limit handling (prompt truncation for large specs)

---

## UI Workflow

The **Test Lab** page is a 6-step wizard:

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌─────────┐    ┌────────┐    ┌──────┐
│ 1.Select │───▶│2.Configure│───▶│3.Generate │───▶│4.Results │───▶│5.Review│───▶│6.Push│
│   Spec   │    │  Options  │    │  (AI Run) │    │ (Allure) │    │  Code  │    │GitHub│
└──────────┘    └───────────┘    └──────────┘    └─────────┘    └────────┘    └──────┘
```

| Step | What the User Does |
|------|-------------------|
| **1. Select** | Choose an imported spec. Optionally filter operations by tags or pick specific endpoints |
| **2. Configure** | Set max iterations (1-10). Test type is "AI REST Assured" |
| **3. Generate** | Click "Launch". Watch real-time logs as the agent plans, writes, executes, and self-heals. See pass/fail progress per iteration |
| **4. Results** | View pass/fail summary. Embedded Allure report shows per-test request/response details |
| **5. Review** | Browse all generated Java files in a code viewer. Approve or reject with feedback |
| **6. Push** | Enter GitHub repo name and branch. Agent creates a PR with the generated tests |

State is persisted in `sessionStorage` during a run, but automatically clears when the backend restarts.

---

## API Reference

### Spec Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/spec/import` | Import an OpenAPI spec (URL, file, or inline) |
| `GET` | `/api/spec` | List all imported specs |
| `GET` | `/api/spec/:specId` | Get spec details with operations |
| `DELETE` | `/api/spec/:specId` | Delete a spec |

### AI Agent (Test Generation)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/testgen/agent/run` | Start a new agent run (returns `runId`) |
| `GET` | `/api/testgen/agent/run/:runId/status` | Poll run status (phase, logs, results) |
| `GET` | `/api/testgen/agent/run/:runId/files` | List generated test files |
| `GET` | `/api/testgen/agent/run/:runId/files/:filePath` | Get a specific file's content |
| `POST` | `/api/testgen/agent/run/:runId/push` | Push tests to GitHub and create PR |
| `POST` | `/api/testgen/agent/run/:runId/feedback` | Submit human feedback for re-generation |
| `GET` | `/api/testgen/agent/run/:runId/report` | Serve the Allure HTML report |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current LLM and GitHub config |
| `PUT` | `/api/settings` | Update config (writes to `.env` file) |

---

## Configuration

### Environment Variables (`.env`)

```env
# Server
NODE_ENV=development          # development | production | test
PORT=3001                     # Backend port
LOG_LEVEL=info                # error | warn | info | debug

# Swagger
SWAGGER_UPLOAD_MAX_SIZE=10mb
SWAGGER_CACHE_TTL=3600

# LLM — choose one provider
LLM_ENABLED=true
LLM_PROVIDER=groq             # groq | openai | testleaf

# Provider API keys (only the selected provider's key is required)
GROQ_API_KEY=your_key
GROQ_MODEL=llama-3.3-70b-versatile

OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

TESTLEAF_API_KEY=your_key
TESTLEAF_MODEL=gpt-4o-mini

# GitHub
GITHUB_TOKEN=your_github_pat
```

### Hierarchical Config (`config/`)

Environment-specific overrides loaded at startup:

| File | When |
|------|------|
| `config/default.ts` | Always loaded as base |
| `config/development.ts` | `NODE_ENV=development` |
| `config/production.ts` | `NODE_ENV=production` |
| `config/test.ts` | `NODE_ENV=test` |

---

## Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js 18+** | Runtime |
| **Express** | HTTP framework |
| **TypeScript** | Type safety |
| **Clean Architecture** | Layered separation (API → Application → Domain → Infrastructure) |
| **Joi** | Request validation |
| **Winston** | Structured logging |
| **Zod** | Environment variable validation |
| **Groq SDK / OpenAI SDK** | LLM provider clients |
| **simple-git** | Git operations for GitHub push |
| **Jest** | Unit testing |

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **Vite** | Build tool + dev server |
| **TypeScript** | Type safety |
| **TailwindCSS 4** | Styling |
| **Zustand** | State management |
| **React Router v7** | Client-side routing |
| **Monaco Editor** | Code viewer for generated tests |
| **Lucide React** | Icons |
| **Axios** | HTTP client |

### Generated Tests

| Technology | Purpose |
|-----------|---------|
| **Java 11+** | Test language |
| **Maven** | Build and dependency management |
| **REST Assured** | HTTP request library for API testing |
| **JUnit 5** | Test framework |
| **JavaFaker** | Dynamic test data generation |
| **Allure** | Test reporting with request/response details |
| **Jackson Databind** | JSON serialization for request bodies |

---

## Troubleshooting

### Backend won't start

```bash
# Port already in use
lsof -ti:3001 | xargs kill -9

# Missing dependencies
npm install

# Check env validation errors in console output
```

### Agent run fails immediately

- Verify `LLM_PROVIDER` is set and the corresponding API key is valid
- Check `LOG_LEVEL=debug` in `.env` for detailed LLM call logs
- Groq free tier has token limits — switch to `openai` if hitting 429 errors

### Tests show 0/0 passed

- Ensure **Java 11+** and **Maven** are installed: `java -version && mvn -version`
- Check `swagger-tests/<spec-name>/` exists with a `pom.xml`
- Run manually: `cd swagger-tests/<spec-name> && mvn test`

### Allure report not loading

- The backend serves Allure reports as static files from `swagger-tests/<spec-name>/target/site/allure-maven-plugin/`
- If empty, run: `cd swagger-tests/<spec-name> && mvn allure:report`

### GitHub push fails

- Verify `GITHUB_TOKEN` has `repo` scope permissions
- Ensure the target repository exists on GitHub
- Check the branch name doesn't contain invalid characters

### Frontend can't connect to backend

- Verify backend is running on port 3001
- Check CORS — backend allows all origins in development
- Frontend expects `http://localhost:3001` by default (configurable in `web-app/src/config/api.config.ts`)

---

## Development

```bash
# Backend with hot reload
npm run dev

# Frontend with hot reload
cd web-app && npm run dev

# Run unit tests
npm test

# Type check
npx tsc --noEmit

# Build for production
npm run build:all
```

---

## License

ISC
