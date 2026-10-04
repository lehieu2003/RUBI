import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildCsv } from '../../src/lib/export-excel';

const source = readFileSync('src/lib/export-excel.ts', 'utf8');

describe('buildCsv formula injection guard', () => {
  it('neutralizes cells that Excel would evaluate as formulas', () => {
    const csv = buildCsv(['name'], [['=HYPERLINK("http://evil","click")']]);
    assert.match(csv, /"'=HYPERLINK/);
    assert.doesNotMatch(csv, /^"[^']*=/m);
  });

  it('also neutralizes + and @ prefixes and command-style dashes', () => {
    const csv = buildCsv(['a'], [['+SUM(A1:A2)'], ['@cmd'], ['-cmd|/c calc']]);
    assert.match(csv, /"'\+SUM/);
    assert.match(csv, /"'@cmd/);
    assert.match(csv, /"'-cmd/);
  });

  it('keeps negative numbers numeric (no prefix)', () => {
    const csv = buildCsv(['amount'], [[-123], ['-123,456đ']]);
    assert.match(csv, /"-123"/);
  });

  it('still escapes embedded quotes, keeps BOM + CRLF', () => {
    const csv = buildCsv(['a'], [['say "hi"']]);
    assert.match(csv, /"say ""hi"""/);
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('\r\n'));
  });

  it('guard regex exists in source', () => {
    assert.ok(source.includes('^[=+@]|^-(?!\\d)'));
  });
});
