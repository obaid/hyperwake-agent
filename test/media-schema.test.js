import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toolModelMessageSchema } from 'ai';
import { asModelMedia } from '../lib/media.ts';

/**
 * Validate the screenshot against the SDK's own schema.
 *
 * The shape shipped in 0.5.0 passed every test written by hand and was still
 * rejected at runtime, because those tests only checked my reading of the spec
 * and my reading was of the wrong revision. This checks the real validator, the
 * one that produced "The messages do not match the ModelMessage[] schema".
 */

function toolMessageCarrying(output) {
  return {
    role: 'tool',
    content: [{
      type: 'tool-result',
      toolCallId: 'call-1',
      toolName: 'screenshot',
      output,
    }],
  };
}

test('a converted screenshot satisfies the SDK tool-message schema', () => {
  const message = toolMessageCarrying(asModelMedia({ mediaType: 'image/png', data: 'iVBORw0KGgo' }));
  const result = toolModelMessageSchema.safeParse(message);
  assert.ok(
    result.success,
    `rejected by the SDK: ${JSON.stringify(result.error?.issues?.slice(0, 2))}`,
  );
});

test('the 0.5.0 shape really is rejected, which is why this test exists', () => {
  // A file part whose data is a bare string rather than a tagged union.
  const broken = {
    type: 'content',
    value: [{ type: 'file', data: 'iVBORw0KGgo', mediaType: 'image/png' }],
  };
  assert.equal(toolModelMessageSchema.safeParse(toolMessageCarrying(broken)).success, false);
});

test('the pre-0.4 shape is rejected too', () => {
  const older = {
    type: 'content',
    value: [{ type: 'media', data: 'iVBORw0KGgo', mediaType: 'image/png' }],
  };
  assert.equal(toolModelMessageSchema.safeParse(toolMessageCarrying(older)).success, false);
});
