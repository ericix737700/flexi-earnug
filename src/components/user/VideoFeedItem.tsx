import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Coins, Eye, Heart, Loader2, Maximize, MessageCircle, Pause, Play, Plus, RotateCcw, Send, Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type EarnTask, useCompleteTask } from "@/hooks/useEarnTasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canCountVideoWatch } from "@/lib/video-watch";
import { compactCount, useAddComment, useComments, useToggleFollow, useToggleLike } from "@/hooks/useVideoSocial";
import { toast } from "sonner";

export type FeedTask = EarnTask & { creator_name?: string | null; creator_avatar_url?: string | null };

interface VideoFeedItemProps {
  task: FeedTask;
  active: boolean;
  preload: boolean;
  done: boolean;
  muted: boolean;
  onMute: () => void;
  views: number;
  likes: number;
  comments: number;
  liked: boolean;
  following: boolean;
}

export const creatorOf = (task: FeedTask) => task.creator_name?.trim() || "FlexiEarn";

export function VideoFeedItem({ task, active, preload, done, muted, onMute, views, likes, comments, liked, following }: VideoFeedItemProps) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const lastTime = useRef(0);
  const autoClaimed = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [earned, setEarned] = useState<number | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [progress, setProgress] = useState(0);
  const { profile } = useAuth() as any;
  const complete = useCompleteTask((reward) => { setEarned(reward); window.setTimeout(() => setEarned(null), 3500); });
  const like = useToggleLike();
  const follow = useToggleFollow();
  const commentList = useComments(task.id, commentsOpen);
  const addComment = useAddComment(task.id, profile?.full_name || null);
  const need = Math.max(task.min_watch_seconds || 30, 5);
  const creator = creatorOf(task);
  const yt = task.video_url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/)?.[1];

  useEffect(() => {
    if (!active || done || started) return;
    let cancelled = false;
    (supabase.rpc as any)("start_task", { _task_id: task.id }).then(({ data, error: startError }: any) => {
      if (cancelled) return;
      if (startError || !data?.success) setError(data?.error || "Could not start this video. Try again.");
      else setStarted(true);
    });
    return () => { cancelled = true; };
  }, [active, done, started, task.id, retry]);

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    if (active && !document.hidden) player.play().catch(() => setPlaying(false));
    else player.pause();
    const onVis = () => { if (document.hidden) player.pause(); else if (active) player.play().catch(() => {}); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active, retry]);

  useEffect(() => {
    if (!yt || !active) return;
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || event.origin !== "https://www.youtube.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event === "onStateChange") setPlaying(data.info === 1);
      } catch { /* Ignore unrelated messages. */ }
    };
    window.addEventListener("message", receive);
    const timer = window.setInterval(() => {
      iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "https://www.youtube.com");
      iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }), "https://www.youtube.com");
    }, 1000);
    return () => { window.removeEventListener("message", receive); clearInterval(timer); setPlaying(false); };
  }, [yt, active]);

  useEffect(() => {
    if (!yt || !active) return;
    iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: muted ? "mute" : "unMute", args: [] }), "https://www.youtube.com");
  }, [yt, active, muted]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!done && canCountVideoWatch(active, !document.hidden, playing, started, waiting)) {
        setElapsed((value) => Math.min(value + 1, need));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [active, playing, started, waiting, done, need]);

  // Claim automatically once the watch requirement is met; the server re-validates watch time.
  useEffect(() => {
    if (active && started && !done && elapsed >= need && !autoClaimed.current && !complete.isPending) {
      autoClaimed.current = true;
      complete.mutate({ taskId: task.id });
    }
  }, [active, started, done, elapsed, need, complete, task.id]);

  const togglePlayback = () => {
    if (yt) {
      iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: playing ? "pauseVideo" : "playVideo", args: [] }), "https://www.youtube.com");
      return;
    }
    const player = video.current;
    if (!player) return;
    if (player.ended) { lastTime.current = 0; player.currentTime = 0; }
    if (player.paused) player.play().catch(() => setPlaying(false));
    else player.pause();
  };

  const share = async () => {
    const url = `${window.location.origin}/earn/videos`;
    try {
      if (navigator.share) await navigator.share({ title: task.title, text: `Watch "${task.title}" and earn on FlexiEarn`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* Share dismissed. */ }
  };

  const fullscreen = () => {
    const el = root.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => toast.error("Full screen isn't supported here"));
  };

  const rail = "video-feed-control flex h-11 w-11 items-center justify-center rounded-full";

  return (
    <article ref={root} aria-label={task.title} data-active={active} className="video-feed-slide relative h-full w-full shrink-0 overflow-hidden">
      {yt ? active && <iframe ref={iframe} className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&rel=0&disablekb=1&enablejsapi=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`} allow="autoplay; encrypted-media; fullscreen" title={task.title} /> : (active || preload) && (
        <video ref={video} key={retry} src={task.video_url || undefined} muted={muted} playsInline loop={done} preload={active ? "auto" : "metadata"} className="absolute inset-0 h-full w-full object-cover" aria-label={task.title}
          onClick={togglePlayback}
          onPlaying={() => { setPlaying(true); setWaiting(false); }} onPause={() => setPlaying(false)} onWaiting={() => setWaiting(true)} onEnded={() => { setPlaying(false); setWaiting(false); }}
          onError={() => setError("This video couldn’t load. Check your connection and try again.")}
          onTimeUpdate={(event) => {
            const player = event.currentTarget;
            if (!done && player.currentTime > lastTime.current + 1.5) player.currentTime = lastTime.current; else lastTime.current = player.currentTime;
            if (player.duration) setProgress(player.currentTime / player.duration);
          }}
        />
      )}

      {active && !playing && !waiting && !error && !yt && (
        <button type="button" onClick={togglePlayback} aria-label="Play video" className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full video-feed-control"><Play className="h-8 w-8" /></button>
      )}
      {active && waiting && <Loader2 aria-label="Loading video" className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin" />}

      {/* Reward pill */}
      <div className="absolute left-3 top-14 z-10 flex items-center gap-2">
        <span className="video-reward-pill flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"><Coins className="h-3.5 w-3.5" />UGX {Number(task.reward_amount).toLocaleString()}</span>
        {done && <span className="video-feed-control flex items-center gap-1 rounded-full px-2 py-1 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Earned today</span>}
      </div>

      {earned !== null && (
        <div role="status" className="video-reward-pill absolute left-1/2 top-24 z-20 -translate-x-1/2 animate-fade-in rounded-full px-4 py-2 text-sm font-semibold shadow-lg">+UGX {earned.toLocaleString()} earned</div>
      )}

      {/* Right action rail */}
      <div className="absolute bottom-28 right-2 z-10 flex flex-col items-center gap-4 text-xs font-medium">
        <div className="relative mb-1">
          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-current bg-primary text-primary-foreground">
            {task.creator_avatar_url ? <img src={task.creator_avatar_url} alt={creator} className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full w-full items-center justify-center text-lg font-bold">{creator[0]}</span>}
          </div>
          {!following && <button type="button" aria-label={`Follow ${creator}`} onClick={() => follow.mutate({ creator, following })} className="absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="h-3 w-3" /></button>}
        </div>
        <button type="button" aria-label={liked ? "Unlike" : "Like"} aria-pressed={liked} onClick={() => like.mutate({ taskId: task.id, liked })} className="flex flex-col items-center gap-1"><span className={rail}><Heart className={`h-6 w-6 ${liked ? "fill-destructive text-destructive" : ""}`} /></span>{compactCount(likes)}</button>
        <button type="button" aria-label="Comments" onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1"><span className={rail}><MessageCircle className="h-6 w-6" /></span>{compactCount(comments)}</button>
        <button type="button" aria-label="Share" onClick={share} className="flex flex-col items-center gap-1"><span className={rail}><Share2 className="h-6 w-6" /></span>Share</button>
        <div className="flex flex-col items-center gap-1" aria-label={`${views} views`}><span className={rail}><Eye className="h-6 w-6" /></span>{compactCount(views)}</div>
        <button type="button" aria-label={muted ? "Unmute video" : "Mute video"} onClick={onMute} className={rail}>{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
        <button type="button" aria-label="Full screen" onClick={fullscreen} className={rail}><Maximize className="h-5 w-5" /></button>
      </div>

      {/* Caption */}
      <div className="video-feed-caption absolute inset-x-0 bottom-0 space-y-2 px-4 pb-4 pr-20 pt-20">
        <div className="flex items-center gap-2">
          <p className="font-semibold">@{creator}</p>
          {following && <button type="button" onClick={() => follow.mutate({ creator, following })} className="rounded border border-current px-2 text-[10px] opacity-80">Following</button>}
        </div>
        <h2 className="break-words text-base font-semibold leading-tight">{task.title}</h2>
        {task.description && <p className="line-clamp-2 break-words text-xs opacity-85">{task.description}</p>}
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-2 text-sm"><p>{error}</p><Button size="icon" variant="ghost" className="video-feed-control shrink-0" aria-label="Retry video" onClick={() => { setError(""); setRetry((v) => v + 1); }}><RotateCcw className="h-4 w-4" /></Button></div>
        ) : !done && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs">{complete.isPending ? "Crediting reward…" : elapsed >= need ? "Reward ready" : `Watch ${need - elapsed}s more to earn`}</p>
            {elapsed >= need && !complete.isPending && autoClaimed.current && <Button size="sm" onClick={() => complete.mutate({ taskId: task.id })}>Claim</Button>}
          </div>
        )}
        <div className="flex gap-1 pt-1">
          <progress aria-label="Reward watch progress" max={need} value={done ? need : elapsed} className="video-feed-progress video-feed-progress-reward block h-1 w-full overflow-hidden rounded-full" />
        </div>
        <progress aria-label="Video progress" max={1} value={progress} className="video-feed-progress block h-0.5 w-full overflow-hidden rounded-full" />
      </div>

      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="flex h-[70dvh] flex-col">
          <SheetHeader><SheetTitle>{compactCount(comments)} comments</SheetTitle></SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">
            {commentList.isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : commentList.isError ? <p className="text-center text-sm text-muted-foreground">Couldn't load comments.</p> : (commentList.data?.length ?? 0) === 0 ? <p className="text-center text-sm text-muted-foreground">No comments yet. Be the first.</p> :
              commentList.data!.map((c) => <div key={c.id} className="text-sm"><p className="text-xs font-semibold text-muted-foreground">{c.author_name || "Member"} · {new Date(c.created_at).toLocaleDateString()}</p><p className="break-words">{c.body}</p></div>)}
          </div>
          <form className="flex gap-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) addComment.mutate(draft, { onSuccess: () => setDraft("") }); }}>
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder="Add a comment…" aria-label="Add a comment" />
            <Button type="submit" size="icon" disabled={!draft.trim() || addComment.isPending} aria-label="Post comment"><Send className="h-4 w-4" /></Button>
          </form>
        </SheetContent>
      </Sheet>
    </article>
  );
}
