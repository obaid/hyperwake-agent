import { listMachines, deleteMachine } from '@/lib/engine';
import { orphans } from '@/lib/reaper';
import { ownedMachines } from '@/lib/threads';

export const dynamic = 'force-dynamic';

/** Everything the engine has, and which of it this app believes it owns. */
export async function GET() {
  try {
    const all = await listMachines();
    const mine = new Map(ownedMachines().map((m) => [m.machineId, m.threadId]));
    return Response.json({
      machines: (Array.isArray(all) ? all : []).map((m: any) => ({
        id: m.id, name: m.name, status: m.status, memory_mb: m.memory_mb,
        threadId: mine.get(m.id) ?? null,
      })),
      orphanCount: (await orphans()).length,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Which machine?' }, { status: 400 });
  try {
    await deleteMachine(id);
    return Response.json({ deleted: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}
