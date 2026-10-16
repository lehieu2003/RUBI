import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const card = readFileSync('src/components/driver/DeliveryCard.tsx', 'utf8');

// The photo was only kept in the browser and never sent with the delivery
// confirmation, yet the card said it was saved as proof. Until photos are
// stored on the server, the card must not offer or claim one.
describe('driver delivery card', () => {
  it('offers no photo capture', () => {
    assert.doesNotMatch(card, /type="file"/);
    assert.doesNotMatch(card, /capture=/);
    assert.doesNotMatch(card, /Chụp ảnh/);
  });

  it('never claims a photo proof was saved or attached', () => {
    assert.doesNotMatch(card, /Đã lưu ảnh bằng chứng/);
    assert.doesNotMatch(card, /Đã đính kèm bằng chứng/);
  });
});
