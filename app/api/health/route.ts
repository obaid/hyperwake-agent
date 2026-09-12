import { engineStatus } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const engine = await engineStatus();
  return Response.json({ ok: true, service: 'mola-agent', engine });
}
