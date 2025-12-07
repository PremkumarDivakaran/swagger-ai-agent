/**
 * OpenApiNormalizer
 * Converts parsed OpenAPI specs to normalized domain models
 */

import { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { v4 as uuidv4 } from 'uuid';
import {
  NormalizedSpec,
  Operation,
  HttpMethod,
  OperationParameter,
  OperationRequestBody,
  OperationResponse,
  SecurityRequirement,
  SecurityScheme,
  ServerInfo,
  TagDefinition,
  ApiInfo,
  SpecMetadata,
  createNormalizedSpec,
  createOperation,
  generateOperationId,
} from '../../domain/models';
import { OpenApiVersionType } from './SwaggerParserAdapter';

/**
 * Normalization options
 */
export interface NormalizationOptions {
  /** Generate operation IDs if missing */
  generateMissingOperationIds?: boolean;
  /** Include deprecated operations */
  includeDeprecated?: boolean;
  /** Include internal operations (x-internal: true) */
  includeInternal?: boolean;
}

const DEFAULT_OPTIONS: NormalizationOptions = {
  generateMissingOperationIds: true,
  includeDeprecated: true,
  includeInternal: false,
};

/**
 * HTTP methods to process from paths
 */
const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'];

/**
 * OpenApiNormalizer class
 * Normalizes OpenAPI 2.0/3.x specs to domain models
 */
export class OpenApiNormalizer {
  /**
   * Normalize a parsed OpenAPI spec to domain model
   * @param spec - Parsed OpenAPI spec
   * @param version - OpenAPI version
   * @param metadata - Spec metadata
   * @param options - Normalization options
   * @returns NormalizedSpec domain model
   */
  normalize(
    spec: OpenAPI.Document,
    version: OpenApiVersionType,
    metadata: SpecMetadata,
    options: NormalizationOptions = {}
  ): NormalizedSpec {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (this.isSwagger2(spec)) {
      return this.normalizeSwagger2(spec, metadata, opts);
    } else {
      return this.normalizeOpenApi3(spec as OpenAPIV3.Document | OpenAPIV3_1.Document, version, metadata, opts);
    }
  }

  /**
   * Normalize OpenAPI 2.0 (Swagger) spec
   */
  private normalizeSwagger2(
    spec: OpenAPIV2.Document,
    metadata: SpecMetadata,
    options: NormalizationOptions
  ): NormalizedSpec {
    const info = this.normalizeInfo(spec.info);
    const servers = this.normalizeServersFromSwagger2(spec);
    const tags = this.normalizeTags(spec.tags);
    const securitySchemes = this.normalizeSecuritySchemesFromSwagger2(spec.securityDefinitions);
    const globalSecurity = this.normalizeGlobalSecurity(spec.security);
    const operations = this.normalizeOperationsFromSwagger2(spec, globalSecurity, options);

    return createNormalizedSpec({
      id: uuidv4(),
      openApiVersion: '2.0',
      info,
      servers,
      tags,
      operations,
      securitySchemes,
      globalSecurity,
      metadata,
      schemas: spec.definitions as Record<string, Record<string, unknown>>,
    });
  }

  /**
   * Normalize OpenAPI 3.x spec
   */
  private normalizeOpenApi3(
    spec: OpenAPIV3.Document | OpenAPIV3_1.Document,
    version: OpenApiVersionType,
    metadata: SpecMetadata,
    options: NormalizationOptions
  ): NormalizedSpec {
    const info = this.normalizeInfo(spec.info);
    const servers = this.normalizeServers(spec.servers);
    const tags = this.normalizeTags(spec.tags);
    const securitySchemes = this.normalizeSecuritySchemes(spec.components?.securitySchemes);
    const globalSecurity = this.normalizeGlobalSecurity(spec.security);
    const operations = this.normalizeOperationsFromOpenApi3(spec, globalSecurity, options);

    return createNormalizedSpec({
      id: uuidv4(),
      openApiVersion: version === '3.1' ? '3.1.0' : '3.0.0',
      info,
      servers,
      tags,
      operations,
      securitySchemes,
      globalSecurity,
      metadata,
      schemas: spec.components?.schemas as Record<string, Record<string, unknown>>,
    });
  }

  /**
   * Normalize API info
   */
  private normalizeInfo(info: OpenAPIV2.InfoObject | OpenAPIV3.InfoObject): ApiInfo {
    return {
      title: info.title,
      version: info.version,
      description: info.description,
      termsOfService: info.termsOfService,
      contact: info.contact ? {
        name: info.contact.name,
        url: info.contact.url,
        email: info.contact.email,
      } : undefined,
      license: info.license ? {
        name: info.license.name,
        url: info.license.url,
      } : undefined,
    };
  }

  /**
   * Normalize servers from OpenAPI 3.x
   */
  private normalizeServers(servers?: OpenAPIV3.ServerObject[]): ServerInfo[] {
    if (!servers || servers.length === 0) {
      return [{ url: '/', description: 'Default server' }];
    }

    return servers.map(server => ({
      url: server.url,
      description: server.description,
      variables: server.variables ? Object.entries(server.variables).reduce((acc, [key, value]) => {
        acc![key] = {
          default: value.default,
          description: value.description,
          enum: value.enum,
        };
        return acc;
      }, {} as NonNullable<ServerInfo['variables']>) : undefined,
    }));
  }

  /**
   * Normalize servers from Swagger 2.0
   */
  private normalizeServersFromSwagger2(spec: OpenAPIV2.Document): ServerInfo[] {
    const schemes = spec.schemes || ['https'];
    const host = spec.host || 'localhost';
    const basePath = spec.basePath || '/';

    return schemes.map(scheme => ({
      url: `${scheme}://${host}${basePath}`,
      description: `${scheme.toUpperCase()} server`,
    }));
  }

  /**
   * Normalize tags
   */
  private normalizeTags(tags?: OpenAPIV2.TagObject[] | OpenAPIV3.TagObject[]): TagDefinition[] {
    if (!tags) return [];

    return tags.map(tag => ({
      name: tag.name,
      description: tag.description,
      externalDocs: tag.externalDocs ? {
        url: tag.externalDocs.url,
        description: tag.externalDocs.description,
      } : undefined,
    }));
  }

  /**
   * Normalize security schemes from OpenAPI 3.x
   */
  private normalizeSecuritySchemes(
    securitySchemes?: Record<string, OpenAPIV3.SecuritySchemeObject | OpenAPIV3.ReferenceObject>
  ): SecurityScheme[] {
    if (!securitySchemes) return [];

    return Object.entries(securitySchemes)
      .filter(([, scheme]) => !('$ref' in scheme))
      .map(([name, scheme]) => {
        const s = scheme as OpenAPIV3.SecuritySchemeObject;
        return this.normalizeSecurityScheme(name, s);
      });
  }

  /**
   * Normalize security schemes from Swagger 2.0
   */
  private normalizeSecuritySchemesFromSwagger2(
    securityDefinitions?: Record<string, OpenAPIV2.SecuritySchemeObject>
  ): SecurityScheme[] {
    if (!securityDefinitions) return [];

    return Object.entries(securityDefinitions).map(([name, scheme]) => {
      const s = scheme as unknown as {
        type: string;
        description?: string;
        name?: string;
        in?: string;
        flow?: string;
        authorizationUrl?: string;
        tokenUrl?: string;
        scopes?: Record<string, string>;
      };
      
      return {
        name,
        type: this.mapSwagger2SecurityType(s.type),
        description: s.description,
        parameterName: s.name,
        in: s.in as 'query' | 'header' | undefined,
        flows: s.flow ? {
          [s.flow]: {
            authorizationUrl: s.authorizationUrl,
            tokenUrl: s.tokenUrl,
            scopes: s.scopes,
          },
        } : undefined,
      };
    });
  }

  /**
   * Normalize a single security scheme
   */
  private normalizeSecurityScheme(name: string, scheme: OpenAPIV3.SecuritySchemeObject): SecurityScheme {
    const base: SecurityScheme = {
      name,
      type: scheme.type as SecurityScheme['type'],
      description: scheme.description,
    };

    if (scheme.type === 'apiKey') {
      const apiKeyScheme = scheme as OpenAPIV3.ApiKeySecurityScheme;
      base.parameterName = apiKeyScheme.name;
      base.in = apiKeyScheme.in as 'query' | 'header' | 'cookie';
    } else if (scheme.type === 'http') {
      const httpScheme = scheme as OpenAPIV3.HttpSecurityScheme;
      base.scheme = httpScheme.scheme;
      base.bearerFormat = httpScheme.bearerFormat;
    } else if (scheme.type === 'oauth2') {
      const oauth2Scheme = scheme as OpenAPIV3.OAuth2SecurityScheme;
      base.flows = {};
      if (oauth2Scheme.flows.implicit) {
        base.flows.implicit = {
          authorizationUrl: oauth2Scheme.flows.implicit.authorizationUrl,
          scopes: oauth2Scheme.flows.implicit.scopes,
        };
      }
      if (oauth2Scheme.flows.password) {
        base.flows.password = {
          tokenUrl: oauth2Scheme.flows.password.tokenUrl,
          scopes: oauth2Scheme.flows.password.scopes,
        };
      }
      if (oauth2Scheme.flows.clientCredentials) {
        base.flows.clientCredentials = {
          tokenUrl: oauth2Scheme.flows.clientCredentials.tokenUrl,
          scopes: oauth2Scheme.flows.clientCredentials.scopes,
        };
      }
      if (oauth2Scheme.flows.authorizationCode) {
        base.flows.authorizationCode = {
          authorizationUrl: oauth2Scheme.flows.authorizationCode.authorizationUrl,
          tokenUrl: oauth2Scheme.flows.authorizationCode.tokenUrl,
          scopes: oauth2Scheme.flows.authorizationCode.scopes,
        };
      }
    } else if (scheme.type === 'openIdConnect') {
      const oidcScheme = scheme as OpenAPIV3.OpenIdSecurityScheme;
      base.openIdConnectUrl = oidcScheme.openIdConnectUrl;
    }

    return base;
  }

  /**
   * Map Swagger 2.0 security type to OpenAPI 3.x type
   */
  private mapSwagger2SecurityType(type: string): SecurityScheme['type'] {
    switch (type) {
      case 'basic':
        return 'http';
      case 'apiKey':
        return 'apiKey';
      case 'oauth2':
        return 'oauth2';
      default:
        return 'apiKey';
    }
  }

  /**
   * Normalize global security requirements
   */
  private normalizeGlobalSecurity(
    security?: OpenAPIV2.SecurityRequirementObject[] | OpenAPIV3.SecurityRequirementObject[]
  ): SecurityRequirement[] {
    if (!security) return [];

    return security.flatMap(req =>
      Object.entries(req).map(([schemeName, scopes]) => ({
        schemeName,
        scopes: scopes || [],
      }))
    );
  }

  /**
   * Normalize operations from OpenAPI 3.x
   */
  private normalizeOperationsFromOpenApi3(
    spec: OpenAPIV3.Document | OpenAPIV3_1.Document,
    globalSecurity: SecurityRequirement[],
    options: NormalizationOptions
  ): Operation[] {
    const operations: Operation[] = [];

    if (!spec.paths) return operations;

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

      for (const method of HTTP_METHODS) {
        const operation = (pathItem as Record<string, unknown>)[method.toLowerCase()] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        // Skip deprecated if option is set
        if (operation.deprecated && !options.includeDeprecated) continue;

        // Skip internal if option is set
        if ((operation as Record<string, unknown>)['x-internal'] && !options.includeInternal) continue;

        const normalizedOp = this.normalizeOperation3(path, method, operation, pathItem, globalSecurity, options);
        operations.push(normalizedOp);
      }
    }

    return operations;
  }

  /**
   * Normalize a single operation from OpenAPI 3.x
   */
  private normalizeOperation3(
    path: string,
    method: HttpMethod,
    operation: OpenAPIV3.OperationObject,
    pathItem: OpenAPIV3.PathItemObject,
    globalSecurity: SecurityRequirement[],
    options: NormalizationOptions
  ): Operation {
    // Generate or use existing operationId
    const operationId = operation.operationId ?? 
      (options.generateMissingOperationIds ? generateOperationId(method, path) : `${method}_${path}`);

    // Merge path-level and operation-level parameters
    const allParams = [
      ...(pathItem.parameters || []),
      ...(operation.parameters || []),
    ].filter((p): p is OpenAPIV3.ParameterObject => !('$ref' in p));

    const parameters: OperationParameter[] = allParams.map(param => ({
      name: param.name,
      in: param.in as OperationParameter['in'],
      required: param.required || false,
      description: param.description,
      schema: param.schema as Record<string, unknown>,
      example: param.example,
      deprecated: param.deprecated,
    }));

    // Normalize request body
    let requestBody: OperationRequestBody | undefined;
    if (operation.requestBody && !('$ref' in operation.requestBody)) {
      const rb = operation.requestBody;
      requestBody = {
        required: rb.required || false,
        description: rb.description,
        content: Object.entries(rb.content || {}).reduce((acc, [mediaType, mediaTypeObj]) => {
          acc[mediaType] = {
            schema: mediaTypeObj.schema as Record<string, unknown>,
            example: mediaTypeObj.example,
            examples: mediaTypeObj.examples ? Object.entries(mediaTypeObj.examples).reduce((exAcc, [name, ex]) => {
              if (!('$ref' in ex)) {
                exAcc[name] = { value: ex.value, summary: ex.summary };
              }
              return exAcc;
            }, {} as Record<string, { value: unknown; summary?: string }>) : undefined,
          };
          return acc;
        }, {} as OperationRequestBody['content']),
      };
    }

    // Normalize responses
    const responses: OperationResponse[] = Object.entries(operation.responses || {})
      .filter((entry): entry is [string, OpenAPIV3.ResponseObject] => {
        const resp = entry[1];
        return resp !== undefined && !('$ref' in resp);
      })
      .map(([statusCode, resp]) => {
        const r = resp as OpenAPIV3.ResponseObject;
        return {
          statusCode,
          description: r.description,
          content: r.content ? Object.entries(r.content).reduce((acc, [mediaType, mediaTypeObj]) => {
            const mt = mediaTypeObj as OpenAPIV3.MediaTypeObject;
            acc[mediaType] = {
              schema: mt.schema as Record<string, unknown>,
              example: mt.example,
            };
            return acc;
          }, {} as Record<string, { schema?: Record<string, unknown>; example?: unknown }>) : undefined,
          headers: r.headers ? Object.entries(r.headers)
            .filter((h): h is [string, OpenAPIV3.HeaderObject] => {
              const header = h[1];
              return header !== undefined && !('$ref' in header);
            })
            .reduce((acc, [name, header]) => {
              const hdr = header as OpenAPIV3.HeaderObject;
              acc[name] = {
                description: hdr.description,
                schema: hdr.schema as Record<string, unknown>,
              };
              return acc;
            }, {} as Record<string, { description?: string; schema?: Record<string, unknown> }>) : undefined,
        };
      });

    // Normalize security
    const security: SecurityRequirement[] = operation.security
      ? operation.security.flatMap(req =>
          Object.entries(req).map(([schemeName, scopes]) => ({
            schemeName,
            scopes: scopes || [],
          }))
        )
      : globalSecurity;

    return createOperation({
      operationId,
      originalOperationId: operation.operationId,
      method,
      path,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags || [],
      parameters,
      requestBody,
      responses,
      security,
      deprecated: operation.deprecated || false,
      externalDocs: operation.externalDocs ? {
        url: operation.externalDocs.url,
        description: operation.externalDocs.description,
      } : undefined,
      servers: operation.servers?.map(s => ({
        url: s.url,
        description: s.description,
      })),
    });
  }

  /**
   * Normalize operations from Swagger 2.0
   */
  private normalizeOperationsFromSwagger2(
    spec: OpenAPIV2.Document,
    globalSecurity: SecurityRequirement[],
    options: NormalizationOptions
  ): Operation[] {
    const operations: Operation[] = [];

    if (!spec.paths) return operations;

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

      for (const method of HTTP_METHODS) {
        const operation = (pathItem as Record<string, unknown>)[method.toLowerCase()] as OpenAPIV2.OperationObject | undefined;
        if (!operation) continue;

        // Skip deprecated if option is set
        if (operation.deprecated && !options.includeDeprecated) continue;

        const normalizedOp = this.normalizeOperation2(path, method, operation, pathItem, globalSecurity, options);
        operations.push(normalizedOp);
      }
    }

    return operations;
  }

  /**
   * Normalize a single operation from Swagger 2.0
   */
  private normalizeOperation2(
    path: string,
    method: HttpMethod,
    operation: OpenAPIV2.OperationObject,
    pathItem: OpenAPIV2.PathItemObject,
    globalSecurity: SecurityRequirement[],
    options: NormalizationOptions
  ): Operation {
    const operationId = operation.operationId ?? 
      (options.generateMissingOperationIds ? generateOperationId(method, path) : `${method}_${path}`);

    // Merge path-level and operation-level parameters
    const allParams = [
      ...(pathItem.parameters || []),
      ...(operation.parameters || []),
    ].filter((p): p is OpenAPIV2.Parameter => !('$ref' in p));

    // Separate body parameter from others
    const bodyParam = allParams.find(p => p.in === 'body') as OpenAPIV2.InBodyParameterObject | undefined;
    const otherParams = allParams.filter(p => p.in !== 'body');

    const parameters: OperationParameter[] = otherParams.map(param => ({
      name: param.name,
      in: param.in as OperationParameter['in'],
      required: param.required || false,
      description: param.description,
      schema: 'type' in param ? { type: param.type } : undefined,
      allowEmptyValue: 'allowEmptyValue' in param ? param.allowEmptyValue : undefined,
    }));

    // Convert body parameter to request body
    let requestBody: OperationRequestBody | undefined;
    if (bodyParam) {
      requestBody = {
        required: bodyParam.required || false,
        description: bodyParam.description,
        content: {
          'application/json': {
            schema: bodyParam.schema as Record<string, unknown>,
          },
        },
      };
    }

    // Normalize responses
    const responses: OperationResponse[] = Object.entries(operation.responses || {})
      .filter((entry): entry is [string, OpenAPIV2.ResponseObject] => {
        const resp = entry[1];
        return resp !== undefined && !('$ref' in resp);
      })
      .map(([statusCode, resp]) => {
        const r = resp as OpenAPIV2.ResponseObject;
        return {
          statusCode,
          description: r.description,
          content: r.schema ? {
            'application/json': {
              schema: r.schema as Record<string, unknown>,
            },
          } : undefined,
          headers: r.headers ? Object.entries(r.headers).reduce((acc, [name, header]) => {
            const h = header as { description?: string; type?: string };
            acc[name] = {
              description: h.description,
              schema: { type: h.type },
            };
            return acc;
          }, {} as Record<string, { description?: string; schema?: Record<string, unknown> }>) : undefined,
        };
      });

    // Normalize security
    const security: SecurityRequirement[] = operation.security
      ? operation.security.flatMap(req =>
          Object.entries(req).map(([schemeName, scopes]) => ({
            schemeName,
            scopes: scopes || [],
          }))
        )
      : globalSecurity;

    return createOperation({
      operationId,
      originalOperationId: operation.operationId,
      method,
      path,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags || [],
      parameters,
      requestBody,
      responses,
      security,
      deprecated: operation.deprecated || false,
      externalDocs: operation.externalDocs ? {
        url: operation.externalDocs.url,
        description: operation.externalDocs.description,
      } : undefined,
    });
  }

  /**
   * Check if spec is Swagger 2.0
   */
  private isSwagger2(spec: OpenAPI.Document): spec is OpenAPIV2.Document {
    return 'swagger' in spec && (spec as OpenAPIV2.Document).swagger === '2.0';
  }
}

/**
 * Creates an OpenApiNormalizer instance
 * @returns OpenApiNormalizer instance
 */
export function createOpenApiNormalizer(): OpenApiNormalizer {
  return new OpenApiNormalizer();
}
