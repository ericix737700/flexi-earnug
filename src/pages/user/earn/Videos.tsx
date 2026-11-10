import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Video, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "@/components/layout/MobileNav";
import { VideoFeedItem } from "@/components/user/VideoFeedItem";
import { useEarnTasks } from "@/hooks/useEarnTasks";

export default function EarnVideos() {
  const { tasks, done } = useEarnTasks("video");
  const list = tasks.data || [];
  const feed = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const container = feed.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          setActive(index);
        }
      }
    }, { root: container, threshold: 0.65 });
    container.querySelectorAll("[data-index]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [list.length, tasks.isLoading, done.isLoading]);

  const move = (offset: number) => {
    const index = Math.max(0, Math.min(list.length - 1, active + offset));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feed.current?.children[index]?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "nearest" });
  };

  return (
    <div className="video-feed-page flex h-dvh flex-col overflow-hidden bg-background">
      <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" asChild><Link to="/dashboard" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-base font-semibold">Watch Videos</h1>
        </div>
        <Button size="icon" variant="ghost" asChild><Link to="/wallet" aria-label="Open wallet"><Wallet className="h-5 w-5" /></Link></Button>
      </header>
      <main className="relative mx-auto min-h-0 w-full max-w-lg flex-1">
        {tasks.isLoading || done.isLoading ? <Skeleton className="h-full w-full rounded-none" /> : tasks.isError ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"><p>Couldn’t load videos.</p><Button onClick={() => tasks.refetch()}>Try again</Button></div>
        ) : list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"><Video className="h-10 w-10 text-muted-foreground" /><p>No videos available right now.</p><Button variant="outline" onClick={() => tasks.refetch()}>Refresh</Button></div>
        ) : (
          <>
            <div ref={feed} role="region" aria-label="Video feed" tabIndex={0} className="video-feed-scroll h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain" onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); }
            }}>
              {list.map((task, index) => <div key={task.id} data-index={index} className="h-full snap-start snap-always"><VideoFeedItem task={task} active={active === index} done={done.data?.has(task.id) || false} muted={muted} onMute={() => setMuted((value) => !value)} /></div>)}
            </div>
            <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-card-foreground">{active + 1} / {list.length}</div>
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
              <Button size="icon" variant="ghost" className="video-feed-control rounded-full" disabled={active === 0} aria-label="Previous video" title="Previous video" onClick={() => move(-1)}><ChevronUp className="h-5 w-5" /></Button>
              <Button size="icon" variant="ghost" className="video-feed-control rounded-full" disabled={active === list.length - 1} aria-label="Next video" title="Next video" onClick={() => move(1)}><ChevronDown className="h-5 w-5" /></Button>
            </div>
          </>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
