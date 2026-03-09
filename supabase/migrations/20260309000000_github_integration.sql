-- ============================================================
-- GitHub integration: repos + issue tracking
-- ============================================================

-- Link GitHub repos to projects
create table project_repos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  repo_full_name text not null,  -- "owner/repo"
  added_by text not null,
  added_at timestamptz not null default now(),
  unique(project_id, repo_full_name)
);

create index idx_project_repos_project on project_repos(project_id);

-- Add GitHub issue columns to tasks
alter table tasks add column github_repo_full_name text;
alter table tasks add column github_issue_number int;
alter table tasks alter column prompt drop not null;
alter table tasks alter column prompt set default '';

-- Unique constraint: one task per GitHub issue
create unique index idx_tasks_github_issue
  on tasks(github_repo_full_name, github_issue_number)
  where github_issue_number is not null;

-- RLS
alter table project_repos enable row level security;
create policy "Public access for MVP" on project_repos
  for all using (true) with check (true);
