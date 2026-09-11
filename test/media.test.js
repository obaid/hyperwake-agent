import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asModelMedia } from '../lib/media.ts';

/**
 * The conversion that decides whether the agent can see.
 *
 * Two ways this has already gone wrong in production, both worth a test:
 *
 *   1. No conversion at all, so a screenshot reached the model as a JSON string
 *      holding a quarter of a megabyte of base64. Unreadable, expensive, and it
 *      killed the run.
 *   2. The right idea in the wrong spec revision: a `media` part carrying a bare
 *      string, which the provider rejects outright.
 */

const PIXEL = 'iVBORw0KGgoAAAANSUhEUg';

test('a screenshot becomes a V4 file part with tagged data', () => {
  const out = asModelMedia({ mediaType: 'image/png', data: PIXEL });
  assert.equal(out.type, 'content');
  assert.deepEqual(out.value, [{
    type: 'file',
    data: { type: 'data', data: PIXEL },
    mediaType: 'image/png',
  }]);
});

test('data is an object, never a bare string', () => {
  // The exact mistake the provider reported as "expected object, received string".
  const part = asModelMedia({ mediaType: 'image/png', data: PIXEL }).value[0];
  assert.equal(typeof part.data, 'object');
  assert.equal(part.data.type, 'data');
  assert.equal(typeof part.data.data, 'string');
});

test('no part is ever typed "media"', () => {
  // Valid in an older revision of the spec, rejected by this one.
  const out = asModelMedia({ mediaType: 'image/png', data: PIXEL });
  assert.ok(out.value.every((part) => part.type !== 'media'));
});

test('the image is never smuggled through as text or json', () => {
  const out = asModelMedia({ mediaType: 'image/png', data: PIXEL });
  assert.notEqual(out.type, 'text');
  assert.notEqual(out.type, 'json');
});

test('a missing media type still produces a usable image', () => {
  assert.equal(asModelMedia({ mediaType: '', data: PIXEL }).value[0].mediaType, 'image/png');
});

test('screenshots saved by any earlier version still open', () => {
  // 0.3.0 and earlier.
  const first = { content: [{ type: 'media', mediaType: 'image/png', data: 'OLD' }] };
  assert.equal(asModelMedia(first).value[0].data.data, 'OLD');

  // 0.5.0, which produced a file part with a bare string.
  const second = { content: [{ type: 'file', mediaType: 'image/png', data: 'MID' }] };
  assert.equal(asModelMedia(second).value[0].data.data, 'MID');
});

test('anything that is not a screenshot is refused', () => {
  assert.throws(() => asModelMedia({ exit_code: 0 }), /no data/);
  assert.throws(() => asModelMedia({ mediaType: 'image/png', data: '' }), /no data/);
  assert.throws(() => asModelMedia(null), /no data/);
});
