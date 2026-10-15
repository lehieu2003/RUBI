import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { parse } from 'yaml';
import { apiContracts, domains, ErrorResponse, findContract } from '../../src/lib/contracts';
import { OUT_DIR, renderAll } from '../../scripts/generate-api-docs';

/** Every exported HTTP handler under src/app/api as "METHOD /api/path/{param}". */
function routeHandlers(): string[] {
  const files = execSync("git ls-files 'src/app/api/**/route.ts'", { encoding: 'utf8' }).trim().split('\n');
  return files.flatMap((file) => {
    const path = file
      .replace(/^src\/app/, '')
      .replace(/\/route\.ts$/, '')
      .replace(/\[([^\]]+)\]/g, '{$1}');
    const methods = readFileSync(file, 'utf8').matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\b/g);
    return [...methods].map((match) => `${match[1]} ${path}`);
  });
}

describe('API contracts', () => {
  const declared = apiContracts.map((contract) => `${contract.method} ${contract.path}`);

  it('every route handler has a contract', () => {
    const missing = routeHandlers().filter((handler) => !declared.includes(handler));
    assert.deepEqual(missing, [], 'add a contract in src/lib/contracts for: ' + missing.join(', '));
  });

  it('every contract points at an existing route handler', () => {
    const handlers = routeHandlers();
    const orphans = declared.filter((entry) => !handlers.includes(entry));
    assert.deepEqual(orphans, [], 'remove or fix the contract for: ' + orphans.join(', '));
  });

  it('contract ids and method+path pairs are unique', () => {
    const ids = apiContracts.map((contract) => contract.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate contract id');
    assert.equal(new Set(declared).size, declared.length, 'duplicate method + path');
  });

  it('path parameters are declared exactly', () => {
    for (const contract of apiContracts) {
      const inPath = [...contract.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
      const inSchema = Object.keys(contract.params?.shape ?? {}).sort();
      assert.deepEqual(inSchema, inPath, `${contract.id}: params must match the path placeholders`);
    }
  });

  it('role-restricted endpoints list 401 and 403; session endpoints list 401', () => {
    for (const contract of apiContracts) {
      if (contract.auth.kind === 'roles') {
        assert.ok(contract.errors.includes(401) && contract.errors.includes(403), `${contract.id} must list 401 and 403`);
      }
      if (contract.auth.kind === 'session') {
        assert.ok(contract.errors.includes(401), `${contract.id} must list 401`);
      }
    }
  });

  it('has one error shape: { success: false, error, code? }', () => {
    assert.ok(ErrorResponse.safeParse({ success: false, error: 'Không tìm thấy đơn hàng' }).success);
    assert.ok(ErrorResponse.safeParse({ success: false, error: 'Đã chốt', code: 'PAYROLL_LOCKED' }).success);
    assert.equal(ErrorResponse.safeParse({ error: 'thiếu success' }).success, false);
    assert.equal(ErrorResponse.safeParse({ success: true, data: {} }).success, false);
  });

  it('guards and middleware answer with that same shape', () => {
    const helpers = readFileSync('src/lib/auth/helpers.ts', 'utf8');
    assert.doesNotMatch(helpers, /NextResponse\.json/);
    assert.match(helpers, /throw apiError\(/);
    const middleware = readFileSync('src/middleware.ts', 'utf8');
    assert.equal(middleware.match(/\{ success: false, error:/g)?.length, 2);
  });

  it('no endpoint except the health probe answers outside the envelope', () => {
    const offenders = execSync("grep -rlE 'NextResponse\\.json\\(|Response\\.json\\(' src/app/api || true", { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((file) => file && file !== 'src/app/api/health/route.ts');
    assert.deepEqual(offenders, []);
  });

  it('login and refresh use separate rate-limit counters, with a per-account login limit', () => {
    const login = readFileSync('src/app/api/auth/login/route.ts', 'utf8');
    assert.match(login, /rateLimit\(`login-ip:\$\{ip\}`, 30/);
    assert.match(login, /rateLimit\(`login:\$\{ip\}:\$\{email\.toLowerCase\(\)\}`, 5/);
    assert.match(readFileSync('src/app/api/auth/refresh/route.ts', 'utf8'), /rateLimit\(`refresh:\$\{ip\}`, 30/);
  });

  it('reconcile reports a missing order as 404 and a wrong status as 409', () => {
    const route = readFileSync('src/app/api/orders/[id]/reconcile/route.ts', 'utf8');
    assert.match(route, /apiError\('Không tìm thấy đơn hàng', 404\)/);
    assert.match(route, /409, 'ORDER_NOT_DELIVERED'/);
    assert.match(route, /ownItemIds\.has\(item\.id\)/);
    // the status is checked again in the write, before any debt or stock is booked
    assert.match(route, /where: \{ id, factoryId: session\.factoryId, status: 'DELIVERED' \}/);
    assert.ok(route.indexOf('tx.order.updateMany(') < route.indexOf('tx.customerDebtLedger.create('));
    assert.ok(route.indexOf('tx.order.updateMany(') < route.indexOf('changeStock(tx'));
  });

  it('request schemas accept valid input and reject invalid input', () => {
    const login = findContract('POST', '/api/auth/login')!;
    assert.ok(login.body!.safeParse({ email: 'a@rubi.vn', password: 'x' }).success);
    assert.equal(login.body!.safeParse({ email: 'not-an-email', password: 'x' }).success, false);

    const request = findContract('POST', '/api/schedule/my')!;
    assert.ok(request.body!.safeParse({ shiftDate: '2026-10-11', shift: 'SLOT_06_09' }).success);
    assert.equal(request.body!.safeParse({ shiftDate: '11/10/2026', shift: 'SLOT_06_09' }).success, false);
    assert.equal(request.body!.safeParse({ shiftDate: '2026-10-11', shift: 'MORNING' }).success, false);
  });

});

describe('OpenAPI files (api/openapi)', () => {
  const rendered = renderAll();

  it('are up to date with the contracts (run `npm run contract:docs`)', () => {
    for (const [path, content] of Object.entries(rendered)) {
      assert.ok(existsSync(path), `${path} is missing: run npm run contract:docs`);
      assert.equal(readFileSync(path, 'utf8'), content, `${path} is stale: run npm run contract:docs`);
    }
  });

  it('contain no leftover file of a removed domain', () => {
    const onDisk = readdirSync(OUT_DIR)
      .filter((name) => name.endsWith('.yaml'))
      .map((name) => `${OUT_DIR}/${name}`);
    const stray = onDisk.filter((path) => !(path in rendered));
    assert.deepEqual(stray, [], 'delete these files: ' + stray.join(', '));
  });

  it('have one file per domain, each holding only its own endpoints', () => {
    for (const domain of domains) {
      const document = parse(rendered[`${OUT_DIR}/${domain.file}.yaml`]);
      const operations = Object.values(document.paths as Record<string, Record<string, { operationId: string }>>)
        .flatMap((methods) => Object.values(methods))
        .map((operation) => operation.operationId)
        .sort();
      assert.deepEqual(operations, domain.contracts.map((contract) => contract.id).sort(), `${domain.file}.yaml`);
    }
  });

  it('every $ref resolves to an existing file and location', () => {
    const cache = new Map<string, unknown>();
    const load = (path: string) => {
      if (!cache.has(path)) cache.set(path, parse(rendered[path] ?? readFileSync(path, 'utf8')));
      return cache.get(path);
    };
    const broken: string[] = [];
    const walk = (node: unknown, file: string) => {
      if (Array.isArray(node)) return node.forEach((item) => walk(item, file));
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (key !== '$ref' || typeof value !== 'string') {
          walk(value, file);
          continue;
        }
        const [target, pointer = ''] = value.split('#');
        const targetFile = target ? join(dirname(file), target) : file;
        let current: unknown = existsSync(targetFile) ? load(targetFile) : undefined;
        for (const part of pointer.split('/').filter(Boolean)) {
          const name = part.replace(/~1/g, '/').replace(/~0/g, '~');
          current = current && typeof current === 'object' ? (current as Record<string, unknown>)[name] : undefined;
        }
        if (current === undefined) broken.push(`${file}: ${value}`);
      }
    };
    for (const path of Object.keys(rendered).filter((name) => name.endsWith('.yaml'))) walk(load(path), path);
    assert.deepEqual(broken, []);
  });

  it('the entry point references every endpoint path', () => {
    const root = parse(rendered[`${OUT_DIR}/openapi.yaml`]);
    assert.deepEqual(Object.keys(root.paths).sort(), [...new Set(apiContracts.map((contract) => contract.path))].sort());
  });
});

describe('pagination in the contracts and OpenAPI', () => {
  const rendered = renderAll();
  const isPaginated = (contract: (typeof apiContracts)[number]) => {
    const shape = (contract.response as { shape?: Record<string, unknown> }).shape;
    return Boolean(shape && 'meta' in shape);
  };

  it('pagination.yaml declares the standard metadata', () => {
    const { PaginationMeta } = parse(rendered[`${OUT_DIR}/components/schemas/pagination.yaml`]);
    assert.deepEqual(PaginationMeta.required, ['page', 'limit', 'total_item', 'total_page']);
    assert.deepEqual(Object.keys(PaginationMeta.properties), ['page', 'limit', 'total_item', 'total_page']);
    for (const field of Object.values(PaginationMeta.properties) as Array<Record<string, unknown>>) {
      assert.equal(field.type, 'integer');
      assert.ok(field.description, 'every field is described');
      assert.ok('example' in field, 'every field has an example');
    }
    assert.equal(PaginationMeta.additionalProperties, false);
    assert.equal(PaginationMeta.properties.page.minimum, 1);
    assert.equal(PaginationMeta.properties.limit.maximum, 200);
  });

  it('the order list is paginated', () => {
    assert.ok(isPaginated(findContract('GET', '/api/orders')!));
  });

  it('every paginated endpoint takes page and limit and can answer 400', () => {
    const paged = apiContracts.filter(isPaginated);
    assert.ok(paged.length >= 1);
    for (const contract of paged) {
      const query = Object.keys(contract.query?.shape ?? {});
      assert.ok(query.includes('page') && query.includes('limit'), `${contract.id} must accept page and limit`);
      assert.ok(contract.errors.includes(400), `${contract.id} must list 400 for invalid paging`);
      assert.equal(contract.method, 'GET', `${contract.id}: only GET lists are paginated`);
    }
  });

  it('no endpoint accepts page/limit without returning the metadata', () => {
    for (const contract of apiContracts.filter((item) => !isPaginated(item))) {
      const query = Object.keys(contract.query?.shape ?? {});
      assert.ok(!query.includes('page') && !query.includes('limit'), `${contract.id} takes paging parameters but is not paginated`);
    }
  });

  it('paginated responses reference the shared schema instead of repeating it', () => {
    const order = rendered[`${OUT_DIR}/order.yaml`];
    assert.match(order, /meta:\n\s+\$ref: \.\/components\/schemas\/pagination\.yaml#\/PaginationMeta/);
    assert.doesNotMatch(order, /total_item:/);
  });

  it('the page and limit parameters only accept digits', () => {
    const query = findContract('GET', '/api/orders')!.query!;
    assert.ok(query.safeParse({ page: '2', limit: '50' }).success);
    assert.ok(query.safeParse({}).success);
    assert.equal(query.safeParse({ page: 'two' }).success, false);
    assert.equal(query.safeParse({ limit: '-5' }).success, false);
  });

  it('the paginated fixtures carry consistent metadata', () => {
    for (const kind of ['success', 'empty']) {
      const fixture = JSON.parse(readFileSync(`${OUT_DIR}/fixtures/responses/${kind}/listOrders.json`, 'utf8'));
      const { meta, data } = fixture.body;
      assert.equal(meta.total_page, Math.ceil(meta.total_item / meta.limit), `${kind}/listOrders.json`);
      assert.ok(data.length <= meta.limit);
      if (kind === 'empty') assert.deepEqual(data, []);
    }
  });
});

describe('response fixtures (api/openapi/fixtures)', () => {
  const dir = `${OUT_DIR}/fixtures/responses`;
  const fixtures = (kind: string) =>
    readdirSync(`${dir}/${kind}`)
      .filter((name) => name.endsWith('.json'))
      .map((name) => ({ name: `${kind}/${name}`, ...JSON.parse(readFileSync(`${dir}/${kind}/${name}`, 'utf8')) }));
  const contractOf = (id: string) => apiContracts.find((contract) => contract.id === id);

  it('success and empty fixtures match their contract', () => {
    for (const fixture of [...fixtures('success'), ...fixtures('empty')]) {
      const contract = contractOf(fixture.operationId);
      assert.ok(contract, `${fixture.name}: unknown operation ${fixture.operationId}`);
      assert.equal(fixture.status, contract.successStatus ?? 200, fixture.name);
      const result = contract.response.safeParse(fixture.body);
      assert.ok(result.success, `${fixture.name} no longer matches its contract; re-record with npm run contract:verify -- --record`);
    }
  });

  it('error fixtures match the error contract and a declared status', () => {
    for (const fixture of fixtures('error')) {
      const contract = contractOf(fixture.operationId);
      assert.ok(contract, `${fixture.name}: unknown operation ${fixture.operationId}`);
      assert.ok(contract.errors.includes(fixture.status), `${fixture.name}: status ${fixture.status} is not declared`);
      assert.ok(ErrorResponse.safeParse(fixture.body).success, `${fixture.name} does not match the error contract`);
    }
  });

  it('every endpoint with a success response has a success fixture', () => {
    const recorded = new Set(fixtures('success').map((fixture) => fixture.operationId));
    const missing = apiContracts
      .filter((contract) => contract.id !== 'createDriver') // always answers 405
      .map((contract) => contract.id)
      .filter((id) => !recorded.has(id));
    assert.deepEqual(missing, [], 're-record with npm run contract:verify -- --record');
  });

  it('fixtures contain no token or password', () => {
    const leaked = execSync(`grep -rlE "eyJ[A-Za-z0-9_-]{10,}|12345678" ${dir} || true`, { encoding: 'utf8' }).trim();
    assert.equal(leaked, '', 'secrets found in: ' + leaked);
  });
});
