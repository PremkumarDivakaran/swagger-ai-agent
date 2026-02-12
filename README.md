# Swagger AI Agent - Complete Guide

> **Automated API Testing Platform**: Generate and execute BDD/Axios tests from OpenAPI specifications with a modern web interface.

## 📋 Table of Contents

- [What is This?](#what-is-this)
- [Quick Start](#quick-start)
- [Backend Architecture](#backend-architecture)
- [Frontend Application](#frontend-application)
- [Complete User Workflow](#complete-user-workflow)
- [API Documentation](#api-documentation)
- [Testing the System](#testing-the-system)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

---

## What is This?

**Swagger AI Agent** is an intelligent test generation and execution platform that:

1. **Imports** OpenAPI/Swagger specifications (URL, file, or inline)
2. **Analyzes** API operations, parameters, and schemas
3. **Generates** production-ready tests in two formats:
   - **BDD Tests (Cucumber)**: Complete test structure with features, steps, and runner
   - **Axios Tests (Jest)**: Single test file with Axios + Jest
4. **Persists** generated tests to disk with proper structure
5. **Executes** tests and shows real-time results
6. **Reports** comprehensive test outcomes with pass/fail details

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Git** for cloning
- **OpenAPI/Swagger** specification (URL or file)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd swagger-ai-agent

# Install backend dependencies
npm install

# Install frontend dependencies
cd web-app
npm install
cd ..
```

### Configuration

```bash
# Backend configuration (optional)
cp .env.example .env
# Edit .env with your settings

# Frontend configuration (optional)
cd web-app
# Create .env if needed
echo "VITE_API_BASE_URL=http://localhost:3001" > .env
```

### Running the Application

```bash
# Terminal 1: Start Backend Server
npm start
# Backend runs on http://localhost:3001

# Terminal 2: Start Frontend
cd web-app
npm run dev
# Frontend runs on http://localhost:5173
```

### First Test in 5 Minutes

1. **Open Browser**: `http://localhost:5173`
2. **Import Spec**: Click "Import Swagger" → Paste Petstore URL → Import
3. **Generate Tests**: Click "Test Lab" → Select spec → Choose BDD → Generate & Save
4. **Run Tests**: Click "Run Tests" → Watch real-time execution
5. **View Report**: See pass/fail statistics and detailed results

---

## Backend Architecture

### Clean Architecture Layers

```
src/
├── core/               # Application core (server, config, errors)
├── domain/             # Business logic and models
│   ├── models/         # Domain entities
│   └── repositories/   # Repository interfaces
├── application/        # Use cases (business operations)
│   ├── spec/           # Spec management
│   ├── testgen/        # Test generation
│   ├── execution/      # Test execution
│   └── environment/    # Environment management
├── infrastructure/     # External dependencies
│   ├── swagger/        # OpenAPI parsing
│   ├── llm/            # LLM integration
│   └── persistence/    # Data storage
└── api/                # HTTP layer
    ├── routes/         # API routes
    ├── controllers/    # Request handlers
    ├── dto/            # Data transfer objects
    └── validators/     # Request validation
```

### Key Backend Components

#### 1. **Spec Management**
- **Import**: `POST /api/spec/import` - Import OpenAPI specs
- **List**: `GET /api/spec` - List all specs
- **Get**: `GET /api/spec/:specId` - Get spec details
- **Operations**: `GET /api/spec/:specId/operations` - List operations
- **Delete**: `DELETE /api/spec/:specId` - Delete spec

#### 2. **Test Generation**
- **Axios Tests**: `POST /api/testgen/generate-axios-tests` - Generate Jest+Axios tests
- **BDD Tests**: `POST /api/testgen/generate-bdd-tests` - Generate Cucumber tests
- **Persist**: `POST /api/testgen/persist-bdd-tests` - Save tests to disk

#### 3. **Test Execution**
- **Execute**: `POST /api/testgen/execute-tests` - Run generated tests
- **Status**: `GET /api/testgen/execution/:executionId` - Poll execution status

#### 4. **Environment Management**
- **Create**: `POST /api/environment` - Create environment config
- **List**: `GET /api/spec/:specId/environments` - List environments
- **Update**: `PUT /api/environment/:envId` - Update environment

---

## Frontend Application

### Modern React Architecture

```
web-app/src/
├── pages/              # Page components
│   ├── Dashboard/      # System health dashboard
│   ├── Specs/          # Import + View specs (combined)
│   └── TestLab/        # Generate + Execute tests (workflow)
├── components/         # Reusable components
│   ├── common/         # Buttons, Cards, etc.
│   └── layout/         # Header, Sidebar, Layout
├── services/           # API client services
├── stores/             # Zustand state management
├── types/              # TypeScript types
├── config/             # App configuration
└── utils/              # Helper functions
```

### Navigation Structure

```
┌────────────────────────────────────┐
│  Dashboard         [Home]          │  System health and quick stats
├────────────────────────────────────┤
│  Specs             [Import+View]   │  Import and explore OpenAPI specs
├────────────────────────────────────┤
│  Test Lab          [Gen+Execute]   │  Generate and run tests
└────────────────────────────────────┘
```

### Key Features

1. **Dashboard**
   - Backend health status
   - Quick statistics
   - Recent activity

2. **Specs Page** (Improved Organization)
   - **Tab 1: Import** - Import new specs
   - **Tab 2: Browse** - View all imported specs
   - **Tab 3: Operations** - Explore API operations
   - Unified workflow, no jumping between pages

3. **Test Lab** (Unified Workflow)
   - **Step 1: Select Spec** - Choose spec and operations
   - **Step 2: Configure** - Select test type and options
   - **Step 3: Generate** - Generate tests (preview or persist)
   - **Step 4: Execute** - Run tests and view results
   - Linear workflow with progress indicator

---

## Complete User Workflow

### Workflow 1: Import → Generate → Execute (Full Flow)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IMPORT SWAGGER SPEC                                      │
├─────────────────────────────────────────────────────────────┤
│  Dashboard → Specs → Import Tab                             │
│  • Paste URL: https://petstore.swagger.io/v2/swagger.json  │
│  • Or upload file                                           │
│  • Click "Import"                                           │
│  ✓ Spec imported successfully                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BROWSE OPERATIONS (Optional)                             │
├─────────────────────────────────────────────────────────────┤
│  Specs → Operations Tab                                      │
│  • View all API endpoints                                   │
│  • Filter by tags                                           │
│  • Understand API structure                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GENERATE TESTS                                           │
├─────────────────────────────────────────────────────────────┤
│  Test Lab → Select Spec → Configure                         │
│  • Test Type: BDD (Cucumber) or Axios (Jest)               │
│  • Operations: All / By Tag / Single                        │
│  • Options: Negative tests, Auth tests, etc.               │
│  • Click "Generate & Save to Disk"                          │
│  ✓ Tests saved to ./swagger-tests/petstore-api             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EXECUTE TESTS                                            │
├─────────────────────────────────────────────────────────────┤
│  Test Lab → Execute Tab (automatically shown)                │
│  • Click "Run Tests"                                        │
│  • Watch real-time progress                                 │
│  • See pass/fail statistics                                 │
│  ✓ 14/15 tests passed                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. VIEW DETAILED REPORT                                     │
├─────────────────────────────────────────────────────────────┤
│  • Summary: Total, Passed, Failed, Skipped                  │
│  • Test Suites: Feature file breakdown                      │
│  • Individual Tests: Each test result with duration         │
│  • Console Output: Full terminal output                     │
│  • Errors: Detailed error messages                          │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 2: Quick Test (Axios)

```
Test Lab → Select Spec → Axios Tests → Generate → Download
```

### Workflow 3: BDD with Customization

```
Test Lab → BDD Tests → Filter by Tag → Custom Options → Generate & Save → Execute
```

---

## API Documentation

### Spec Management

#### Import Spec
```http
POST /api/spec/import
Content-Type: application/json

{
  "source": {
    "type": "url",
    "url": "https://petstore.swagger.io/v2/swagger.json"
  }
}
```

#### List Specs
```http
GET /api/spec
```

#### Get Operations
```http
GET /api/spec/{specId}/operations?tags=pet,store
```

### Test Generation

#### Generate BDD Tests
```http
POST /api/testgen/generate-bdd-tests
Content-Type: application/json

{
  "specId": "spec-123",
  "selection": {
    "mode": "tag",
    "tags": ["pet"]
  },
  "options": {
    "framework": "cucumber",
    "language": "typescript",
    "includeNegativeTests": true,
    "includeAuthTests": true,
    "groupBy": "tag"
  }
}
```

#### Persist Tests
```http
POST /api/testgen/persist-bdd-tests
Content-Type: application/json

{
  "specId": "spec-123",
  "options": { /* same as above */ },
  "baseDirectory": "./swagger-tests",
  "overwrite": false
}
```

### Test Execution

#### Execute Tests
```http
POST /api/testgen/execute-tests
Content-Type: application/json

{
  "testSuitePath": "./swagger-tests/petstore-api",
  "framework": "cucumber",
  "env": {
    "API_BASE_URL": "https://petstore.swagger.io/v2"
  }
}
```

#### Get Status
```http
GET /api/testgen/execution/{executionId}
```

---

## Testing the System

### Automated Testing Script

Save as `test-full-workflow.sh`:

```bash
#!/bin/bash
set -e

API_URL="http://localhost:3001/api"

echo "=== Full Workflow Test ==="

# 1. Import Spec
echo "\n1. Importing Petstore Spec..."
SPEC_RESPONSE=$(curl -s -X POST "$API_URL/spec/import" \
  -H "Content-Type: application/json" \
  -d '{
    "source": {
      "type": "url",
      "url": "https://petstore.swagger.io/v2/swagger.json"
    }
  }')

SPEC_ID=$(echo $SPEC_RESPONSE | jq -r '.data.specId')
echo "✓ Spec ID: $SPEC_ID"

# 2. Generate BDD Tests
echo "\n2. Generating BDD Tests..."
curl -s -X POST "$API_URL/testgen/persist-bdd-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"specId\": \"$SPEC_ID\",
    \"selection\": { \"mode\": \"tag\", \"tags\": [\"pet\"] },
    \"options\": {
      \"framework\": \"cucumber\",
      \"language\": \"typescript\",
      \"includeNegativeTests\": true
    },
    \"baseDirectory\": \"./swagger-tests\",
    \"overwrite\": true
  }" | jq '.'

echo "\n✓ Tests persisted"

# 3. Execute Tests
echo "\n3. Executing Tests..."
EXEC_RESPONSE=$(curl -s -X POST "$API_URL/testgen/execute-tests" \
  -H "Content-Type: application/json" \
  -d '{
    "testSuitePath": "./swagger-tests/swagger-petstore",
    "framework": "cucumber"
  }')

EXEC_ID=$(echo $EXEC_RESPONSE | jq -r '.data.executionId')
echo "✓ Execution ID: $EXEC_ID"

# 4. Poll Status
echo "\n4. Polling execution status..."
for i in {1..30}; do
  STATUS=$(curl -s "$API_URL/testgen/execution/$EXEC_ID" | jq -r '.data.status')
  echo "  Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  
  sleep 2
done

# 5. Get Final Report
echo "\n5. Final Report:"
curl -s "$API_URL/testgen/execution/$EXEC_ID" | jq '.data.results'

echo "\n=== Test Complete ==="
```

### Manual Testing Steps

#### Test 1: Import and View Spec
1. Open `http://localhost:5173`
2. Click "Specs" in sidebar
3. Go to "Import" tab
4. Paste URL: `https://petstore.swagger.io/v2/swagger.json`
5. Click "Import"
6. Go to "Operations" tab
7. Verify operations are listed

**Expected**: Spec imported, operations visible

#### Test 2: Generate BDD Tests
1. Click "Test Lab" in sidebar
2. Select the imported spec
3. Choose "BDD Tests (Cucumber)"
4. Select "By Tags" → enter "pet"
5. Enable "Negative Tests" and "Auth Tests"
6. Click "Generate & Save to Disk"

**Expected**: Success message, file list shown

#### Test 3: Execute Tests
1. Scroll to "Test Execution" panel
2. Click "Run Tests"
3. Watch status change to "Running"
4. Wait for completion

**Expected**: Tests execute, report displays results

#### Test 4: Generate Axios Tests
1. Test Lab → Select spec
2. Choose "Axios Tests (Jest)"
3. Click "Generate Tests"
4. Click "Download" or "Copy to Clipboard"

**Expected**: Test file downloads successfully

---

## Project Structure

### Backend Structure
```
swagger-ai-agent/
├── src/
│   ├── core/                   # App core (server, config, errors)
│   ├── domain/                 # Business models and interfaces
│   ├── application/            # Use cases (business logic)
│   ├── infrastructure/         # External integrations
│   └── api/                    # HTTP layer
├── config/                     # Environment configs
├── tests/                      # Unit and integration tests
├── swagger_docs/               # Sample Swagger files
├── swagger-tests/              # Generated test output
├── logs/                       # Application logs
├── package.json
└── tsconfig.json
```

### Frontend Structure
```
web-app/
├── src/
│   ├── pages/                  # Page components
│   ├── components/             # Reusable UI components
│   ├── services/               # API client
│   ├── stores/                 # State management
│   ├── types/                  # TypeScript types
│   ├── config/                 # App config
│   ├── utils/                  # Helpers
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
├── public/                     # Static assets
├── package.json
└── vite.config.ts
```

### Generated Test Structure
```
swagger-tests/
└── petstore-api/
    ├── features/               # Gherkin feature files
    │   ├── pet.feature
    │   ├── store.feature
    │   └── user.feature
    ├── steps/                  # Step definitions
    │   ├── common-steps.ts
    │   ├── api-request-steps.ts
    │   └── response-validation-steps.ts
    ├── support/                # Support files
    │   ├── world.ts
    │   ├── hooks.ts
    │   └── helpers.ts
    ├── reports/                # Test reports
    ├── cucumber.js             # Cucumber config
    ├── package.json
    ├── .env.example
    └── README.md
```

---

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Architecture**: Clean Architecture (Hexagonal)
- **Validation**: Joi
- **OpenAPI Parser**: @apidevtools/swagger-parser
- **Logging**: Winston
- **Testing**: Jest

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Lucide icons
- **HTTP Client**: Axios
- **Forms**: React Hook Form (if used)

### Test Generation
- **BDD Framework**: Cucumber.js
- **Test Runner**: Jest / Cucumber
- **HTTP Client**: Axios
- **Assertion Library**: Chai (BDD) / Jest (Axios)

---

## Troubleshooting

### Backend Issues

**Issue**: Port 3001 already in use
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9
# Or change port in .env
PORT=3002 npm start
```

**Issue**: Cannot import spec
- Check URL is accessible
- Verify JSON/YAML is valid OpenAPI
- Check network/firewall settings

**Issue**: Tests fail to execute
- Verify test suite path exists
- Check package.json has test script
- Run `npm install` in test directory first

### Frontend Issues

**Issue**: Cannot connect to backend
- Verify backend is running on port 3001
- Check `VITE_API_BASE_URL` in `.env`
- Check CORS settings

**Issue**: Build fails
```bash
cd web-app
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Test Execution Issues

**Issue**: Can't proceed to Execute step after generating tests
- Make sure "Save to Disk (Persist Tests)" is checked
- Tests must be persisted to disk before execution
- Check console for any errors during generation

**Issue**: Tests don't run
- Ensure test suite has dependencies installed
- Check test path is correct
- Verify `.env` in test suite has API URL
- Run `npm install` in the generated test directory

**Issue**: All tests fail
- Check API base URL in test `.env`
- Verify API is accessible
- Check authentication requirements
- Ensure backend API is running

---

## Development

### Running in Development

```bash
# Backend with hot reload
npm run dev

# Frontend with hot reload
cd web-app
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Building for Production

```bash
# Build backend
npm run build

# Build frontend
cd web-app
npm run build

# Start production
npm start
```

### Environment Variables

**Backend (.env)**:
```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

**Frontend (web-app/.env)**:
```env
VITE_API_BASE_URL=http://localhost:3001
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

[Your License Here]

---

## Support

For issues, questions, or contributions:
- **Issues**: [GitHub Issues](your-repo-url/issues)
- **Discussions**: [GitHub Discussions](your-repo-url/discussions)
- **Email**: your-email@example.com

---

## Summary

**What the Backend Does**:
- Imports and parses OpenAPI specifications
- Generates test code (BDD/Axios)
- Persists tests to disk with proper structure
- Executes tests and captures results
- Provides REST API for all operations

**What the UI Does**:
- Modern web interface for all backend features
- Unified workflow for spec management
- Step-by-step test generation wizard
- Real-time test execution and reporting
- No command line needed

**What You Should Do**:
1. Start backend and frontend
2. Import a Swagger spec (Specs page)
3. Generate tests (Test Lab → Select spec → Configure → **Check "Save to Disk"** → Generate)
4. Execute and view results (automatically advances to Execute step)
5. Iterate and improve

**Important**: For BDD tests, make sure "Save to Disk (Persist Tests)" is checked to enable test execution.

**That's it!** Simple, powerful, and fully automated API testing from Swagger specs.

