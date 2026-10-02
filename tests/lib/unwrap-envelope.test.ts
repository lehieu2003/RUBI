import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapEnvelope } from '../../src/lib/api-response';

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
