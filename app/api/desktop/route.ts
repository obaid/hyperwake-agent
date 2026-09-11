import { desktopUrl } from '@/lib/engine';
import { session } from '@/lib/agent';

export const dynamic = 'force-dynamic';

/**
 * Mint a viewing ticket.
 *
 * Tickets are single use and live sixty seconds, so this is called when the
 * panel opens rather than when a machine is created. A URL minted early is
 * already dead by the time anyone clicks.
 */
export async function POST() {
  if (!session.machineId) {
    return Response.json({ error: 'There is no machine yet.' }, { status: 409 });
  }
  try {
    const { desktop_url: url, expires_in: expires } = await desktopUrl(session.machineId);
    return Response.json({ url, expires });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}
