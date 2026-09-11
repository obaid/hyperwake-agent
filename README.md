# hyperwake-agent

**Watch an agent use a real computer.**

A local chat app whose agent drives a throwaway [Omarchy](https://omarchy.org)
machine: it runs commands, reads the screen, clicks and types, and you can take
the mouse whenever you want.

```sh
npx hyperwake          # the engine
npx hyperwake-agent    # this
```

It opens a browser. Pick a model provider, then talk to it.

> **Status: M1.** Setup, the agent, the tools and the desktop panel are built.
> Threads and persistence are next. See
> [ADR-AGENT-001](https://github.com/obaid/hyperwake-core/blob/main/docs/decisions/ADR-AGENT-001-hyperwake-agent.md)
> for the design.

## Already using an agent?

If you have Claude Code, Claude Desktop or Cursor, you do not need this app.
The engine ships an MCP server:

```sh
claude mcp add hyperwake -- npx -y hyperwake mcp
```

This app exists for the case MCP cannot cover: seeing the desktop beside the
conversation while the agent works.

## Working on it

```sh
npm install
npm run dev             # http://localhost:3000, live reload
npm run build && npm run bundle && npm test
```

`npm test` packs the tarball, installs it, boots it and checks that every asset
the page references resolves. It takes about forty seconds and it is the most
important test here: Next's standalone output fails quietly, serving HTML with
404ing assets rather than an error.

## Licence

[FSL-1.1-ALv2](LICENSE.md). Use it for anything except building something that
competes with Hyperwake. Each release becomes Apache 2.0 two years after it
ships.
