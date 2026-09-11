'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DesktopPanel from './DesktopPanel';
import ToolCard from './ToolCard';
import Threads, { type ThreadSummary } from './Threads';
import Machines from './Machines';

type Machine = { id: string; name: string; status: string; threadId: string | null };

export default function Chat({ model, provider }: { model: string; provider: string }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initial, setInitial] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showDesktop, setShowDesktop] = useState(false);
  const [showMachines, setShowMachines] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  // The thread id has to reach the server with every message, and changing
  // threads has to reset the conversation, which is what the key on useChat does.
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ threadId }),
    }),
    [threadId],
  );

  const { messages, sendMessage, status, addToolApprovalResponse, stop, setMessages } = useChat({
    transport,
    messages: initial as any,
  });

  const refreshThreads = useCallback(async () => {
    const [t, m] = await Promise.all([
      fetch('/api/threads').then((r) => r.json()),
      fetch('/api/machines').then((r) => r.json()).catch(() => ({ machines: [] })),
    ]);
    setThreads(t.threads);
    setMachines(m.machines ?? []);
    return t.threads as ThreadSummary[];
  }, []);

  // Open the most recent conversation, or start one.
  useEffect(() => {
    (async () => {
      const existing = await refreshThreads();
      if (existing.length > 0) select(existing[0].id);
      else newThread();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Machine status drives the desktop button, and it appears mid-run, so poll.
  useEffect(() => {
    const tick = setInterval(() => { void refreshThreads(); }, 4000);
    return () => clearInterval(tick);
  }, [refreshThreads]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function select(id: string) {
    const { thread } = await fetch(`/api/threads/${id}`).then((r) => r.json());
    setThreadId(id);
    setInitial(thread.messages ?? []);
    setMessages((thread.messages ?? []) as any);
    setShowDesktop(false);
  }

  async function newThread() {
    const { thread } = await fetch('/api/threads', { method: 'POST' }).then((r) => r.json());
    setThreadId(thread.id);
    setInitial([]);
    setMessages([]);
    setShowDesktop(false);
    await refreshThreads();
  }

  async function removeThread(id: string, alsoMachine: boolean) {
    await fetch(`/api/threads/${id}?machine=${alsoMachine ? 'delete' : 'keep'}`, { method: 'DELETE' });
    const left = await refreshThreads();
    if (id === threadId) {
      if (left.length > 0) select(left[0].id);
      else newThread();
    }
  }

  const thread = threads.find((t) => t.id === threadId);
  const machineId = thread?.machineId ?? null;
  const busy = status === 'streaming' || status === 'submitted';

  function send() {
    if (!input.trim() || !threadId) return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div className={`shell ${showDesktop ? 'split' : ''}`}>
      <Threads
        threads={threads}
        current={threadId}
        machines={machines}
        onSelect={(id) => { setShowMachines(false); select(id); }}
        onNew={() => { setShowMachines(false); newThread(); }}
        onDelete={removeThread}
        onShowMachines={() => setShowMachines((s) => !s)}
        showingMachines={showMachines}
      />

      {showMachines && (
        <Machines
          onClose={() => setShowMachines(false)}
          onOpenThread={(id) => { setShowMachines(false); select(id); }}
        />
      )}

      {!showMachines && <main className="conversation">
        <header className="bar">
          <strong>{thread?.title ?? 'New conversation'}</strong>
          <span className="muted small">{provider} · {model}</span>
          <button
            className="ghost"
            disabled={!machineId}
            title={machineId ? 'Watch the desktop' : 'No machine yet'}
            onClick={() => setShowDesktop((s) => !s)}
          >
            {showDesktop ? 'Hide desktop' : 'Show desktop'}
          </button>
        </header>

        <div className="messages">
          {messages.length === 0 && (
            <div className="empty">
              <p>Ask for something that needs a computer.</p>
              <ul>
                {[
                  'Install neovim and show me it running.',
                  'What OS and kernel is this machine running?',
                  'Open the browser and look up the Hyprland release notes.',
                ].map((suggestion) => (
                  <li key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {messages.map((message) => (
            <article key={message.id} className={`msg ${message.role}`}>
              {message.parts.map((part: any, index: number) => {
                if (part.type === 'text') return <p key={index}>{part.text}</p>;
                if (part.type?.startsWith('tool-')) {
                  return (
                    <ToolCard
                      key={index}
                      part={part}
                      onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
                    />
                  );
                }
                return null;
              })}
            </article>
          ))}
          <div ref={bottom} />
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea
            value={input}
            rows={1}
            placeholder="Ask for something that needs a computer…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          {busy
            ? <button type="button" className="stop" onClick={stop}>Stop</button>
            : <button type="submit" disabled={!input.trim()}>Send</button>}
        </form>
      </main>}

      {showDesktop && threadId && !showMachines && (
        <DesktopPanel threadId={threadId} onClose={() => setShowDesktop(false)} />
      )}
    </div>
  );
}
