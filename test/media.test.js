import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asModelMedia } from '../lib/media.ts';

/**
 * The conversion that decides whether the agent can see.
 *
 * Shipped without it, a screenshot reached the model as a JSON string holding a
 * quarter of a megabyte of base64: unreadable, expensive, and it killed the run
 * outright. Nothing in the type system catches that, so it gets a test.
 */

test('a screenshot becomes a media content part', () => {
  const out = asModelMedia({ mediaType: 'image/png', data: 'AAAA' });
  assert.equal(out.type, 'content');
  assert.deepEqual(out.value, [{ type: 'media', data: 'AAAA', mediaType: 'image/png' }]);
});

test('the image is never smuggled through as text or json', () => {
  const out = asModelMedia({ mediaType: 'image/png', data: 'iVBORw0KGgo' });
  assert.notEqual(out.type, 'text');
  assert.notEqual(out.type, 'json');
  assert.ok(out.value.every((part) => part.type === 'media'));
});

test('a missing media type still produces a usable image', () => {
  assert.equal(asModelMedia({ mediaType: '', data: 'AAAA' }).value[0].mediaType, 'image/png');
});

test('an empty screenshot is refused rather than sent as an empty image', () => {
  assert.throws(() => asModelMedia({ mediaType: 'image/png', data: '' }), /no data/);
});

test('a screenshot saved by an older version still opens', () => {
  // What conversations on disk from before 0.4.0 actually contain.
  const legacy = { content: [{ type: 'media', mediaType: 'image/png', data: 'OLD' }] };
  const out = asModelMedia(legacy);
  assert.equal(out.type, 'content');
  assert.deepEqual(out.value, [{ type: 'media', data: 'OLD', mediaType: 'image/png' }]);
});

test('something that is neither shape is still refused', () => {
  assert.throws(() => asModelMedia({ exit_code: 0 }), /no data/);
  assert.throws(() => asModelMedia(null), /no data/);
});
