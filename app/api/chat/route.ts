import { createAgentUIStreamResponse } from 'ai';
import { buildAgent, session } from '@/lib/agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 3600;

export async function POST(request: Request) {
  // The browser is the only client, and it is same-origin. Checking that stops
  // a page the user happens to have open from driving their machines.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).hostname !== '127.0.0.1' && new URL(origin).hostname !== 'localhost') {
    return new Response('Cross-origin requests are refused.', { status: 403 });
  }

  const { messages } = await request.json();

  let agent;
  try {
    agent = buildAgent();
  } catch {
    return Response.json({ error: 'Not configured. Choose a provider and model first.' }, { status: 409 });
  }

  return createAgentUIStreamResponse({ agent, uiMessages: messages });
}

export async function GET() {
  return Response.json({ machineId: session.machineId });
}
