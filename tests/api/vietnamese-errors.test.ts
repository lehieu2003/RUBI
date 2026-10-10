import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { describe, it } from 'node:test';

describe('user-facing error messages are Vietnamese', () => {
  it('no API route, guard or middleware returns an English error message', () => {
    // An English message starts with an ASCII word followed by a space or the
    // closing quote; Vietnamese ones contain diacritics in the first words.
    const hits = execSync(
      "grep -rnE \"(apiError\\\\(|error: |new Error\\\\()['\\\"\\`](Unauthorized|Forbidden|Invalid|Failed|Bad Request|Internal|Too Many|[A-Z][a-z]+ (not found|failed|required))\" src/app src/lib src/middleware.ts src/components || true",
      { encoding: 'utf8' }
    ).trim();
    assert.equal(hits, '', 'translate these messages: ' + hits);
  });
});
