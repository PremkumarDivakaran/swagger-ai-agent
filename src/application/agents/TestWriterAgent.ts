/**
 * ============================================================
 *  Test Writer Agent
 * ============================================================
 *
 *  WHAT IT DOES:
 *    Takes the test plan from PlannerAgent and asks the LLM to
 *    write COMPLETE Java test classes — not from a template.
 *    The LLM writes the entire code: imports, class, methods,
 *    assertions, request bodies, dependency chaining.
 *
 *  WHY LLM (not templates):
 *    - Templates can only fill blanks in a fixed structure
 *    - The LLM can chain operations: "use the id from POST in GET"
 *    - The LLM writes assertions that match the actual response
 *    - The LLM can handle edge cases, auth flows, pagination
 *    - When tests fail, the LLM can rewrite them (see ReflectorAgent)
 *
 *  INPUT:  AgentTestPlan + spec info
 *  OUTPUT: AgentTestSuite (complete Maven project files)
 *
 * ============================================================
 */

import { LlmRouter } from '../../infrastructure/llm';
import type { AgentTestPlan, AgentTestSuite, GeneratedFile, TestPlanItem } from './types';
import {
  buildWriteTestClassPrompt,
  buildRewriteTestClassPrompt,
  WRITE_TEST_CLASS_SYSTEM_PROMPT,
  REWRITE_TEST_CLASS_SYSTEM_PROMPT,
} from '../../prompts';

export class TestWriterAgent {
  constructor(private readonly llm: LlmRouter) {}

  /**
   * Write a complete Maven test project from the test plan.
   * The LLM generates the test classes; scaffolding (pom, config) is fixed.
   */
  async write(plan: AgentTestPlan, basePackage: string = 'com.api.tests', specTitle?: string): Promise<AgentTestSuite> {
    // Use the spec title for the folder name (e.g. "FakeStoreAPI" → "fakestoreapi")
    // Falls back to the LLM-generated plan title if specTitle is not provided
    const suiteName = this.sanitize(specTitle || plan.title);
    const packagePath = basePackage.replace(/\./g, '/');
    const files: GeneratedFile[] = [];

    // ── Fixed scaffolding (not LLM — these never change) ──
    files.push({ path: 'pom.xml', content: this.pomXml(suiteName) });
    files.push({ path: `src/test/java/${packagePath}/BaseTest.java`, content: this.baseTest(basePackage, plan.baseUrl) });
    files.push({ path: `src/test/java/${packagePath}/config/ApiConfig.java`, content: this.apiConfig(basePackage, plan.baseUrl) });
    files.push({ path: 'src/test/resources/application.properties', content: `api.base.url=${plan.baseUrl}\n` });
    files.push({ path: 'src/test/resources/allure.properties', content: 'allure.results.directory=target/allure-results\n' });

    // ── LLM-written test classes ──
    // Group plan items by tag/path prefix for separate test classes
    const groups = this.groupItems(plan.items);
    for (const [groupName, items] of Object.entries(groups)) {
      const className = this.toClassName(groupName) + 'ApiTest';
      const testCode = await this.writeTestClass(plan, items, basePackage, className);
      files.push({
        path: `src/test/java/${packagePath}/${className}.java`,
        content: testCode,
      });
    }

    // README
    files.push({ path: 'README.md', content: this.readme(suiteName, plan) });

    return { suiteName, files, basePackage };
  }

  /**
   * Ask the LLM to write a COMPLETE test class.
   * We give it: the plan items, dependencies, base package, class name.
   * The LLM returns compilable Java code.
   */
  async writeTestClass(
    plan: AgentTestPlan,
    items: TestPlanItem[],
    basePackage: string,
    className: string
  ): Promise<string> {
    const dependencyInfo = plan.dependencies
      .filter(d => items.some(i => i.operationId === d.sourceOperationId || i.operationId === d.targetOperationId))
      .map(d => `  - ${d.sourceOperationId} → ${d.targetOperationId}: ${d.dataFlow}`)
      .join('\n');

    const itemsDescription = items.map(item => {
      let desc = `- ${item.method} ${item.path} (${item.operationId})`;
      desc += `\n  Category: ${item.category || 'positive'}`;
      desc += `\n  Expected status: ${item.expectedStatus || 200}`;
      desc += `\n  Description: ${item.testDescription}`;
      desc += `\n  Assertions: ${item.assertions.join(', ')}`;
      if (item.needsBody && item.suggestedBody) {
        desc += `\n  Request body: ${item.suggestedBody}`;
      }
      if (item.dependsOn.length > 0) {
        desc += `\n  Depends on: ${item.dependsOn.join(', ')}`;
      }
      return desc;
    }).join('\n\n');

    const prompt = buildWriteTestClassPrompt({
      basePackage,
      className,
      baseUrl: plan.baseUrl,
      itemsDescription,
      dependencyInfo,
    });

    const response = await this.llm.generate({
      prompt,
      systemPrompt: WRITE_TEST_CLASS_SYSTEM_PROMPT,
      temperature: 0.15,
      maxTokens: 6000,
    });

    let code = response.content.trim();
    // Strip markdown fences if the LLM added them
    if (code.startsWith('```')) {
      code = code.replace(/```java\n?/g, '').replace(/```\n?/g, '');
    }

    // Post-process: auto-fix common LLM mistakes
    code = this.autoFixImports(code, basePackage);
    return code;
  }

