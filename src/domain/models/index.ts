/**
 * Domain models module exports
 * Re-exports all domain model types and functions
 */

// Operation
export {
  Operation,
  HttpMethod,
  ParameterIn,
  OperationParameter,
  OperationRequestBody,
  OperationResponse,
  SecurityRequirement,
  createOperation,
  generateOperationId,
  hasRequestBody,
  requiresAuth,
  getRequiredParameters,
  getParametersByLocation,
} from './Operation';

// NormalizedSpec
export {
  NormalizedSpec,
  OpenApiVersion,
  ServerInfo,
  ContactInfo,
  LicenseInfo,
  ApiInfo,
  TagDefinition,
  SecurityScheme,
  SpecMetadata,
  createNormalizedSpec,
  getOperationCount,
  getOperationsByTag,
  getAllTags,
  getTagStats,
  findOperation,
  getDefaultServerUrl,
} from './NormalizedSpec';

// EnvironmentConfig
export {
  EnvironmentConfig,
  AuthType,
  AuthConfig,
  ApiKeyAuthConfig,
  BasicAuthConfig,
  BearerAuthConfig,
  OAuth2AuthConfig,
  NoAuthConfig,
  createEnvironmentConfig,
  hasAuth,
  getAuthorizationHeader,
  buildUrl,
  replaceVariables,
} from './EnvironmentConfig';

// TestCaseDefinition
export {
  TestCaseDefinition,
  TestCaseType,
  PayloadStrategy,
  TestAssertion,
  createTestCaseDefinition,
  createHappyPathTestCase,
  createValidationErrorTestCase,
  createAuthErrorTestCase,
  shouldSkip,
  getTestCasesByType,
  sortTestCases,
} from './TestCaseDefinition';

// RunPlan
export {
  RunPlan,
  RunPlanStatus,
  SelectionMode,
  OperationSelection,
  TestExecutionItem,
  createRunPlan,
  calculateTestCount,
  canExecute,
  isRunning,
  isComplete,
  startRun,
  completeRun,
  getExecutionDuration,
} from './RunPlan';

// RunReport
export {
  RunReport,
  TestResultStatus,
  RequestDetails,
  ResponseDetails,
  AssertionResult,
  TestCaseResult,
  RunSummary,
  TagStats,
  MethodStats,
  PathStats,
  TestResultWithMetadata,
  createRunReport,
  createRunReportWithAggregations,
  calculateSummary,
  calculateTagStats,
  calculateMethodStats,
  calculatePathStats,
  getFailedTests,
  getResultsByOperation,
  isSuccessful,
  createPassedResult,
  createFailedResult,
  createErrorResult,
} from './RunReport';

// PayloadTemplate
export {
  PayloadTemplate,
  ValueGeneratorType,
  FieldGenerator,
  TemplateField,
  createPayloadTemplate,
  staticGenerator,
  randomGenerator,
  fakerGenerator,
  llmGenerator,
  getRequiredFields,
  getLlmFields,
  needsLlmAssistance,
} from './PayloadTemplate';

