'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import DesktopPanel from './DesktopPanel';
import ToolCard from './ToolCard';

export default function Chat({ model, provider }: { model: string; provider: string }) {
  const { messages, sendMessage, status, addToolApprovalResponse, stop } = useChat();
  const [input, setInput] = useState('');
  const [showDesktop, setShowDesktop] = useState(false);
  const [machineId, setMachineId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // The machine appears partway through a run, so poll for it rather than
  // waiting for the turn to finish. The panel button should light up the moment
  // there is something to watch.
  useEffect(() => {
    const tick = setInterval(async () => {
      const { machineId: id } = await (await fetch('/api/chat')).json();
      setMachineId(id);
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  const busy = status === 'streaming' || status === 'submitted';

  return (
    <div className={`shell ${showDesktop ? 'split' : ''}`}>
      <main className="conversation">
        <header className="bar">
          <strong>hyperwake<span className="dot">.</span>agent</strong>
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
                <li onClick={() => setInput('Install neovim and show me it running.')}>
                  Install neovim and show me it running.
                </li>
                <li onClick={() => setInput('What OS and kernel is this machine running?')}>
                  What OS and kernel is this machine running?
                </li>
                <li onClick={() => setInput('Open the browser and look up the Hyprland release notes.')}>
                  Open the browser and look up the Hyprland release notes.
                </li>
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

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (!input.trim()) return;
            sendMessage({ text: input });
            setInput('');
          }}
        >
          <textarea
            value={input}
            rows={1}
            placeholder="Ask for something that needs a computer…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) { sendMessage({ text: input }); setInput(''); }
              }
            }}
          />
          {busy
            ? <button type="button" className="stop" onClick={stop}>Stop</button>
            : <button type="submit" disabled={!input.trim()}>Send</button>}
        </form>
      </main>

      {showDesktop && <DesktopPanel onClose={() => setShowDesktop(false)} />}
    </div>
  );
}
