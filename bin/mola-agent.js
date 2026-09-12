#!/usr/bin/env node
/**
 * Start the app and open it.
 *
 * The published package carries a prebuilt standalone server under `server/`.
 * A checkout has no such directory, so this falls back to telling you to build,
 * rather than failing with a missing-file stack trace.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const server = join(root, 'server', 'server.js');

const ESC = '[';
const bold = (s) => `${ESC}1m${s}${ESC}0m`;
const dim = (s) => `${ESC}2m${s}${ESC}0m`;
const green = (s) => `${ESC}32m${s}${ESC}0m`;

if (!existsSync(server)) {
  console.error(`\nNo built server at ${server}.\n`);
  console.error('In a checkout, build it first:\n');
  console.error('  npm install && npm run build && npm run bundle\n');
  process.exit(1);
}

/**
 * Ask the kernel for a free port rather than guessing.
 *
 * Guessing is how two tools end up fighting over 3000, and the engine already
 * learned this lesson the hard way with its runtime port.
 */
function freePort(preferred) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(freePort(0)));
    probe.listen(preferred, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

const requested = Number(
  process.env.PORT
  || process.argv.find((a) => a.startsWith('--port='))?.split('=')[1]
  || 3939,
);
const port = await freePort(requested);
const url = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, [server], {
  cwd: join(root, 'server'),
  stdio: ['ignore', 'inherit', 'inherit'],
  env: {
    ...process.env,
    PORT: String(port),
    // Loopback only. This process can create virtual machines and holds a
    // model provider key; it has no business on a shared interface.
    HOSTNAME: '127.0.0.1',
  },
});

console.log(`
${bold('  Mola Agent')} ${dim('· an agent that uses a real computer')}

  ${bold('Open')}  ${green(url)}
${port !== requested ? dim(`  (${requested} was taken)\n`) : ''}
  ${dim('Ctrl-C to stop.')}
`);

// Open the browser once the server is actually answering, so the first paint is
// the app rather than a connection error the user has to reload past.
const opener = process.platform === 'darwin' ? 'open'
  : process.platform === 'win32' ? 'start' : 'xdg-open';

(async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        if (!process.env.MOLA_AGENT_NO_OPEN) {
          spawn(opener, [url], { stdio: 'ignore', detached: true }).unref();
        }
        return;
      }
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
})();

const stop = () => {
  child.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
