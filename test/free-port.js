import { createServer } from 'node:net';

/**
 * Ask the kernel for a port nothing is using.
 *
 * Picking a random number in a fixed range looks fine until a test run
 * collides with whatever else is listening, and then a green suite fails once
 * for reasons that have nothing to do with the code. The engine learned this
 * with its runtime port; the tests may as well learn it too.
 */
export function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}
