# spillover

Pool your team's Claude Code capacity. No tokens left behind.

**Dashboard**: [spillover-app.vercel.app](https://spillover-app.vercel.app)

## What it does

Your team pays for Claude Code subscriptions. Some devs hit their limits while others barely use theirs. Spillover automatically routes tasks to teammates with spare capacity using GitHub issues as the task queue.

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
5. Switch between projects or create/join more from the project dropdown

### CLI (agents)

```bash
# Install
npm i -g spillover

# Authenticate with GitHub (opens browser)
spillover login

# Start the agent (picks up queued issues from all your projects)
spillover agent

# See team capacity across all projects
spillover status

# List your projects
spillover projects

# View task history across all projects
spillover log

# Submit a task (auto-detects project from repo, or specify --project)
spillover run "fix the auth bug" --repo owner/repo
spillover run "add tests" --repo owner/repo --project my-team
```

Each teammate runs `spillover login` and `spillover agent` on their machine. The agent watches all projects you're a member of and picks up queued issues when you have spare capacity.

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
