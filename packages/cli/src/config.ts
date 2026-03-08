import Conf from "conf";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Local config stored in ~/.config/spillover/config.json
export const config = new Conf({
  projectName: "spillover",
  schema: {
    user_id: { type: "string" },
    email: { type: "string" },
    github_handle: { type: "string" },
    project_id: { type: "string" },
    project_name: { type: "string" },
  },
});

// TODO: Replace with actual Supabase project credentials
const SUPABASE_URL = process.env.SPILLOVER_SUPABASE_URL || "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = process.env.SPILLOVER_SUPABASE_ANON_KEY || "YOUR_ANON_KEY";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

export function requireProject(): { projectId: string; userId: string } {
  const projectId = config.get("project_id") as string;
  const userId = config.get("user_id") as string;
  if (!projectId || !userId) {
    console.error("Not connected to a project. Run: spillover init");
    process.exit(1);
  }
  return { projectId, userId };
}
