<!-- generated-by: gsd-doc-writer -->

# Testing

This document describes the testing setup and practices for the IceFlow SaaS project.

## Test Framework and Setup

**Status: Not yet configured**

IceFlow SaaS currently does not have a test framework installed. The `package.json` `devDependencies` do not include any testing libraries (such as Jest, Vitest, or React Testing Library).

To set up testing, install a framework:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

After installation, add a `test` script to `package.json` and create a `vitest.config.ts` in the project root.

## Running Tests

No test script is currently configured in `package.json`.

Once testing is set up, add the following scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch"
  }
}
```

Run commands:

```bash
npm run test        # Run tests in watch mode
npm run test:run    # Run tests once (CI mode)
```

## Writing New Tests

Test file naming convention to use: `*.test.ts` or `*.spec.ts`

Suggested directory structure:

```
src/
  __tests__/
    components/
    lib/
    actions/
```

Place test files alongside the code they test, or in a central `__tests__` directory.

Example test file (`src/__tests__/example.test.ts`):

```typescript
import { describe, it, expect } from 'vitest'

describe('example test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })
})
```

## Coverage Requirements

**No coverage threshold configured.**

To add coverage reporting with Vitest, update `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80
      }
    }
  }
})
```

## CI Integration

**No CI/CD pipeline configured.**

When CI is set up, tests will run via the CI workflow (e.g., `.github/workflows/ci.yml`). The test command typically runs as:

```bash
npm run test:run
```

## Next Steps

1. Choose a test framework (Vitest recommended for Next.js projects)
2. Install testing dependencies
3. Configure Vitest in `vitest.config.ts`
4. Add test scripts to `package.json`
5. Write initial tests for core functionality