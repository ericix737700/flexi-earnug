import { useEffect, useRef, useState } from "react";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEarnTasks, useCompleteTask, type EarnTask } from "@/hooks/useEarnTasks";
import { CheckCircle2, Play, Clock } from "lucide-react";
import { toast } from "sonner";

const ytId = (url: string) => url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/)?.[1];

function Player({ task, onClose }: { task: EarnTask; onClose: () => void }) {
  const need = Math.max(task.min_watch_seconds || 30, 5);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const lastTime = useRef(0);
  const complete = useCompleteTask(() => onClose());
  const yt = task.video_url ? ytId(task.video_url) : null;

  useEffect(() => {
    (supabase.rpc as any)("start_task", { _task_id: task.id }).then(({ data, error }: any) => {
      if (error || !data?.success) toast.error(data?.error || "Could not start video");
    });
  }, [task.id]);

  // YouTube: count wall-clock time while the page is visible.
  useEffect(() => {
    if (!yt) return;
    const t = setInterval(() => { if (!document.hidden) setElapsed((e) => Math.min(e + 1, need)); }, 1000);
    return () => clearInterval(t);
  }, [yt, need]);

  useEffect(() => {
    if (yt || !playing) return;
    const t = setInterval(() => { if (!document.hidden) setElapsed((e) => Math.min(e + 1, need)); }, 1000);
    return () => clearInterval(t);
  }, [yt, playing, need]);

  const pct = Math.round((elapsed / need) * 100);
  const ready = elapsed >= need;

  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 bg-card p-3">
      <div className="aspect-video overflow-hidden rounded-xl bg-muted">
        {yt ? (
          <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${yt}?autoplay=1&controls=0&modestbranding=1&rel=0&disablekb=1`} allow="autoplay; encrypted-media" title={task.title} />
        ) : (
          <video
            src={task.video_url || ""}
            autoPlay
            playsInline
            className="h-full w-full"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.currentTime > lastTime.current + 1.5) v.currentTime = lastTime.current; else lastTime.current = v.currentTime; }}
            onClick={(e) => { const v = e.currentTarget; v.paused ? v.play() : v.pause(); }}
          />
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{ready ? "Video complete — claim your reward" : `Keep watching… ${need - elapsed}s left`}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          <Button size="sm" disabled={!ready || complete.isPending} onClick={() => complete.mutate({ taskId: task.id })} className="rounded-full gradient-primary border-0 text-primary-foreground">
            Claim UGX {Number(task.reward_amount).toLocaleString()}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EarnVideos() {
  const { tasks, done } = useEarnTasks("video");
  const [active, setActive] = useState<string | null>(null);
  const list = tasks.data || [];

  return (
    <FeaturePage title="Watch Videos" description="Watch short videos to the end and get paid. Each video pays once a day." backTo="/dashboard">
      <div className="space-y-3">
        {tasks.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        {!tasks.isLoading && list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No videos available right now. Check back soon.</p>}
        {list.map((t) => {
          const isDone = done.data?.has(t.id);
          return (
            <div key={t.id} className="space-y-3">
              <div className="card-neon flex items-center gap-3 rounded-2xl p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary"><Play className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.title}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-bold text-primary">+UGX {Number(t.reward_amount).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.min_watch_seconds}s</span>
                  </p>
                </div>
                {isDone ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="h-4 w-4" />Done</span>
                ) : (
                  <Button size="sm" disabled={!t.video_url} onClick={() => setActive(active === t.id ? null : t.id)} className="rounded-full gradient-primary border-0 px-5 font-bold text-primary-foreground">
                    {active === t.id ? "Watching" : "Start"}
                  </Button>
                )}
              </div>
              {active === t.id && !isDone && <Player task={t} onClose={() => setActive(null)} />}
            </div>
          );
        })}
      </div>
    </FeaturePage>
  );
}
