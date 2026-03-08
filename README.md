# spillover

Pool your team's Claude Code capacity. No tokens left behind.

**Dashboard**: [spillover-app.vercel.app](https://spillover-app.vercel.app)

![Dashboard](assets/dashboard.png)

## What it does

Your team pays for Claude Code subscriptions. Some devs hit their limits while others barely use theirs. Spillover automatically routes tasks to teammates with spare capacity.

## How it works

```
$ spillover status

  🫧 spillover — team hydration check

  @roy      ████████░░  78%  — running warm
  @sarah    ███░░░░░░░  27%  — plenty to give
  @dave     █░░░░░░░░░  12%  — overflowing

  team capacity: 61% available

$ spillover run "add rate limiting to /api/payments" --repo github.com/team/app

  💧 you're at 78% — spilling over to @dave (12%)
  🔄 cloning repo...
  🧠 running prompt on @dave's machine...
  ✅ done — branch: spillover/task-47
  💰 saved you ~$3.20
```

## Quick start

```bash
# Install
npm i -g @spillover/cli

# Create a project
spillover init my-team

# Share with your team
spillover join <project-id>

# Start accepting tasks
spillover agent

# Submit a task
spillover run "fix the auth bug" --repo github.com/team/app
```

## Architecture

```
packages/
├── cli/          # CLI tool (npm: @spillover/cli)
├── web/          # Dashboard (Next.js)
└── shared/       # Shared types
supabase/         # Database migrations
```

## Stack

- **CLI**: Node.js + TypeScript + Commander
- **Database**: Neon (serverless Postgres)
- **Dashboard**: Next.js + Tailwind CSS
- **Auth**: NextAuth.js with GitHub OAuth
- **Task execution**: Claude Code headless (`claude -p`)
