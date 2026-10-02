import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapEnvelope } from '../../src/lib/api-response';
import { buildCsv } from '../../src/lib/export-excel';

describe('unwrapEnvelope', () => {
  it('returns data array from success envelope', () => {
    assert.deepEqual(unwrapEnvelope({ success: true, data: [1, 2] }), [1, 2]);
  });

  it('returns data object from success envelope', () => {
    assert.deepEqual(unwrapEnvelope({ success: true, data: { a: 1 } }), { a: 1 });
  });

  it('returns plain array untouched (already unwrapped)', () => {
    assert.deepEqual(unwrapEnvelope([1, 2]), [1, 2]);
  });

  it('returns envelope untouched when data is undefined', () => {
    const envelope = { success: false, error: 'x' };
    assert.deepEqual(unwrapEnvelope(envelope), envelope);
  });

  it('returns null untouched', () => {
    assert.equal(unwrapEnvelope(null), null);
  });
});

describe('buildCsv', () => {
  it('prepends UTF-8 BOM', () => {
    const csv = buildCsv(['A'], [['1']]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
  });

  it('escapes double quotes inside cells', () => {
    const csv = buildCsv(['Note'], [['he said "ok"']]);
    assert.ok(csv.includes('"he said ""ok"""'), csv);
  });

  it('joins rows with CRLF and quotes every cell', () => {
    const csv = buildCsv(['H1', 'H2'], [['a', 'b'], ['c', 'd']]);
    assert.ok(csv.includes('"H1","H2"\r\n"a","b"\r\n"c","d"'), csv);
  });

  it('renders null cells as empty quoted strings', () => {
    const csv = buildCsv(['H'], [[null]]);
    assert.ok(csv.includes('"H"\r\n""'), csv);
  });
});