  /**
   * Rewrite a test class based on failure feedback from the ReflectorAgent.
   * This is called during the self-healing loop.
   */
  async rewriteTestClass(
    originalCode: string,
    failures: string,
    className: string,
    basePackage: string
  ): Promise<string> {
    const prompt = buildRewriteTestClassPrompt({ originalCode, failures });

    const response = await this.llm.generate({
      prompt,
      systemPrompt: REWRITE_TEST_CLASS_SYSTEM_PROMPT,
      temperature: 0.1,
      maxTokens: 6000,
    });

    let code = response.content.trim();
    if (code.startsWith('```')) {
      code = code.replace(/```java\n?/g, '').replace(/```\n?/g, '');
    }
    // Also post-process the rewritten code
    code = this.autoFixImports(code, basePackage);
    return code;
  }

  // ── Post-processing: auto-fix common LLM mistakes ──

  /**
   * Public entry point for post-processing LLM-generated Java code.
   * Called by the orchestrator when applying Reflector fixes.
   */
  public postProcessCode(code: string, basePackage: string): string {
    let result = code;
    // Strip markdown fences if present
    if (result.startsWith('```')) {
      result = result.replace(/```java\n?/g, '').replace(/```\n?/g, '');
    }
    result = this.autoFixImports(result, basePackage);
    return result;
  }

  /**
   * Programmatically ensure required imports are present.
   * The LLM often forgets @DisplayName, given(), or uses wrong OrderAnnotation.
   */
  private autoFixImports(code: string, basePackage: string): string {
    const requiredImports = [
      { used: '@DisplayName', import: 'import org.junit.jupiter.api.DisplayName;' },
      { used: '@Test', import: 'import org.junit.jupiter.api.Test;' },
      { used: '@Order', import: 'import org.junit.jupiter.api.Order;' },
      { used: '@TestMethodOrder', import: 'import org.junit.jupiter.api.TestMethodOrder;' },
      { used: 'MethodOrderer', import: 'import org.junit.jupiter.api.MethodOrderer;' },
      { used: 'given()', import: 'import static io.restassured.RestAssured.given;' },
      { used: 'notNullValue()', import: 'import static org.hamcrest.Matchers.*;' },
      { used: 'equalTo(', import: 'import static org.hamcrest.Matchers.*;' },
      { used: 'greaterThan(', import: 'import static org.hamcrest.Matchers.*;' },
      { used: 'hasSize(', import: 'import static org.hamcrest.Matchers.*;' },
      { used: 'Response ', import: 'import io.restassured.response.Response;' },
    ];

    let lines = code.split('\n');
    const existingImports = new Set(lines.filter(l => l.trim().startsWith('import ')).map(l => l.trim()));
    const missing: string[] = [];

    for (const req of requiredImports) {
      if (code.includes(req.used) && !existingImports.has(req.import)) {
        // Check it's not already covered by a wildcard
        const pkg = req.import.replace('import ', '').replace('import static ', '').replace(/\.\w+;$/, '.*');
        const wildcardImport = req.import.includes('static')
          ? `import static ${pkg};`
          : `import ${pkg};`;
        if (!existingImports.has(wildcardImport) && !existingImports.has(req.import)) {
          missing.push(req.import);
        }
      }
    }

    // Deduplicate
    const uniqueMissing = [...new Set(missing)];
    if (uniqueMissing.length > 0) {
      // Insert after the package line
      const packageIdx = lines.findIndex(l => l.trim().startsWith('package '));
      if (packageIdx >= 0) {
        lines.splice(packageIdx + 1, 0, '', ...uniqueMissing);
      }
    }

    let result = lines.join('\n');

    // Fix wrong OrderAnnotation references
    result = result.replace(
      /TestMethodOrder\.OrderAnnotation/g,
      'MethodOrderer.OrderAnnotation'
    );
    result = result.replace(
      /@TestMethodOrder\(OrderAnnotation\.class\)/g,
      '@TestMethodOrder(MethodOrderer.OrderAnnotation.class)'
    );

    // Remove redundant .baseUri() calls — BaseTest spec already has it
    result = result.replace(/\s*\.baseUri\([^)]*\)/g, '');

