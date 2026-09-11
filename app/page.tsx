import { engineStatus } from '@/lib/engine';

/**
 * M0 is a packaging spike, so this page exists to prove one thing: a server
 * component ran inside the packaged standalone server and reached the engine.
 * Everything visible here is measured rather than assumed.
 */
export const dynamic = 'force-dynamic';

export default async function Page() {
  const status = await engineStatus();

  return (
    <main style={{ maxWidth: '46rem', margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>hyperwake-agent</h1>
      <p style={{ color: 'var(--muted)' }}>
        Packaging spike. If you are reading this from <code>npx</code>, the standalone
        server runs.
      </p>

      <div
        style={{
          border: '1px solid var(--line)',
          background: 'var(--raised)',
          borderRadius: 6,
          padding: '1rem 1.25rem',
          marginTop: '2rem',
        }}
      >
        <strong style={{ color: status.ok ? 'var(--green)' : 'var(--red)' }}>
          {status.ok ? 'Engine reachable' : 'Engine not reachable'}
        </strong>
        <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0' }}>{status.detail}</p>
      </div>
    </main>
  );
}
