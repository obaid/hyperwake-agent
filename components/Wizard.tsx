'use client';

import { useState } from 'react';

const PROVIDERS = [
  { id: 'anthropic', label: 'Claude (Anthropic)', hint: 'sk-ant-…', url: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', label: 'OpenAI', hint: 'sk-…', url: 'https://platform.openai.com/api-keys' },
  { id: 'openrouter', label: 'OpenRouter', hint: 'sk-or-…', url: 'https://openrouter.ai/keys' },
];

type Model = { id: string; label: string; note?: string };

export default function Wizard({
  engine,
  onDone,
}: {
  engine: { ok: boolean; detail: string };
  onDone: () => void;
}) {
  const [provider, setProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Model[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadModels() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setModels(body.models);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function choose(model: string) {
    setBusy(true);
    await fetch('/api/setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model }),
    });
    onDone();
  }

  return (
    <main className="wizard">
      <h1>mola<span className="dot">.</span>agent</h1>
      <p className="muted">An agent with a real computer. Two things to set up.</p>

      <section className={`step ${engine.ok ? 'ok' : 'bad'}`}>
        <header>
          <span className="num">1</span>
          <strong>The engine</strong>
          <span className={engine.ok ? 'tick' : 'cross'}>{engine.ok ? 'running' : 'not running'}</span>
        </header>
        <p className="muted">{engine.detail}</p>
        {!engine.ok && (
          <p className="muted">
            Start it in a terminal and leave it there, then reload this page.
          </p>
        )}
      </section>

      <section className="step">
        <header><span className="num">2</span><strong>Your model</strong></header>

        <div className="providers">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={provider === p.id ? 'pick chosen' : 'pick'}
              onClick={() => { setProvider(p.id); setModels(null); setError(null); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {provider && !models && (
          <div className="key">
            <input
              type="password"
              value={apiKey}
              placeholder={PROVIDERS.find((p) => p.id === provider)!.hint}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && apiKey) loadModels(); }}
              autoFocus
            />
            <button className="go" disabled={!apiKey || busy} onClick={loadModels}>
              {busy ? 'checking…' : 'Continue'}
            </button>
            <p className="muted small">
              Stored at <code>~/.mola-agent/config.json</code>, mode 0600. It stays on this
              machine and never reaches the browser again.{' '}
              <a href={PROVIDERS.find((p) => p.id === provider)!.url} target="_blank" rel="noreferrer">
                Get a key
              </a>
            </p>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {models && (
          <div className="models">
            <p className="muted small">
              {models.length} model{models.length === 1 ? '' : 's'} that can both call tools and
              see the screen. Others are hidden because they cannot do this job.
            </p>
            <ul>
              {models.map((m) => (
                <li key={m.id}>
                  <button disabled={busy} onClick={() => choose(m.id)}>
                    <span>{m.label}</span>
                    {m.note && <em>{m.note}</em>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
