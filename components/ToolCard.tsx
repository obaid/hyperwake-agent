'use client';

/** One tool call, and its approval prompt when the agent needs a person. */
export default function ToolCard({
  part,
  onApprove,
}: {
  part: any;
  onApprove: (id: string, approved: boolean) => void;
}) {
  const name = part.type.replace(/^tool-/, '');
  const approval = part.approval;
  const needsApproval = part.state === 'approval-requested';

  const summary = (() => {
    const input = part.input ?? {};
    if (input.command) return input.command;
    if (input.text) return `"${input.text}"`;
    if (input.key) return input.key;
    if (input.path) return input.path;
    if (typeof input.x === 'number') return `${input.x}, ${input.y}`;
    return '';
  })();

  return (
    <div className={`tool ${part.state === 'output-error' ? 'failed' : ''}`}>
      <div className="tool-head">
        <code>{name}</code>
        {summary && <span className="muted small">{summary}</span>}
        {part.state === 'input-streaming' || part.state === 'input-available'
          ? <span className="spin" aria-label="running" />
          : null}
      </div>

      {needsApproval && (
        <div className="approve">
          <p>This needs your go-ahead.</p>
          <button onClick={() => onApprove(approval.id, true)}>Allow</button>
          <button className="ghost" onClick={() => onApprove(approval.id, false)}>Deny</button>
        </div>
      )}

      {part.state === 'output-available' && part.output?.stdout && (
        <pre>{String(part.output.stdout).slice(0, 2000)}</pre>
      )}
      {part.state === 'output-error' && <pre className="error">{part.errorText}</pre>}
    </div>
  );
}
