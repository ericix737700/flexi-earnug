import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type EarnTask, useCompleteTask } from "@/hooks/useEarnTasks";
import { supabase } from "@/integrations/supabase/client";
import { canCountVideoWatch } from "@/lib/video-watch";

interface VideoFeedItemProps {
  task: EarnTask;
  active: boolean;
  done: boolean;
  muted: boolean;
  onMute: () => void;
}

export function VideoFeedItem({ task, active, done, muted, onMute }: VideoFeedItemProps) {
  const video = useRef<HTMLVideoElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const lastTime = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const complete = useCompleteTask();
  const need = Math.max(task.min_watch_seconds || 30, 5);
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
    if (active) player.play().catch(() => setPlaying(false));
    else player.pause();
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

  return (
    <article aria-label={task.title} data-active={active} className="video-feed-slide relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
      {yt ? active && <iframe ref={iframe} className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&rel=0&disablekb=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`} allow="autoplay; encrypted-media" title={task.title} /> : (
        <video ref={video} key={retry} src={task.video_url || undefined} muted={muted} playsInline preload={active ? "auto" : "none"} className="absolute inset-0 h-full w-full object-contain" aria-label={task.title}
          onPlaying={() => { setPlaying(true); setWaiting(false); }} onPause={() => setPlaying(false)} onWaiting={() => setWaiting(true)} onEnded={() => { setPlaying(false); setWaiting(false); }}
          onError={() => setError("This video couldn’t load. Try again.")}
          onTimeUpdate={(event) => { const player = event.currentTarget; if (player.currentTime > lastTime.current + 1.5) player.currentTime = lastTime.current; else lastTime.current = player.currentTime; }}
        />
      )}
      <div className="absolute right-3 top-4 z-10 flex flex-col gap-3">
        <Button size="icon" variant="ghost" className="video-feed-control rounded-full" aria-label={muted ? "Unmute video" : "Mute video"} title={muted ? "Unmute video" : "Mute video"} onClick={onMute}>{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</Button>
        <Button size="icon" variant="ghost" className="video-feed-control rounded-full" aria-label={playing ? "Pause video" : "Play video"} title={playing ? "Pause video" : "Play video"} onClick={togglePlayback}>{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Button>
      </div>
      {active && waiting && <Loader2 aria-label="Loading video" className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin" />}
      <div className="video-feed-caption absolute inset-x-0 bottom-0 space-y-3 px-4 pb-5 pt-16">
        <div className="flex items-center gap-2 text-xs font-semibold"><span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">UGX {Number(task.reward_amount).toLocaleString()}</span>{done && <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Earned today</span>}</div>
        <h2 className="break-words text-lg font-semibold leading-tight">{task.title}</h2>
        {task.description && <details className="text-xs"><summary className="cursor-pointer opacity-80">Video credits</summary><p className="mt-2 max-h-24 overflow-y-auto break-words">{task.description}</p></details>}
        {error ? <div role="alert" className="flex items-center justify-between gap-2 text-sm"><p>{error}</p><Button size="icon" variant="ghost" className="video-feed-control shrink-0" aria-label="Retry video" onClick={() => { setError(""); setRetry((value) => value + 1); }}><RotateCcw className="h-4 w-4" /></Button></div> : !done && <>
          <progress aria-label="Reward watch progress" max={need} value={elapsed} className="video-feed-progress block h-1.5 w-full overflow-hidden rounded-full" />
          <div className="flex items-center justify-between gap-3"><p className="text-xs">{elapsed >= need ? "Reward ready" : `${need - elapsed}s remaining`}</p><Button size="sm" disabled={!active || !started || elapsed < need || complete.isPending} onClick={() => complete.mutate({ taskId: task.id })}>{complete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Claim UGX {Number(task.reward_amount).toLocaleString()}</Button></div>
        </>}
      </div>
    </article>
  );
}