import { listModels } from '@/lib/providers';
import type { ProviderId } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Fetch the model list with a key the browser just typed, without storing it. */
export async function POST(request: Request) {
  const { provider, apiKey } = await request.json() as { provider: ProviderId; apiKey: string };
  if (!provider || !apiKey) return Response.json({ error: 'Provider and key are required.' }, { status: 400 });

  try {
    const models = await listModels(provider, apiKey);
    if (models.length === 0) {
      return Response.json({ error: 'That key works, but none of its models can both call tools and see images.' }, { status: 422 });
    }
    return Response.json({ models });
  } catch (error: any) {
    return Response.json({ error: error.message ?? 'Could not reach the provider.' }, { status: 502 });
  }
}
