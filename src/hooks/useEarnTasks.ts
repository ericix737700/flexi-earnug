import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EarnTask {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  reward_amount: number;
  video_url: string | null;
  survey_questions: unknown;
  min_watch_seconds: number;
}

export interface SurveyQuestion {
  question: string;
  type: "single" | "multi" | "text";
  options?: string[];
}

export const DEFAULT_SURVEY: SurveyQuestion[] = [
  { question: "How did you hear about FlexiEarn?", type: "single", options: ["Friend / referral", "WhatsApp", "Facebook / TikTok", "Other"] },
];

export function getSurveyQuestions(task: EarnTask): SurveyQuestion[] {
  const q = task.survey_questions;
  if (Array.isArray(q) && q.length > 0) {
    return q.filter((x: any) => x && typeof x.question === "string").map((x: any) => ({
      question: x.question,
      type: ["single", "multi", "text"].includes(x.type) ? x.type : "text",
      options: Array.isArray(x.options) ? x.options.filter((o: any) => typeof o === "string" && o.trim()) : [],
    }));
  }
  return DEFAULT_SURVEY;
}

export function useEarnTasks(type: "video" | "survey") {
  const { user } = useAuth();
  const tasks = useQuery({
    queryKey: ["earn-tasks", type],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("is_active", true).eq("task_type", type).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EarnTask[];
    },
  });
  const done = useQuery({
    queryKey: ["earn-done-today", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const { data } = await supabase.from("task_completions").select("task_id").eq("user_id", user!.id).gte("completed_at", today.toISOString());
      return new Set((data || []).map((d) => d.task_id));
    },
  });
  return { tasks, done };
}

export function useCompleteTask(onDone?: (reward: number) => void) {
  const qc = useQueryClient();
  const { refreshProfile } = useAuth() as any;
  return useMutation({
    mutationFn: async ({ taskId, answers }: { taskId: string; answers?: unknown[] }) => {
      const { data, error } = await (supabase.rpc as any)("complete_task", { _task_id: taskId, _answers: answers ?? null });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Could not complete task");
      return Number(data.reward);
    },
    onSuccess: (reward) => {
      toast.success(`+UGX ${reward.toLocaleString()} added to your balance`);
      qc.invalidateQueries({ queryKey: ["earn-done-today"] });
      qc.invalidateQueries({ queryKey: ["today-earnings"] });
      refreshProfile?.();
      onDone?.(reward);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
