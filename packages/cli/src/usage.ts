import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

// Claude Code stores session data in ~/.claude/projects/*/*.jsonl
// Each line is a JSON object with conversation turns and token usage

interface SessionMessage {
  type: string;
  timestamp?: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

interface UsageSummary {
  date: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  total_tokens: number;
  session_count: number;
}

function getClaudeDir(): string {
  return join(homedir(), ".claude");
}

async function findSessionFiles(): Promise<string[]> {
  const claudeDir = getClaudeDir();
  const files: string[] = [];

  try {
    const projectsDir = join(claudeDir, "projects");
    const projects = await readdir(projectsDir, { withFileTypes: true });

    for (const project of projects) {
      if (!project.isDirectory()) continue;
      const projectDir = join(projectsDir, project.name);
      try {
        const entries = await readdir(projectDir);
        for (const entry of entries) {
          if (entry.endsWith(".jsonl")) {
            files.push(join(projectDir, entry));
          }
        }
      } catch {
        // skip unreadable project dirs
      }
    }
  } catch {
    // no projects dir
  }

  return files;
}

function parseSessionLine(line: string): SessionMessage | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export async function getTodayUsage(): Promise<UsageSummary> {
  const today = new Date().toISOString().split("T")[0];
  const files = await findSessionFiles();

  const summary: UsageSummary = {
    date: today,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cache_creation_tokens: 0,
    total_cache_read_tokens: 0,
    total_tokens: 0,
    session_count: 0,
  };

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n").filter(Boolean);

      let sessionHasToday = false;

      for (const line of lines) {
        const msg = parseSessionLine(line);
        const usage = msg?.message?.usage;
        if (!usage || !msg?.timestamp) continue;

        const msgDate = msg.timestamp.split("T")[0];
        if (msgDate !== today) continue;

        sessionHasToday = true;
        summary.total_input_tokens += usage.input_tokens || 0;
        summary.total_output_tokens += usage.output_tokens || 0;
        summary.total_cache_creation_tokens += usage.cache_creation_input_tokens || 0;
        summary.total_cache_read_tokens += usage.cache_read_input_tokens || 0;
      }

      if (sessionHasToday) summary.session_count++;
    } catch {
      // skip unreadable files
    }
  }

  summary.total_tokens =
    summary.total_input_tokens +
    summary.total_output_tokens +
    summary.total_cache_creation_tokens +
    summary.total_cache_read_tokens;

  return summary;
}

// Estimate usage percentage based on known plan limits
// These are rough estimates — actual limits vary
const PLAN_LIMITS: Record<string, number> = {
  pro: 30_000_000,    // ~30M tokens/day estimate
  max_5x: 150_000_000, // ~150M tokens/day estimate
  max_20x: 600_000_000, // ~600M tokens/day estimate
};

export async function getUsagePercent(plan: string = "max_5x"): Promise<number> {
  const usage = await getTodayUsage();
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.max_5x;
  return Math.min(100, (usage.total_tokens / limit) * 100);
}
