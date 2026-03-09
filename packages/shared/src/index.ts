// ============================================================
// Spillover — shared types
// ============================================================

export interface Project {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface Member {
  id: string;
  project_id: string;
  user_id: string;
  email: string;
  github_handle: string;
  joined_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  date: string;
  tokens_used: number;
  tokens_limit: number;
  usage_percent: number;
}

export interface ProjectRepo {
  id: string;
  project_id: string;
  repo_full_name: string; // "owner/repo"
  added_by: string;
  added_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  repo_url: string;
  branch: string;
  prompt: string;
  submitted_by: string;
  assigned_to: string | null;
  status: TaskStatus;
  result_branch: string | null;
  tokens_used: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  github_repo_full_name: string | null;
  github_issue_number: number | null;
}

export type TaskStatus = "queued" | "running" | "done" | "failed";

export const SPILLOVER_THRESHOLD = 0.7; // 70% — above this, tasks spill over
export const SPILLOVER_LABEL = "spillover";
export const SPILLOVER_DIR = ".spillover";
