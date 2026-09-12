'use client';

import { useEffect, useState } from 'react';

export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
  machineId: string | null;
  messageCount: number;
};

function when(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Threads({
  threads,
  current,
  onSelect,
  onNew,
  onDelete,
  machines,
  onShowMachines,
  showingMachines,
}: {
  threads: ThreadSummary[];
  current: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string, alsoMachine: boolean) => void;
  machines: { id: string; status: string; threadId: string | null }[];
  onShowMachines: () => void;
  showingMachines: boolean;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const running = new Map(machines.map((m) => [m.id, m.status]));
  const orphans = machines.filter((m) => !m.threadId);

  useEffect(() => { setConfirming(null); }, [current]);

  return (
    <nav className="threads">
      <header className="brand">
        <a href="https://mola.sh" target="_blank" rel="noreferrer" title="mola.sh">
          mola<span className="dot">.</span>
        </a>
        <span className="kind">agent</span>
      </header>

      <ul>
        <li className="heading">
          <span>Conversations</span>
          <button className="ghost small" onClick={onNew}>New</button>
        </li>

        {threads.length === 0 && <li className="muted pad small">Nothing yet.</li>}

        {threads.map((thread) => {
          const status = thread.machineId ? running.get(thread.machineId) : null;
          return (
            <li key={thread.id} className={thread.id === current ? 'on' : ''}>
              <button className="row" onClick={() => onSelect(thread.id)}>
                <span className="title">{thread.title}</span>
                <span className="meta muted small">
                  {when(thread.updatedAt)}
                  {status && (
                    <em className={status === 'ready' ? 'live' : 'dozing'}>
                      {status === 'ready' ? 'machine up' : status}
                    </em>
                  )}
                </span>
              </button>

              {confirming === thread.id ? (
                <div className="confirm">
                  <p className="small">Delete this conversation?</p>
                  <button className="ghost small" onClick={() => onDelete(thread.id, false)}>
                    Keep machine
                  </button>
                  <button className="small" onClick={() => onDelete(thread.id, true)}>
                    Delete both
                  </button>
                  <button className="ghost small" onClick={() => setConfirming(null)}>Cancel</button>
                </div>
              ) : (
                <button
                  className="x ghost"
                  title="Delete conversation"
                  onClick={() => setConfirming(thread.id)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="machines-link">
        <button className={showingMachines ? 'ghost on' : 'ghost'} onClick={onShowMachines}>
          Machines
          {machines.length > 0 && <em>{machines.filter((m) => m.status === 'ready').length} up</em>}
        </button>
        {orphans.length > 0 && (
          <p className="small muted">
            {orphans.length} not from this app
          </p>
        )}
      </footer>
    </nav>
  );
}
