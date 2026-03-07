import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { TriviaQuestionEditor, type TriviaQuestion } from "@/components/admin/TriviaQuestionEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Play,
  ClipboardList,
  HelpCircle,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  reward_amount: number;
  is_active: boolean;
  daily_limit: number | null;
  video_url: string | null;
  created_at: string;
}

type TaskType = "video" | "survey" | "trivia" | "daily_checkin";

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "video" as TaskType,
    reward_amount: "",
    daily_limit: "",
    is_active: true,
    video_url: "",
  });
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
  });

  // Upload video to storage
  const uploadVideo = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("task-videos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("task-videos")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Create/Update task
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      
      let videoUrl = formData.video_url;
      
      // Upload video if a file is selected
      if (videoFile && formData.task_type === "video") {
        videoUrl = await uploadVideo(videoFile);
      }

      const taskData = {
        title: formData.title,
        description: formData.description || null,
        task_type: formData.task_type,
        reward_amount: Number(formData.reward_amount),
        daily_limit: formData.daily_limit ? Number(formData.daily_limit) : null,
        is_active: formData.is_active,
        video_url: formData.task_type === "video" ? videoUrl : null,
        trivia_questions: formData.task_type === "trivia" ? JSON.parse(JSON.stringify(triviaQuestions)) : null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert(taskData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingTask ? "Task updated" : "Task created");
      setIsCreateOpen(false);
      setEditingTask(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save task");
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Delete task
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  // Toggle task status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_active: isActive })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      task_type: "video",
      reward_amount: "",
      daily_limit: "",
      is_active: true,
      video_url: "",
    });
    setTriviaQuestions([]);
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      task_type: task.task_type as TaskType,
      reward_amount: task.reward_amount.toString(),
      daily_limit: task.daily_limit?.toString() || "",
      is_active: task.is_active,
      video_url: task.video_url || "",
    });
    // Load existing trivia questions
    const existingQuestions = (task as any).trivia_questions as TriviaQuestion[] | null;
    setTriviaQuestions(existingQuestions || []);
    setVideoFile(null);
    setIsCreateOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video file must be less than 100MB");
        return;
      }
      setVideoFile(file);
      setFormData({ ...formData, video_url: "" }); // Clear URL when file is selected
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "video":
        return Play;
      case "survey":
        return ClipboardList;
      case "trivia":
        return HelpCircle;
      default:
        return Calendar;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-UG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Task Management</h1>
            <p className="text-muted-foreground">Create and manage earning tasks</p>
          </div>
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setEditingTask(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? "Edit Task" : "Create New Task"}
                </DialogTitle>
                <DialogDescription>
                  {editingTask
                    ? "Update the task details below"
                    : "Fill in the details to create a new earning task"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Task title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Task description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select
                    value={formData.task_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, task_type: v as TaskType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Watch Video</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                      <SelectItem value="trivia">Trivia Quiz</SelectItem>
                      <SelectItem value="daily_checkin">Daily Check-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Video Upload Section - Only show for video tasks */}
                {formData.task_type === "video" && (
                  <div className="space-y-3 rounded-lg border p-3 bg-muted/50">
                    <Label className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video Source
                    </Label>
                    
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Upload Video File</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleFileChange}
                          className="flex-1"
                        />
                      </div>
                      {videoFile && (
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex-1 border-t" />
                      <span>OR</span>
                      <span className="flex-1 border-t" />
                    </div>

                    {/* URL Input */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Video URL (YouTube, etc.)</Label>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={formData.video_url}
                        onChange={(e) => {
                          setFormData({ ...formData, video_url: e.target.value });
                          setVideoFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        disabled={!!videoFile}
                      />
                    </div>

                    {editingTask?.video_url && !videoFile && !formData.video_url && (
                      <p className="text-sm text-muted-foreground">
                        Current video: {editingTask.video_url.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                )}

                {/* Trivia Questions Section */}
                {formData.task_type === "trivia" && (
                  <div className="rounded-lg border p-3 bg-muted/50 space-y-3">
                    <TriviaQuestionEditor
                      questions={triviaQuestions}
                      onChange={setTriviaQuestions}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reward (UGX)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 500"
                      value={formData.reward_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, reward_amount: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Daily Limit</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      value={formData.daily_limit}
                      onChange={(e) =>
                        setFormData({ ...formData, daily_limit: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || isUploading}
                >
                  {saveMutation.isPending || isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? "Uploading Video..." : "Saving..."}
                    </>
                  ) : editingTask ? (
                    "Update Task"
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tasks Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Daily Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks?.map((task) => {
                    const Icon = getTaskIcon(task.task_type);
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/20 p-2">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                              {task.video_url && (
                                <p className="text-xs text-blue-500">
                                  Has video attached
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {task.task_type.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          UGX {task.reward_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {task.daily_limit ? `${task.daily_limit}x` : "Unlimited"}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={task.is_active}
                            onCheckedChange={(checked) =>
                              toggleStatusMutation.mutate({
                                taskId: task.id,
                                isActive: checked,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>{formatDate(task.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(task)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
