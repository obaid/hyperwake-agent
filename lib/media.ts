/**
 * Turning a screenshot into something a model can see.
 *
 * Deliberately free of imports so it can be tested directly, and small enough to
 * read in one go, because the failure it prevents is invisible: without the
 * conversion the SDK serialises a tool's return value as JSON, so a quarter of a
 * megabyte of base64 reaches the model as *text*. The model cannot see the
 * picture, it pays for every character of it, and the run stops dead.
 *
 * The shape is the `content` variant of LanguageModelV4ToolResultOutput. Note
 * `data` is a tagged union, not a string: `{ type: 'data', data: base64 }`. An
 * older revision of the spec used a `media` part with a bare string, and the
 * provider rejects that with a schema error several hundred lines long whose
 * operative sentence is "expected object, received string".
 */

export type Shot = { mediaType: string; data: string };

export type ModelMedia = {
  type: 'content';
  value: Array<{
    type: 'file';
    data: { type: 'data'; data: string };
    mediaType: string;
  }>;
};

/**
 * Conversations saved before this conversion existed hold the shape the tool
 * used to return. Reopening one must not throw, so every shape we have ever
 * produced is accepted. New runs only make the current one.
 */
function shotFrom(output: unknown): Shot | null {
  const value = output as any;
  if (typeof value?.data === 'string' && value.data) {
    return { data: value.data, mediaType: value.mediaType };
  }
  const part = value?.content?.find?.(
    (p: any) => p?.type === 'media' || p?.type === 'file',
  );
  if (!part) return null;
  const data = typeof part.data === 'string' ? part.data : part.data?.data;
  return typeof data === 'string' && data ? { data, mediaType: part.mediaType } : null;
}

export function asModelMedia(output: Shot | unknown): ModelMedia {
  const shot = shotFrom(output);
  if (!shot) throw new Error('A screenshot with no data cannot be shown to the model.');
  return {
    type: 'content',
    value: [{
      type: 'file',
      data: { type: 'data', data: shot.data },
      mediaType: shot.mediaType || 'image/png',
    }],
  };
}
