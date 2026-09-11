/**
 * Turning a screenshot into something a model can see.
 *
 * Deliberately free of imports so it can be tested directly, and small enough
 * to read in one go, because the failure it prevents is invisible: without the
 * conversion the SDK serialises a tool's return value as JSON, so a quarter of
 * a megabyte of base64 reaches the model as *text*. The model cannot see the
 * picture, it pays for every character of it, and the run tends to stop dead.
 *
 * The shape is LanguageModelV2ToolResultOutput's `content` variant, which is
 * what every provider's image path expects.
 */

export type Shot = { mediaType: string; data: string };

export type ModelMedia = {
  type: 'content';
  value: Array<{ type: 'media'; data: string; mediaType: string }>;
};

/**
 * Conversations saved before this conversion existed hold the shape the tool
 * used to return, `{ content: [{ type: 'media', ... }] }`. Reopening one of
 * those must not throw, so both shapes are accepted. New runs only ever produce
 * the first.
 */
function shotFrom(output: unknown): Shot | null {
  const value = output as any;
  if (value?.data) return { data: value.data, mediaType: value.mediaType };
  const legacy = value?.content?.find?.((part: any) => part?.type === 'media');
  return legacy?.data ? { data: legacy.data, mediaType: legacy.mediaType } : null;
}

export function asModelMedia(output: Shot | unknown): ModelMedia {
  const shot = shotFrom(output);
  if (!shot) throw new Error('A screenshot with no data cannot be shown to the model.');
  return {
    type: 'content',
    value: [{ type: 'media', data: shot.data, mediaType: shot.mediaType || 'image/png' }],
  };
}
