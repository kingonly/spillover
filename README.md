# spillover

Pool your team's Claude Code capacity. No tokens left behind.

**Dashboard**: [spillover-app.vercel.app](https://spillover-app.vercel.app)

![Dashboard](assets/dashboard.png)

## What it does

Your team pays for Claude Code subscriptions. Some devs hit their limits while others barely use theirs. Spillover automatically routes tasks to teammates with spare capacity — using GitHub issues as the task queue.

## How it works

1. Create a project on the dashboard, share the project code with your team
2. Link your GitHub repos, browse issues, click "queue"
3. Agents with spare capacity pick up queued issues, run Claude Code, push a result branch

## Quick start

### Dashboard (setup)

1. Sign in at [spillover-app.vercel.app](https://spillover-app.vercel.app)
2. Create a project (or join one with a project code like `SPILL-A7X3`)
3. Link your GitHub repos
4. Queue issues for your team

### CLI (agents)

```bash
# Install
npm i -g spillover

# Authenticate with GitHub (opens browser)
spillover login

# Start the agent (picks up queued issues)
spillover agent
```

Each teammate runs `spillover login` and `spillover agent` on their machine. When they have spare Claude Code capacity, the agent picks up queued issues automatically.

## Architecture

```
packages/
├── cli/          # CLI tool (npm: spillover)
├── web/          # Dashboard (Next.js 16)
└── shared/       # Shared types
supabase/         # Database migrations
```

## Stack

- **CLI**: Node.js + TypeScript + Commander
- **Database**: Neon (serverless Postgres)
- **Dashboard**: Next.js + Tailwind CSS
- **Auth**: NextAuth.js with GitHub OAuth
- **Task queue**: GitHub issues with `spillover` label
- **Task execution**: Claude Code headless (`claude -p`)
