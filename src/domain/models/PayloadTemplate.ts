/**
 * PayloadTemplate domain model
 * Represents a template for generating request payloads
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

/**
 * Field value generator type
 */
export type ValueGeneratorType = 
  | 'static'         // Use a static value
  | 'random'         // Generate random value based on type
  | 'faker'          // Use faker.js generator
  | 'sequence'       // Sequential value (counter)
  | 'reference'      // Reference another field
  | 'expression'     // Evaluate expression
  | 'llm';           // Generate using LLM

/**
 * Field generator configuration
 */
export interface FieldGenerator {
  /** Generator type */
  type: ValueGeneratorType;
  /** Static value (for 'static' type) */
  value?: unknown;
  /** Faker method (for 'faker' type, e.g., 'name.firstName') */
  fakerMethod?: string;
  /** Referenced field path (for 'reference' type) */
  referencePath?: string;
  /** Expression string (for 'expression' type) */
  expression?: string;
  /** LLM prompt hint (for 'llm' type) */
  llmHint?: string;
  /** Constraints for random generation */
  constraints?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
  };
}

/**
 * Template field definition
 */
export interface TemplateField {
  /** Field path (e.g., 'user.email', 'items[0].name') */
  path: string;
  /** Whether this field is required */
  required: boolean;
  /** JSON Schema type */
  schemaType: string;
  /** Generator for this field */
  generator: FieldGenerator;
  /** Description */
  description?: string;
}

/**
 * PayloadTemplate domain model
 * Represents a complete template for payload generation
 */
export interface PayloadTemplate {
  /** Unique identifier */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Associated operation ID */
  operationId: string;
  
  /** Template description */
  description?: string;
  
  /** Content type (e.g., 'application/json') */
  contentType: string;
  
  /** Field definitions */
  fields: TemplateField[];
  
  /** Base template (static structure) */
  baseTemplate?: Record<string, unknown>;
  
  /** JSON Schema for the payload */
  schema?: Record<string, unknown>;
  
  /** Example payloads */
  examples?: Record<string, unknown>[];
  
  /** Tags for categorization */
  tags: string[];
  
  /** When template was created */
  createdAt: Date;
  
  /** When template was last updated */
  updatedAt: Date;
}

/**
 * Creates a new PayloadTemplate with default values
 * @param partial - Partial template data
 * @returns Complete PayloadTemplate object
 */
export function createPayloadTemplate(
  partial: Partial<PayloadTemplate> & { 
    id: string; 
    name: string; 
    operationId: string;
  }
): PayloadTemplate {
  const now = new Date();
  return {
    id: partial.id,
    name: partial.name,
    operationId: partial.operationId,
    description: partial.description,
    contentType: partial.contentType ?? 'application/json',
    fields: partial.fields ?? [],
    baseTemplate: partial.baseTemplate,
    schema: partial.schema,
    examples: partial.examples,
    tags: partial.tags ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

/**
 * Creates a static field generator
 * @param value - Static value
 * @returns FieldGenerator for static value
 */
export function staticGenerator(value: unknown): FieldGenerator {
  return { type: 'static', value };
}

/**
 * Creates a random field generator
 * @param constraints - Generation constraints
 * @returns FieldGenerator for random value
 */
export function randomGenerator(constraints?: FieldGenerator['constraints']): FieldGenerator {
  return { type: 'random', constraints };
}

/**
 * Creates a faker field generator
 * @param method - Faker method name
 * @returns FieldGenerator for faker value
 */
export function fakerGenerator(method: string): FieldGenerator {
  return { type: 'faker', fakerMethod: method };
}

/**
 * Creates an LLM field generator
 * @param hint - Hint for LLM generation
 * @returns FieldGenerator for LLM-generated value
 */
export function llmGenerator(hint?: string): FieldGenerator {
  return { type: 'llm', llmHint: hint };
}

/**
 * Gets required fields from a template
 * @param template - PayloadTemplate to check
 * @returns Array of required fields
 */
export function getRequiredFields(template: PayloadTemplate): TemplateField[] {
  return template.fields.filter(f => f.required);
}

/**
 * Gets fields that need LLM generation
 * @param template - PayloadTemplate to check
 * @returns Array of LLM-generated fields
 */
export function getLlmFields(template: PayloadTemplate): TemplateField[] {
  return template.fields.filter(f => f.generator.type === 'llm');
}

/**
 * Checks if template needs LLM assistance
 * @param template - PayloadTemplate to check
 * @returns true if any field requires LLM generation
 */
export function needsLlmAssistance(template: PayloadTemplate): boolean {
  return template.fields.some(f => f.generator.type === 'llm');
}
