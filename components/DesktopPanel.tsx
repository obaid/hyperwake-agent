'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The live desktop, beside the conversation.
 *
 * The engine's viewer is a separate origin, which is fine because it loads as a
 * document rather than a fetch, so CORS does not apply. The ticket in its URL
 * is single use and lives sixty seconds, so it is minted when this panel opens
 * and again whenever the viewer needs to reconnect.
 */
export default function DesktopPanel({ threadId, onClose }: { threadId: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(async () => {
    setError(null);
    const response = await fetch('/api/desktop', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId }),
    });
    const body = await response.json();
    if (!response.ok) { setError(body.error); return; }
    setUrl(body.url);
  }, [threadId]);

  useEffect(() => { mint(); }, [mint]);

  return (
    <aside className="desktop">
      <header className="bar">
        <strong>Desktop</strong>
        <span className="muted small">live · your mouse and keyboard work here</span>
        <button className="ghost" onClick={mint}>Reconnect</button>
        <button className="ghost" onClick={onClose}>Close</button>
      </header>
      {error && <p className="error pad">{error}</p>}
      {url && <iframe src={url} title="The machine's desktop" allow="clipboard-read; clipboard-write" />}
      {!url && !error && <p className="muted pad">Connecting…</p>}
    </aside>
  );
}
