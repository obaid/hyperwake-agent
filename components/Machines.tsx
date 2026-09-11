'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Every machine the engine has.
 *
 * Worth its own view because machines outlive the conversations that made them,
 * and a forgotten one holds several gigabytes of the host until somebody
 * notices. This is where you notice.
 */

export type Machine = {
  id: string;
  name: string;
  status: string;
  vcpus: number;
  memory_mb: number;
  disk_gb: number;
  created_at: string | null;
  threadId: string | null;
  threadTitle: string | null;
};

const gb = (mb: number) => `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;

function age(iso: string | null) {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m old`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h old` : `${Math.round(hours / 24)}d old`;
}

export default function Machines({
  onOpenThread,
  onClose,
}: {
  onOpenThread: (threadId: string) => void;
  onClose: () => void;
}) {
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [runningMemoryMb, setRunningMemoryMb] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/machines');
    const body = await response.json();
    if (!response.ok) { setError(body.error); setMachines([]); return; }
    setError(null);
    setMachines(body.machines);
    setRunningMemoryMb(body.runningMemoryMb ?? 0);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function act(id: string, action: 'stop' | 'start') {
    setBusy(id);
    await fetch('/api/machines', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    await refresh();
    setBusy(null);
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/machines?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setConfirming(null);
    await refresh();
    setBusy(null);
  }

  const running = (machines ?? []).filter((m) => m.status === 'ready' || m.status === 'booting');
  const orphans = (machines ?? []).filter((m) => !m.threadId);

  return (
    <main className="conversation">
      <header className="bar">
        <strong>Machines</strong>
        <span className="muted small">
          {machines === null ? 'looking…'
            : `${machines.length} total · ${running.length} running · ${gb(runningMemoryMb)} of this host`}
        </span>
        <button className="ghost" onClick={() => void refresh()}>Refresh</button>
        <button className="ghost" onClick={onClose}>Close</button>
      </header>

      <div className="messages">
        {error && (
          <p className="error">{error}</p>
        )}

        {machines !== null && machines.length === 0 && !error && (
          <p className="muted">No machines. One is created the first time an agent needs a computer.</p>
        )}

        {(machines ?? []).map((machine) => {
          const live = machine.status === 'ready';
          const working = busy === machine.id;
          return (
            <div key={machine.id} className={`machine ${live ? 'live' : ''}`}>
              <div className="who">
                <strong>{machine.name || 'unnamed'}</strong>
                <span className={`badge ${live ? 'live' : machine.status === 'stopped' ? 'done' : 'bad'}`}>
                  {machine.status}
                </span>
                <code className="muted small">{machine.id.slice(0, 8)}</code>
              </div>

              <p className="muted small spec">
                {machine.vcpus} vCPU · {gb(machine.memory_mb)} · {machine.disk_gb} GB disk
                {machine.created_at && ` · ${age(machine.created_at)}`}
              </p>

              <p className="small owner">
                {machine.threadId ? (
                  <>
                    from{' '}
                    <button className="link" onClick={() => onOpenThread(machine.threadId!)}>
                      {machine.threadTitle ?? 'a conversation'}
                    </button>
                  </>
                ) : (
                  <span className="muted">
                    Not from this app. Made by hand or through MCP, so nothing here touches it on its own.
                  </span>
                )}
              </p>

              {confirming === machine.id ? (
                <div className="actions">
                  <span className="muted small">Delete it and its disk? This cannot be undone.</span>
                  <button disabled={working} onClick={() => remove(machine.id)}>Delete</button>
                  <button className="ghost" onClick={() => setConfirming(null)}>Cancel</button>
                </div>
              ) : (
                <div className="actions">
                  {live && (
                    <button className="ghost" disabled={working} onClick={() => act(machine.id, 'stop')}>
                      Stop
                    </button>
                  )}
                  {machine.status === 'stopped' && (
                    <button className="ghost" disabled={working} onClick={() => act(machine.id, 'start')}>
                      Start
                    </button>
                  )}
                  <button className="ghost danger" disabled={working} onClick={() => setConfirming(machine.id)}>
                    Delete
                  </button>
                  {working && <span className="spin" aria-label="working" />}
                </div>
              )}
            </div>
          );
        })}

        {orphans.length > 0 && (
          <p className="muted small">
            {orphans.length} of these {orphans.length === 1 ? 'was' : 'were'} not created here. Stopping a
            machine keeps its disk; deleting removes it for good.
          </p>
        )}
      </div>
    </main>
  );
}
