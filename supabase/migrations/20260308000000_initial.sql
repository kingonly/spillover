-- ============================================================
-- Spillover — initial schema
-- ============================================================

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- Project members
create table members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null,
  email text not null default '',
  github_handle text not null default '',
  joined_at timestamptz not null default now(),
  unique(project_id, user_id)
);

-- Daily usage logs per user
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null default current_date,
  tokens_used bigint not null default 0,
  tokens_limit bigint not null default 0,
  usage_percent int not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Task queue
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  repo_url text not null default '',
  branch text not null default 'main',
  prompt text not null,
  submitted_by text not null,
  assigned_to text,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  result_branch text,
  tokens_used bigint,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Indexes
create index idx_members_project on members(project_id);
create index idx_members_user on members(user_id);
create index idx_usage_user_date on usage_logs(user_id, date);
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_assigned on tasks(assigned_to, status);
create index idx_tasks_status on tasks(status);

-- Enable realtime for tasks (agents listen for new assignments)
alter publication supabase_realtime add table tasks;

-- RLS policies (permissive for MVP — tighten later)
alter table projects enable row level security;
alter table members enable row level security;
alter table usage_logs enable row level security;
alter table tasks enable row level security;

create policy "Public access for MVP" on projects for all using (true) with check (true);
create policy "Public access for MVP" on members for all using (true) with check (true);
create policy "Public access for MVP" on usage_logs for all using (true) with check (true);
create policy "Public access for MVP" on tasks for all using (true) with check (true);
