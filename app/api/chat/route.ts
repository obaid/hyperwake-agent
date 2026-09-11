import { createAgentUIStreamResponse } from 'ai';
import { buildAgent, sessionFor } from '@/lib/agent';
import { readThread, update, titleFrom } from '@/lib/threads';
import { startReaper } from '@/lib/reaper';

export const dynamic = 'force-dynamic';
export const maxDuration = 3600;

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const { hostname } = new URL(origin);
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

export async function POST(request: Request) {
  // The browser is the only client and it is same-origin. Checking stops a page
  // the user happens to have open from driving their machines.
  if (!sameOrigin(request)) return new Response('Cross-origin requests are refused.', { status: 403 });

  startReaper();

  const { messages, threadId } = await request.json();
  const thread = threadId ? readThread(threadId) : null;
  if (!thread) return Response.json({ error: 'No such conversation.' }, { status: 404 });

  let agent;
  try {
    agent = buildAgent(sessionFor(thread.id));
  } catch {
    return Response.json({ error: 'Not configured. Choose a provider and model first.' }, { status: 409 });
  }

  // Name the thread from its first question, and save what was asked before the
  // run starts, so a crash mid-answer still leaves the conversation intact.
  const first = messages.find((m: any) => m.role === 'user');
  const spoken = first?.parts?.find((p: any) => p.type === 'text')?.text;
  update(thread.id, {
    messages,
    ...(thread.title === 'New conversation' && spoken ? { title: titleFrom(spoken) } : {}),
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    onFinish: ({ messages: done }: any) => { update(thread.id, { messages: done }); },

    /**
     * Say what actually went wrong.
     *
     * The SDK masks tool errors as "An error occurred." by default, which is
     * the right call when a stranger is reading them. Here the only reader is
     * the person who started the engine on their own laptop, and the masked
     * message turns a diagnosable failure into a dead end.
     */
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`chat error: ${message}\n`);
      return message || 'The run failed without saying why.';
    },
  });
}
