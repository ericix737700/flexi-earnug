import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Video, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "@/components/layout/MobileNav";
import { VideoFeedItem, creatorOf, type FeedTask } from "@/components/user/VideoFeedItem";
import { useEarnTasks } from "@/hooks/useEarnTasks";
import { useFollows, useMyLikes, useVideoStats } from "@/hooks/useVideoSocial";

type Tab = "foryou" | "following";

export default function EarnVideos() {
  const { tasks, done } = useEarnTasks("video");
  const stats = useVideoStats();
  const likes = useMyLikes();
  const follows = useFollows();
  const [tab, setTab] = useState<Tab>("foryou");
  const all = (tasks.data || []) as FeedTask[];
  const list = useMemo(() => tab === "foryou" ? all : all.filter((t) => follows.data?.has(creatorOf(t))), [tab, all, follows.data]);
  const feed = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => { setActive(0); feed.current?.scrollTo({ top: 0 }); }, [tab]);

  useEffect(() => {
    const container = feed.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) setActive(Number((entry.target as HTMLElement).dataset.index));
      }
    }, { root: container, threshold: 0.65 });
    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [list.length, tasks.isLoading, done.isLoading, tab]);

  const move = (offset: number) => {
    const index = Math.max(0, Math.min(list.length - 1, active + offset));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feed.current?.children[index]?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "nearest" });
  };

  const loading = tasks.isLoading || done.isLoading;

  return (
    <div className="video-feed-page flex h-dvh flex-col overflow-hidden video-feed-slide">
      <main className="relative mx-auto min-h-0 w-full max-w-md flex-1 md:aspect-[9/16] md:h-full md:flex-none">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between px-2">
          <Button size="icon" variant="ghost" className="video-feed-control pointer-events-auto rounded-full" asChild><Link to="/dashboard" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <nav className="pointer-events-auto flex gap-5 text-sm font-semibold" aria-label="Feed category">
            {(["following", "foryou"] as Tab[]).map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className={`border-b-2 pb-1 transition-opacity ${tab === t ? "border-current opacity-100" : "border-transparent opacity-60"}`}>{t === "foryou" ? "For You" : "Following"}</button>
            ))}
          </nav>
          <Button size="icon" variant="ghost" className="video-feed-control pointer-events-auto rounded-full" asChild><Link to="/wallet" aria-label="Open wallet"><Wallet className="h-5 w-5" /></Link></Button>
        </header>

        {loading ? (
          <div className="flex h-full flex-col justify-end gap-3 p-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-1 w-full" /></div>
        ) : tasks.isError ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"><p>Couldn’t load videos. Check your connection.</p><Button onClick={() => tasks.refetch()}>Try again</Button></div>
        ) : list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            {tab === "following" ? <><Users className="h-10 w-10 opacity-70" /><p>You aren’t following any creators yet.</p><p className="text-sm opacity-70">Tap + on a creator’s picture in For You to follow them.</p><Button onClick={() => setTab("foryou")}>Browse For You</Button></> :
              <><Video className="h-10 w-10 opacity-70" /><p>No videos available right now.</p><Button variant="outline" onClick={() => tasks.refetch()}>Refresh</Button></>}
          </div>
        ) : (
          <div ref={feed} role="region" aria-label="Video feed" tabIndex={0} className="video-feed-scroll h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain" onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
          }}>
            {list.map((task, index) => {
              const s = stats.data?.get(task.id);
              return (
                <div key={task.id} data-index={index} className="h-full snap-start snap-always">
                  <VideoFeedItem task={task} active={active === index} preload={index === active + 1} done={done.data?.has(task.id) || false} muted={muted} onMute={() => setMuted((v) => !v)}
                    views={s?.views ?? 0} likes={s?.likes ?? 0} comments={s?.comments ?? 0} liked={likes.data?.has(task.id) || false} following={follows.data?.has(creatorOf(task)) || false} />
                </div>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
