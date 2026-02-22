# Forge

The last MCP app you need. Forge turns any question into an interactive workspace — the AI designs the right tool for your problem on the fly.

No pre-built templates. No rigid forms. You describe what you're thinking through, and Forge generates a custom visual workspace with sliders, comparison tables, scoring cards, pro/con panels, and action buttons — all rendered live inside ChatGPT.

## How it works

1. You ask a question or describe a decision
2. Forge generates an interactive UI spec tailored to your problem
3. You interact — adjust weights, dismiss options, add missing factors
4. Forge synthesizes your inputs into a verdict with next steps

Everything stays in one place. Your inputs persist across the conversation.

## Use cases

- **Decisions** — "Should I stay at my job, join a startup, or go freelance?"
- **Prioritization** — "I have 8 feature requests. Help me rank them by impact and effort."
- **Comparisons** — "Compare three pricing models for my SaaS: per-seat, usage-based, flat-rate."
- **Strategy** — "I'm launching next month. Build me a readiness checklist across marketing, eng, legal, support."
- **Hiring** — "Senior vs junior, full-time vs contractor, local vs remote — help me decide."
- **Investment** — "Compare index funds, rental property, and bootstrapping my startup on risk, return, and effort."

## MCP-to-MCP

Forge can connect to other MCP servers and use their tools. Connect a market sizing MCP, a CRM, or any other deployed MCP server — Forge becomes a single gateway.

## Stack

Built with [mcp-use](https://mcp-use.com). Firebase for persistence. Deployed on Manufact Cloud.

## Run locally

```bash
cd forge
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```
