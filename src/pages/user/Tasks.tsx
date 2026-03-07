import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, ClipboardList, HelpCircle, Loader2, Clock, Coins, X } from "lucide-react";
import { TriviaQuiz } from "@/components/user/TriviaQuiz";

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
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch available tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
  });

  // Fetch today's completions
  const { data: todayCompletions } = useQuery({
    queryKey: ["today-completions", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("task_completions")
        .select("task_id")
        .eq("user_id", profile.user_id)
        .gte("completed_at", today);

      return data?.map((c) => c.task_id) || [];
    },
    enabled: !!profile?.user_id,
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      if (!profile?.user_id) throw new Error("Not authenticated");

      // Check if already completed today
      const completionsToday = todayCompletions?.filter((id) => id === task.id).length || 0;
      if (task.daily_limit && completionsToday >= task.daily_limit) {
        throw new Error("Daily limit reached for this task");
      }

      const newBalance = Number(profile.balance) + task.reward_amount;

      // Create completion record
      await supabase.from("task_completions").insert({
        user_id: profile.user_id,
        task_id: task.id,
        reward_earned: task.reward_amount,
      });

      // Update balance
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", profile.user_id);

      // Create transaction
      await supabase.from("transactions").insert({
        user_id: profile.user_id,
        transaction_type: "earning",
        amount: task.reward_amount,
        balance_after: newBalance,
        description: `Completed task: ${task.title}`,
        reference_id: task.id,
      });

      return task.reward_amount;
    },
    onSuccess: (reward) => {
      toast.success(`Task completed! +UGX ${reward.toLocaleString()}`);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["today-completions"] });
      queryClient.invalidateQueries({ queryKey: ["today-earnings"] });
      setWatchingTask(null);
      setVideoWatched(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "video":
        return Play;
      case "survey":
        return ClipboardList;
      case "trivia":
        return HelpCircle;
      default:
        return Clock;
    }
  };

  const filterTasks = (type: string) => {
    return tasks?.filter((task) => task.task_type === type) || [];
  };

  const isTaskCompletedToday = (taskId: string) => {
    return todayCompletions?.includes(taskId);
  };

  const handleStartTask = (task: Task) => {
    if (task.task_type === "video" && task.video_url) {
      setWatchingTask(task);
      setVideoWatched(false);
    } else if (task.task_type === "trivia" && task.trivia_questions) {
      setTriviaTask(task);
    } else {
      // For non-video/trivia tasks, complete immediately
      completeTaskMutation.mutate(task);
    }
  };

  const handleTriviaComplete = (correctCount: number, totalCount: number, answers: number[]) => {
    if (triviaTask && correctCount === totalCount) {
      completeTaskMutation.mutate(triviaTask);
      setTriviaTask(null);
    }
  };

  const handleVideoEnd = () => {
    setVideoWatched(true);
  };

  const handleClaimReward = () => {
    if (watchingTask) {
      completeTaskMutation.mutate(watchingTask);
    }
  };

  // Check if video URL is YouTube
  const isYouTubeUrl = (url: string) => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  };

  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
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
                    <p className="text-muted-foreground">
                      No {type} tasks available right now
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filterTasks(type).map((task) => {
                  const Icon = getTaskIcon(task.task_type);
                  const isCompleted = isTaskCompletedToday(task.id);

                  return (
                    <Card key={task.id} className={isCompleted ? "opacity-60" : ""}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/20 p-2">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {task.description}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                <Coins className="mr-1 h-3 w-3" />
                                UGX {task.reward_amount.toLocaleString()}
                              </Badge>
                              {task.daily_limit && (
                                <Badge variant="outline" className="text-xs">
                                  {task.daily_limit}x daily
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={isCompleted || completeTaskMutation.isPending}
                          onClick={() => handleStartTask(task)}
                        >
                          {isCompleted ? "Done" : "Start"}
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

      {/* Video Watching Dialog */}
      <Dialog open={!!watchingTask} onOpenChange={(open) => !open && setWatchingTask(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">{watchingTask?.title}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWatchingTask(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{watchingTask?.description}</p>
          </DialogHeader>
          
          <div className="px-4">
            {watchingTask?.video_url && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {isYouTubeUrl(watchingTask.video_url) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(watchingTask.video_url) || ""}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => {
                      // Auto-enable claim after 10 seconds for YouTube videos
                      setTimeout(() => setVideoWatched(true), 10000);
                    }}
                  />
                ) : (
                  <video
                    src={watchingTask.video_url}
                    controls
                    autoPlay
                    className="w-full h-full"
                    onEnded={handleVideoEnd}
                    onTimeUpdate={(e) => {
                      const video = e.target as HTMLVideoElement;
                      // Enable claim when video is 80% watched
                      if (video.currentTime / video.duration >= 0.8) {
                        setVideoWatched(true);
                      }
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {videoWatched 
                    ? "Video watched! Claim your reward below" 
                    : "Watch the video to earn your reward"}
                </p>
                <Badge variant="secondary" className="mt-1">
                  <Coins className="mr-1 h-3 w-3" />
                  UGX {watchingTask?.reward_amount.toLocaleString()}
                </Badge>
              </div>
              <Button
                disabled={!videoWatched || completeTaskMutation.isPending}
                onClick={handleClaimReward}
              >
                {completeTaskMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim Reward"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trivia Quiz Dialog */}
      <Dialog open={!!triviaTask} onOpenChange={(open) => !open && setTriviaTask(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{triviaTask?.title}</DialogTitle>
          </DialogHeader>
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
