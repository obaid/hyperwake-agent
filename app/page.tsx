'use client';

import { useEffect, useState } from 'react';
import Wizard from '@/components/Wizard';
import Chat from '@/components/Chat';

type Setup = {
  config: { configured: boolean; provider?: string; model?: string; keyHint: string | null };
  engine: { ok: boolean; detail: string };
};

export default function Page() {
  const [setup, setSetup] = useState<Setup | null>(null);

  const refresh = () => fetch('/api/setup').then((r) => r.json()).then(setSetup);
  useEffect(() => { refresh(); }, []);

  if (!setup) {
    return <main className="centre"><p className="muted">Starting…</p></main>;
  }

  if (!setup.config.configured) {
    return <Wizard engine={setup.engine} onDone={refresh} />;
  }

  return <Chat model={setup.config.model!} provider={setup.config.provider!} />;
}
