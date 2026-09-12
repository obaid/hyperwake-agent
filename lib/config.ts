import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * What the app remembers between runs.
 *
 * The provider key lives here and never goes to the browser. The file is 0600
 * in a 0700 directory, which is the same posture the engine takes with its
 * token, and for the same reason: this is a credential that can spend money.
 */

export type ProviderId = 'anthropic' | 'openai' | 'openrouter';

export type Config = {
  provider?: ProviderId;
  apiKey?: string;
  model?: string;
  /** Signs tool-approval requests so a tampered browser cannot forge one. */
  approvalSecret: string;
  /** Ask before every shell command. Off by default; the machine is disposable. */
  confirmCommands: boolean;
};

export function configDir() {
  const dir = process.env.MOLA_AGENT_HOME || join(homedir(), '.mola-agent');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

const configFile = () => join(configDir(), 'config.json');

export function readConfig(): Config {
  const file = configFile();
  if (!existsSync(file)) {
    // The approval secret is generated once and kept, so approvals issued
    // before a restart are still valid after one.
    return save({ approvalSecret: randomBytes(32).toString('base64'), confirmCommands: false });
  }
  const stored = JSON.parse(readFileSync(file, 'utf8')) as Partial<Config>;
  return {
    approvalSecret: stored.approvalSecret ?? randomBytes(32).toString('base64'),
    confirmCommands: stored.confirmCommands ?? false,
    ...stored,
  } as Config;
}

export function save(config: Config): Config {
  writeFileSync(configFile(), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return config;
}

export function update(patch: Partial<Config>): Config {
  return save({ ...readConfig(), ...patch });
}

/** Everything the browser is allowed to know. Never the key itself. */
export function publicConfig() {
  const { provider, model, apiKey, confirmCommands } = readConfig();
  return {
    provider,
    model,
    confirmCommands,
    configured: Boolean(provider && apiKey && model),
    keyHint: apiKey ? `…${apiKey.slice(-4)}` : null,
  };
}
