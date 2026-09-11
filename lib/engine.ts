import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Reaching the Hyperwake engine.
 *
 * This runs only on the server. The engine sends no CORS headers, so a browser
 * could not call it even if we wanted that, and the operator token has no
 * business in a page bundle either.
 */

export function stateDir() {
  return process.env.HYPERWAKE_HOME || join(homedir(), '.hyperwake');
}

/** Read the operator token without creating one; its absence is information. */
export function operatorToken(): string | null {
  const file = join(stateDir(), 'token');
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
}

export function engineBase() {
  return process.env.HYPERWAKE_API
    || `http://127.0.0.1:${process.env.HYPERWAKE_PORT || 4141}`;
}

export type EngineStatus = {
  ok: boolean;
  detail: string;
  host?: { platform: string; arch: string; accelerator: string | null };
};

/**
 * Describe the engine in a sentence a person can act on.
 *
 * The three failures are genuinely different and each needs its own answer, so
 * they are not collapsed into "something went wrong".
 */
export async function engineStatus(): Promise<EngineStatus> {
  const token = operatorToken();
  if (!token) {
    return {
      ok: false,
      detail: `No token at ${join(stateDir(), 'token')}. Start the engine with: npx hyperwake`,
    };
  }

  try {
    const response = await fetch(`${engineBase()}/v1`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });

    if (response.status === 401) {
      return { ok: false, detail: 'The engine rejected this token. Restart it, or check HYPERWAKE_HOME.' };
    }
    if (!response.ok) {
      return { ok: false, detail: `The engine answered ${response.status}.` };
    }

    const info = await response.json();
    const host = info.host ?? {};
    return {
      ok: true,
      detail: `${engineBase()} — ${host.platform}/${host.arch}, accelerator ${host.accelerator ?? 'none'}`,
      host,
    };
  } catch {
    return { ok: false, detail: `Nothing answering at ${engineBase()}. Start it with: npx hyperwake` };
  }
}

// --- the machine API -------------------------------------------------------

class EngineError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call(method: string, path: string, body?: unknown, timeoutMs = 180_000) {
  const token = operatorToken();
  if (!token) throw new EngineError(0, 'The Hyperwake engine is not running. Start it with: npx hyperwake');

  let response: Response;
  try {
    response = await fetch(`${engineBase()}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (error: any) {
    if (error?.name === 'TimeoutError') throw new EngineError(504, `The engine did not answer within ${timeoutMs / 1000}s.`);
    throw new EngineError(0, `No engine at ${engineBase()}. Start it with: npx hyperwake`);
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new EngineError(response.status, payload.message ?? `HTTP ${response.status}`);
  return payload.data ?? payload;
}

export const listMachines = () => call('GET', '/v1/machines');
export const getMachine = (id: string) => call('GET', `/v1/machines/${encodeURIComponent(id)}`);
export const createMachine = (spec: object) => call('POST', '/v1/machines', spec);
export const deleteMachine = (id: string) => call('DELETE', `/v1/machines/${encodeURIComponent(id)}`);
export const desktopUrl = (id: string) => call('POST', `/v1/machines/${encodeURIComponent(id)}/desktop`);
export const act = (id: string, action: object) =>
  call('POST', `/v1/machines/${encodeURIComponent(id)}/actions`, action);

/**
 * Wait until the guest has checked in for this boot.
 *
 * A running QEMU process is not a usable computer, and treating the two as the
 * same produces failures that look random.
 */
export async function waitForReady(id: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let status = 'unknown';
  while (Date.now() < deadline) {
    const machine = await getMachine(id);
    status = machine.status;
    if (status === 'ready') return machine;
    if (status === 'stopped' || status === 'failed') {
      throw new EngineError(409, `The machine reached "${status}" instead of becoming ready.`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new EngineError(504, `The machine was still "${status}" after ${timeoutMs / 1000}s.`);
}
