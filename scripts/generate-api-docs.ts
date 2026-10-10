/**
 * Generates the API reference from the contracts in src/lib/contracts:
 *
 *   docs/openapi.json      OpenAPI 3.1 document
 *   docs/API-CONTRACT.md   readable reference
 *
 *   npm run contract:docs          write both files
 *   npm run contract:docs -- --check   exit 1 when the files are out of date
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { apiContracts, ErrorResponse, type ApiContract, type ContractAuth } from '../src/lib/contracts';

type JsonSchema = Record<string, unknown>;

const toJsonSchema = (schema: z.ZodType): JsonSchema => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { unrepresentable: 'any' }) as JsonSchema;
  return rest;
};

const STATUS_TEXT: Record<number, string> = {
  400: 'Invalid request',
  401: 'Not signed in or session expired',
  403: 'Not allowed for this role, or a password change is required (`PASSWORD_CHANGE_REQUIRED`)',
  404: 'Not found',
  405: 'Not supported',
  409: 'Conflict with the current state',
  429: 'Too many requests',
  500: 'Server error',
  503: 'Service unavailable',
};

function describeAuth(auth: ContractAuth): string {
  switch (auth.kind) {
    case 'public':
      return 'Public';
    case 'session':
      return 'Any signed-in user';
    case 'roles':
      return auth.roles.join(', ');
    case 'custom':
      return auth.description;
  }
}

// ---------------------------------------------------------------- OpenAPI

function parameters(contract: ApiContract) {
  const list: JsonSchema[] = [];
  for (const [location, schema] of [['path', contract.params], ['query', contract.query]] as const) {
    if (!schema) continue;
    for (const [name, field] of Object.entries(schema.shape)) {
      list.push({
        name,
        in: location,
        required: location === 'path' || !(field as z.ZodType).safeParse(undefined).success,
        schema: toJsonSchema(field as z.ZodType),
      });
    }
  }
  return list;
}

export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const contract of apiContracts) {
    const responses: Record<string, unknown> = {};
    if (contract.method !== 'POST' || contract.id !== 'createDriver') {
      responses[String(contract.successStatus ?? 200)] = {
        description: 'Success',
        content: { 'application/json': { schema: toJsonSchema(contract.response) } },
      };
    }
    for (const status of contract.errors) {
      responses[String(status)] = {
        description: STATUS_TEXT[status] ?? 'Error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      };
    }

    const operation: Record<string, unknown> = {
      operationId: contract.id,
      tags: [contract.tag],
      summary: contract.summary,
      description: [`Access: ${describeAuth(contract.auth)}.`, contract.notes].filter(Boolean).join('\n\n'),
      responses,
    };
    const params = parameters(contract);
    if (params.length > 0) operation.parameters = params;
    if (contract.body) {
      operation.requestBody = {
        required: !contract.body.safeParse(undefined).success,
        content: { 'application/json': { schema: toJsonSchema(contract.body) } },
      };
    }
    if (contract.auth.kind === 'public') operation.security = [];

    (paths[contract.path] ??= {})[contract.method.toLowerCase()] = operation;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'IceFlow API — Nhà máy đá tinh khiết Rubi',
      version: '1.0.0',
      description:
        'Generated from src/lib/contracts. Describes the API as it behaves today. ' +
        'Most endpoints wrap their payload in `{ success: true, data }`; the exceptions are noted per endpoint.',
    },
    servers: [{ url: '/' }],
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'auth_token' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: { Error: toJsonSchema(ErrorResponse) },
    },
  };
}

// --------------------------------------------------------------- Markdown

/** Renders a JSON Schema as a compact TypeScript-like type. */
function typeOf(schema: JsonSchema | undefined, indent = ''): string {
  if (!schema || Object.keys(schema).length === 0) return 'unknown';
  if ('const' in schema) return JSON.stringify(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (Array.isArray(schema.anyOf)) {
    return (schema.anyOf as JsonSchema[]).map((option) => typeOf(option, indent)).join(' | ');
  }
  if ('not' in schema) return 'never';
  switch (schema.type) {
    case 'null':
      return 'null';
    case 'boolean':
      return 'boolean';
    case 'integer':
      return 'integer';
    case 'number':
      return 'number';
    case 'string':
      return typeof schema.pattern === 'string' ? `string /* ${hint(schema.pattern)} */` : 'string';
    case 'array':
      return `Array<${typeOf(schema.items as JsonSchema, indent)}>`;
    case 'object': {
      const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
      const required = new Set((schema.required as string[]) ?? []);
      const inner = `${indent}  `;
      const lines = Object.entries(properties).map(
        ([key, value]) => `${inner}${key}${required.has(key) ? '' : '?'}: ${typeOf(value, inner)};`
      );
      return lines.length === 0 ? '{}' : `{\n${lines.join('\n')}\n${indent}}`;
    }
    default:
      return 'unknown';
  }
}

function hint(pattern: string): string {
  if (pattern.includes('T\\d{2}')) return 'ISO 8601 timestamp';
  if (pattern === '^\\d{4}-\\d{2}-\\d{2}$') return 'YYYY-MM-DD';
  if (pattern.includes('(0[1-9]|1[0-2])$')) return 'YYYY-MM';
  if (pattern.includes('(\\.\\d+)?')) return 'decimal as string';
  return 'pattern';
}

const block = (code: string) => '```ts\n' + code + '\n```';

export function buildMarkdown(): string {
  const tags = [...new Set(apiContracts.map((contract) => contract.tag))];
  const out: string[] = [
    '<!-- Generated by `npm run contract:docs` from src/lib/contracts. Do not edit by hand. -->',
    '# API Contract',
    '',
    `The contract of all ${apiContracts.length} API endpoints of IceFlow (Nhà máy đá tinh khiết Rubi), describing the API as it behaves today. ` +
      'The source of truth is `src/lib/contracts`; this file and `docs/openapi.json` are generated from it, and ' +
      '`npm run contract:verify` checks a running server against it.',
    '',
    '## Conventions',
    '',
    '- **Authentication**: the httpOnly cookie `auth_token`, or `Authorization: Bearer <JWT>`. Both carry the same 7-day JWT.',
    '- **Success**: `{ "success": true, "data": … }` unless an endpoint says it has no envelope.',
    '- **Errors**: `{ "success": false, "error": "<Vietnamese message>", "code"?: "<CODE>" }`. The role guards and the middleware send `{ "error", "code"? }` without `success`.',
    '- **Password change required**: an account flagged `mustChangePassword` gets `403` with `code: "PASSWORD_CHANGE_REQUIRED"` on every endpoint outside `/api/auth/*`.',
    '- **Dates**: timestamps are ISO 8601 strings; calendar dates are `YYYY-MM-DD`; months are `YYYY-MM`.',
    '- **Money**: numbers, except where a field is marked "decimal as string".',
    '',
    '## Endpoints',
    '',
    '| Method | Path | Access | Summary |',
    '|---|---|---|---|',
    ...apiContracts.map(
      (contract) =>
        `| ${contract.method} | \`${contract.path}\` | ${
          contract.auth.kind === 'custom' ? 'See below' : describeAuth(contract.auth)
        } | ${contract.summary} |`
    ),
    '',
  ];

  for (const tag of tags) {
    out.push(`## ${tag}`, '');
    for (const contract of apiContracts.filter((item) => item.tag === tag)) {
      out.push(`### ${contract.method} \`${contract.path}\``, '', `${contract.summary}.`, '');
      out.push(`- **Access**: ${describeAuth(contract.auth)}`);
      out.push(`- **Contract id**: \`${contract.id}\``);
      if (contract.errors.length > 0) out.push(`- **Error statuses**: ${contract.errors.join(', ')}`);
      if (contract.notes) out.push(`- **Notes**: ${contract.notes}`);
      out.push('');
      if (contract.params) out.push('Path parameters:', '', block(typeOf(toJsonSchema(contract.params))), '');
      if (contract.query) out.push('Query parameters:', '', block(typeOf(toJsonSchema(contract.query))), '');
      if (contract.body) out.push('Request body:', '', block(typeOf(toJsonSchema(contract.body))), '');
      const response = typeOf(toJsonSchema(contract.response));
      if (response !== 'never') {
        out.push(`Response \`${contract.successStatus ?? 200}\`:`, '', block(response), '');
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export const OPENAPI_PATH = 'docs/openapi.json';
export const MARKDOWN_PATH = 'docs/API-CONTRACT.md';

export function renderAll(): Record<string, string> {
  return {
    [OPENAPI_PATH]: JSON.stringify(buildOpenApi(), null, 2) + '\n',
    [MARKDOWN_PATH]: buildMarkdown(),
  };
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  let stale = false;
  for (const [path, content] of Object.entries(renderAll())) {
    if (check) {
      let current = '';
      try {
        current = readFileSync(path, 'utf8');
      } catch {
        current = '';
      }
      if (current !== content) {
        console.error(`✖ ${path} is out of date. Run: npm run contract:docs`);
        stale = true;
      }
    } else {
      writeFileSync(path, content);
      console.warn(`wrote ${path}`);
    }
  }
  if (stale) process.exit(1);
}
