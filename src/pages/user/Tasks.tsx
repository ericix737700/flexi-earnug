import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, ClipboardList, HelpCircle, Loader2, Clock, Coins, CheckCircle } from "lucide-react";
import { TriviaQuiz } from "@/components/user/TriviaQuiz";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: "video" | "survey" | "trivia" | "daily_checkin";
  reward_amount: number;
  is_active: boolean;
  video_url: string | null;
  survey_questions: any;
  trivia_questions: any;
  daily_limit: number | null;
}

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "video";
  const [activeTab, setActiveTab] = useState(initialType);
  const [watchingTask, setWatchingTask] = useState<Task | null>(null);
  const [triviaTask, setTriviaTask] = useState<Task | null>(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*").eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: todayCompletions } = useQuery({
    queryKey: ["today-completions", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("task_completions").select("task_id")
        .eq("user_id", profile.user_id).gte("completed_at", today);
      return data?.map((c) => c.task_id) || [];
    },
    enabled: !!profile?.user_id,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      if (!profile?.user_id) throw new Error("Not authenticated");
      if ((profile as any)?.restrictions?.no_tasks) throw new Error("Your account is restricted from completing tasks");
      const completionsToday = todayCompletions?.filter((id) => id === task.id).length || 0;
      if (task.daily_limit && completionsToday >= task.daily_limit) throw new Error("Daily limit reached for this task");
      const newBalance = Number(profile.balance) + task.reward_amount;
      await supabase.from("task_completions").insert({ user_id: profile.user_id, task_id: task.id, reward_earned: task.reward_amount });
      await supabase.from("profiles").update({ balance: newBalance }).eq("user_id", profile.user_id);
      await supabase.from("transactions").insert({ user_id: profile.user_id, transaction_type: "earning", amount: task.reward_amount, balance_after: newBalance, description: `Completed task: ${task.title}`, reference_id: task.id });
      return task.reward_amount;
    },
    onSuccess: (reward) => {
      toast.success(`Task completed! +UGX ${reward.toLocaleString()}`);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["today-completions"] });
      queryClient.invalidateQueries({ queryKey: ["today-earnings"] });
      setWatchingTask(null);
      setVideoWatched(false);
      setVideoProgress(0);
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "video": return Play;
      case "survey": return ClipboardList;
      case "trivia": return HelpCircle;
      default: return Clock;
    }
  };

  const filterTasks = (type: string) => tasks?.filter((t) => t.task_type === type) || [];
  const isTaskCompletedToday = (taskId: string) => todayCompletions?.includes(taskId);

  const handleStartTask = (task: Task) => {
    if (task.task_type === "video" && task.video_url) {
      setWatchingTask(task);
      setVideoWatched(false);
      setVideoProgress(0);
    } else if (task.task_type === "trivia" && task.trivia_questions) {
      setTriviaTask(task);
    } else {
      completeTaskMutation.mutate(task);
    }
  };

  const handleTriviaComplete = (correctCount: number, totalCount: number) => {
    if (triviaTask && correctCount === totalCount) {
      completeTaskMutation.mutate(triviaTask);
      setTriviaTask(null);
    }
  };

  const isYouTubeUrl = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&controls=0&modestbranding=1&rel=0` : null;
  };

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Available Tasks</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="survey">Surveys</TabsTrigger>
            <TabsTrigger value="trivia">Trivia</TabsTrigger>
          </TabsList>

          {["video", "survey", "trivia"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-3">
              {filterTasks(type).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No {type} tasks available right now</p>
                  </CardContent>
                </Card>
              ) : (
                filterTasks(type).map((task) => {
                  const Icon = getTaskIcon(task.task_type);
                  const isCompleted = isTaskCompletedToday(task.id);

                  return (
                    <Card key={task.id} className={`overflow-hidden transition-all ${isCompleted ? "opacity-60" : "hover:shadow-md"}`}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-primary/10 p-2.5">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                            )}
                            <div className="mt-1.5 flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Coins className="h-3 w-3" />
                                UGX {task.reward_amount.toLocaleString()}
                              </Badge>
                              {task.daily_limit && (
                                <Badge variant="outline" className="text-xs">{task.daily_limit}x daily</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={isCompleted || completeTaskMutation.isPending}
                          onClick={() => handleStartTask(task)}
                          className={isCompleted ? "" : "gradient-primary border-0 text-primary-foreground"}
                        >
                          {isCompleted ? (
                            <><CheckCircle className="mr-1 h-3.5 w-3.5" />Done</>
                          ) : "Start"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Video Player Dialog - No seek bar */}
      <Dialog open={!!watchingTask} onOpenChange={(open) => { if (!open) { setWatchingTask(null); setVideoProgress(0); } }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
          <div className="gradient-primary p-4">
            <DialogHeader>
              <DialogTitle className="text-primary-foreground">{watchingTask?.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-primary-foreground/70 mt-1">{watchingTask?.description}</p>
          </div>

          <div className="px-4 pt-2">
            {watchingTask?.video_url && (
              <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                {isYouTubeUrl(watchingTask.video_url) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(watchingTask.video_url) || ""}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => { setTimeout(() => setVideoWatched(true), 10000); }}
                  />
                ) : (
                  <video
                    src={watchingTask.video_url}
                    autoPlay
                    className="w-full h-full"
                    controlsList="nodownload nofullscreen noremoteplayback"
                    disablePictureInPicture
                    playsInline
                    style={{ pointerEvents: "none" }}
                    onEnded={() => setVideoWatched(true)}
                    onTimeUpdate={(e) => {
                      const v = e.target as HTMLVideoElement;
                      const pct = Math.floor((v.currentTime / v.duration) * 100);
                      setVideoProgress(pct);
                      if (pct >= 80) setVideoWatched(true);
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Progress & Claim */}
          <div className="p-4 space-y-3">
            {/* Progress bar (replaces seek bar) */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {videoWatched ? "✅ Video complete!" : `Watching... ${videoProgress}%`}
                </p>
                <Badge variant="secondary" className="mt-1 gap-1">
                  <Coins className="h-3 w-3" />
                  UGX {watchingTask?.reward_amount.toLocaleString()}
                </Badge>
              </div>
              <Button
                disabled={!videoWatched || completeTaskMutation.isPending}
                onClick={() => watchingTask && completeTaskMutation.mutate(watchingTask)}
                className="gradient-primary border-0 text-primary-foreground"
              >
                {completeTaskMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Claiming...</>
                ) : "Claim Reward"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trivia */}
      <Dialog open={!!triviaTask} onOpenChange={(open) => !open && setTriviaTask(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{triviaTask?.title}</DialogTitle></DialogHeader>
          {triviaTask?.trivia_questions && (
            <TriviaQuiz
              questions={triviaTask.trivia_questions as any}
              rewardAmount={triviaTask.reward_amount}
              isPending={completeTaskMutation.isPending}
              onComplete={handleTriviaComplete}
              onClose={() => setTriviaTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
