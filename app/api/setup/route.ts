import { publicConfig, update, type ProviderId } from '@/lib/config';
import { engineStatus } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ config: publicConfig(), engine: await engineStatus() });
}

export async function POST(request: Request) {
  const body = await request.json() as {
    provider?: ProviderId; apiKey?: string; model?: string; confirmCommands?: boolean;
  };
  update(body);
  return Response.json({ config: publicConfig() });
}
