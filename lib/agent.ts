import { ToolLoopAgent, stepCountIs } from 'ai';
import { readConfig } from './config';
import { modelFor } from './providers';
import { buildTools, type Session, SENT } from './tools';

/**
 * The agent.
 *
 * One conversation, one machine, in memory. M1 has no persistence on purpose:
 * threads and resumable runs are M2, and building them before the agent works
 * would be designing storage for messages nobody has produced yet.
 */
export const session: Session = { machineId: null };

const INSTRUCTIONS = `You control a real Linux computer: Arch Linux running the Hyprland desktop, in a virtual machine on the user's own hardware. It is disposable. Nothing on it matters except what you put there, and the user can throw it away and make another in about a second.

How to work on it:

- Prefer run_command. Almost everything is faster, cheaper and more reliable through a shell than by clicking. Only drive the desktop when the task is genuinely graphical: a browser, a GUI editor, something you must see.
- Use start_task for anything that takes more than two minutes, which includes every package install. Then poll check_task and tell the user what is happening rather than going quiet.
- The screen you see is ${SENT.width}x${SENT.height}. Give click coordinates in that space.
- The machine is created for you the first time you use a tool. You do not need to ask permission to make one.
- Say what you are about to do before a long step, and report what actually happened rather than what you expected.

If something fails, read the actual error and say what it was. A wrong answer delivered confidently is worse than "this failed, here is the output".`;

export function buildAgent() {
  const config = readConfig();
  if (!config.provider || !config.apiKey || !config.model) {
    throw new Error('Not configured yet.');
  }

  return new ToolLoopAgent({
    model: modelFor(config.provider, config.apiKey, config.model),
    instructions: INSTRUCTIONS,
    tools: buildTools(session),

    // The default is 20 steps. Driving a desktop spends one per screenshot and
    // one per click, so 20 is about four useful actions and the agent stops
    // mid-task looking broken. This is a safety rail, not a work limit.
    stopWhen: stepCountIs(120),

    toolApproval: {
      // Destroying a machine is the one irreversible thing here.
      delete_machine: 'user-approval',
      ...(config.confirmCommands ? { run_command: 'user-approval' as const } : {}),
    },

    // Binds each approval to the exact tool, call id and arguments the server
    // offered, so a tampered browser cannot approve something else.
    experimental_toolApprovalSecret: config.approvalSecret,
  });
}
