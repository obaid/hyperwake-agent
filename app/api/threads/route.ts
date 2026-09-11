import { createThread, listThreads } from '@/lib/threads';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ threads: listThreads() });
}

export async function POST() {
  return Response.json({ thread: createThread() });
}
