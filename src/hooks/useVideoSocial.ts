import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface VideoStats { task_id: string; views: number; likes: number; comments: number; completions: number; rewards_paid: number }

export function useVideoStats() {
  return useQuery({
    queryKey: ["video-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_video_stats");
      if (error) throw error;
      const map = new Map<string, VideoStats>();
      for (const row of (data || []) as VideoStats[]) map.set(row.task_id, { ...row, views: Number(row.views), likes: Number(row.likes), comments: Number(row.comments), completions: Number(row.completions), rewards_paid: Number(row.rewards_paid) });
      return map;
    },
    staleTime: 30_000,
  });
}

export function useMyLikes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-video-likes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("video_likes").select("task_id").eq("user_id", user!.id);
      if (error) throw error;
      return new Set<string>((data || []).map((r: any) => r.task_id));
    },
  });
}

export function useFollows() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["creator-follows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("creator_follows").select("creator_name").eq("user_id", user!.id);
      if (error) throw error;
      return new Set<string>((data || []).map((r: any) => r.creator_name));
    },
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, liked }: { taskId: string; liked: boolean }) => {
      const table = (supabase.from as any)("video_likes");
      const { error } = liked ? await table.delete().eq("user_id", user!.id).eq("task_id", taskId) : await table.insert({ user_id: user!.id, task_id: taskId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-video-likes"] }); qc.invalidateQueries({ queryKey: ["video-stats"] }); },
    onError: () => toast.error("Couldn't update like"),
  });
}

export function useToggleFollow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ creator, following }: { creator: string; following: boolean }) => {
      const table = (supabase.from as any)("creator_follows");
      const { error } = following ? await table.delete().eq("user_id", user!.id).eq("creator_name", creator) : await table.insert({ user_id: user!.id, creator_name: creator });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creator-follows"] }),
    onError: () => toast.error("Couldn't update follow"),
  });
}

export function useComments(taskId: string, open: boolean) {
  return useQuery({
    queryKey: ["video-comments", taskId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("video_comments").select("*").eq("task_id", taskId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []) as { id: string; user_id: string; author_name: string | null; body: string; created_at: string }[];
    },
  });
}

export function useAddComment(taskId: string, authorName: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await (supabase.from as any)("video_comments").insert({ user_id: user!.id, task_id: taskId, body: body.trim().slice(0, 500), author_name: authorName });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["video-comments", taskId] }); qc.invalidateQueries({ queryKey: ["video-stats"] }); },
    onError: () => toast.error("Couldn't post comment"),
  });
}

export function compactCount(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}