    // Fix broken multi-line .body() string concatenation
    result = this.autoFixBodyStrings(result);

    return result;
  }

  /**
   * Fix broken multi-line .body() string concatenation.
   * LLMs often produce invalid Java like:
   *   .body("{" + "\"title\":\"Wireless Mouse\",\" + ...)
   * This merges them into a single-line .body("...") call.
   */
  private autoFixBodyStrings(code: string): string {
    const lines = code.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trimStart();
      // Detect .body(" that doesn't close on the same line
      if (trimmed.includes('.body("') && !this.isBodyComplete(lines[i])) {
        // Collect all continuation lines
        const indent = lines[i].match(/^(\s*)/)?.[1] || '';
        const bodyStart = lines[i].indexOf('.body("');
        const prefix = lines[i].substring(0, bodyStart);
        let jsonParts: string[] = [];

        // Extract from current and subsequent lines until we find the closing ");"
        let j = i;
        while (j < lines.length) {
          jsonParts.push(lines[j]);
          if (lines[j].includes('.post(') || lines[j].includes('.put(') || 
              lines[j].includes('.patch(') || lines[j].includes('.delete(') ||
              lines[j].includes('.when()') || 
              (j > i && lines[j].trim().startsWith('.'))) {
            // We've gone past the body — the body was already complete
            // Put everything back
            break;
          }
          // Check if this line closes the body call
          const afterBody = lines.slice(i, j + 1).join(' ');
          if (this.isBodyComplete(afterBody)) {
            // Merge all these lines into a single-line .body()
            const merged = this.mergeBodyLines(lines.slice(i, j + 1));
            if (merged) {
              result.push(prefix + merged);
              i = j + 1;
              // Skip intermediate lines since we merged them
              continue;
            }
            break;
          }
          j++;
        }

        // If we couldn't merge, just pass through
        if (i <= j) {
          result.push(lines[i]);
          i++;
        }
      } else {
        result.push(lines[i]);
        i++;
      }
    }
    return result.join('\n');
  }

  private isBodyComplete(line: string): boolean {
    // A body call is complete if it has .body("...") with balanced quotes
    const bodyMatch = line.match(/\.body\(/);
    if (!bodyMatch) return true;
    const afterBody = line.substring(line.indexOf('.body('));
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (const ch of afterBody) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"' && !escaped) inString = !inString;
      if (!inString) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth === 0) return true;
      }
    }
    return false;
  }

  private mergeBodyLines(lines: string[]): string | null {
    try {
      // Join all lines and extract just the JSON content
      const combined = lines.map(l => l.trim()).join(' ');
      // Find everything between .body( and the closing )
      const bodyStart = combined.indexOf('.body(');
      if (bodyStart < 0) return null;

      let afterBody = combined.substring(bodyStart + 6); // skip '.body('
      
      // Remove string concatenation: "..." + "..."
      // Extract all string literal contents and merge
      const stringParts: string[] = [];
      const stringRegex = /"((?:[^"\\]|\\.)*)"/g;
      let match;
      while ((match = stringRegex.exec(afterBody)) !== null) {
        stringParts.push(match[1]);
        // Stop if we hit something after the closing paren
        const afterMatch = afterBody.substring(match.index + match[0].length).trim();
        if (afterMatch.startsWith(')') || afterMatch.startsWith('.when()')) break;
      }

      if (stringParts.length === 0) return null;

      const merged = stringParts.join('');
      // Find what comes after the body(): .when(), .post(), etc.
      const afterBodyCall = combined.match(/\.body\([^)]*\)(.*)/)?.[1] || '';
      return `.body("${merged}")${afterBodyCall}`;
    } catch {
      return null;
    }
  }

  // ── Helpers ──

  private groupItems(items: TestPlanItem[]): Record<string, TestPlanItem[]> {
    const groups: Record<string, TestPlanItem[]> = {};
    for (const item of items) {
      // Group by first path segment: /products/... → Products
      const segments = item.path.split('/').filter(Boolean);
      const group = segments[0] || 'Api';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    }
    return groups;
  }

  private toClassName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/[^a-zA-Z0-9]/g, '');
  }

  private sanitize(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'api-tests';
  }

  // ── Fixed scaffolding (pom, BaseTest, config) ──
  // These are not LLM-generated because they are always the same.

  private pomXml(artifactId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.api.tests</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>1.0-SNAPSHOT</version>
  <properties>
    <maven.compiler.source>11</maven.compiler.source>
    <maven.compiler.target>11</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <allure.version>2.25.0</allure.version>
    <aspectj.version>1.9.21</aspectj.version>
  </properties>
  <dependencies>
    <dependency><groupId>io.rest-assured</groupId><artifactId>rest-assured</artifactId><version>5.4.0</version><scope>test</scope></dependency>
    <dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId><version>5.10.2</version><scope>test</scope></dependency>
    <dependency><groupId>org.hamcrest</groupId><artifactId>hamcrest</artifactId><version>2.2</version><scope>test</scope></dependency>
    <dependency><groupId>io.qameta.allure</groupId><artifactId>allure-junit5</artifactId><version>\${allure.version}</version><scope>test</scope></dependency>
    <dependency><groupId>io.qameta.allure</groupId><artifactId>allure-rest-assured</artifactId><version>\${allure.version}</version><scope>test</scope></dependency>
    <dependency><groupId>com.fasterxml.jackson.core</groupId><artifactId>jackson-databind</artifactId><version>2.17.0</version><scope>test</scope></dependency>
    <dependency><groupId>org.slf4j</groupId><artifactId>slf4j-simple</artifactId><version>2.0.12</version><scope>test</scope></dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <argLine>-javaagent:\${settings.localRepository}/org/aspectj/aspectjweaver/\${aspectj.version}/aspectjweaver-\${aspectj.version}.jar</argLine>
        </configuration>
        <dependencies>
          <dependency><groupId>org.aspectj</groupId><artifactId>aspectjweaver</artifactId><version>\${aspectj.version}</version></dependency>
        </dependencies>
      </plugin>
      <plugin>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-maven</artifactId>
        <version>2.12.0</version>
        <configuration><reportVersion>\${allure.version}</reportVersion></configuration>
      </plugin>
    </plugins>
  </build>
</project>
`;
  }

  private baseTest(basePackage: string, baseUrl: string): string {
    return `package ${basePackage};

import io.restassured.RestAssured;
import io.restassured.specification.RequestSpecification;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.filter.log.RequestLoggingFilter;
import io.restassured.filter.log.ResponseLoggingFilter;
import org.junit.jupiter.api.BeforeAll;

import ${basePackage}.config.ApiConfig;

public class BaseTest {
    protected static RequestSpecification spec;

    @BeforeAll
    static void setup() {
        spec = new RequestSpecBuilder()
            .setBaseUri(ApiConfig.getBaseUrl())
            .setContentType(ContentType.JSON)
            .setAccept(ContentType.JSON)
            .addFilter(new RequestLoggingFilter())
            .addFilter(new ResponseLoggingFilter())
            .build();
    }
}
`;
  }

  private apiConfig(basePackage: string, baseUrl: string): string {
    return `package ${basePackage}.config;

public class ApiConfig {
    private static final String DEFAULT_BASE_URL = "${baseUrl}";

    public static String getBaseUrl() {
        String envUrl = System.getenv("API_BASE_URL");
        if (envUrl != null && !envUrl.isEmpty()) return envUrl;
        String propUrl = System.getProperty("api.base.url");
        if (propUrl != null && !propUrl.isEmpty()) return propUrl;
        return DEFAULT_BASE_URL;
    }
}
`;
  }

  private readme(suiteName: string, plan: AgentTestPlan): string {
    const deps = plan.dependencies.length > 0
      ? plan.dependencies.map(d => `- ${d.sourceOperationId} -> ${d.targetOperationId}: ${d.dataFlow}`).join('\n')
      : 'None';

    const lines = [
      `# ${suiteName}`,
      '',
      '> Generated by AI Agent from OpenAPI specification',
      '',
      '## Test Strategy (by AI)',
      plan.reasoning,
      '',
      '## Dependencies detected',
      deps,
      '',
      '## Run tests',
      '```bash',
      'mvn test',
      '```',
      '',
      '## Allure report',
      '```bash',
      'mvn allure:serve',
      '```',
    ];
    return lines.join('\n') + '\n';
  }
}
