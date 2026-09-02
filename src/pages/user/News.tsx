import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserLayout } from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SEO } from "@/components/SEO";
import { Newspaper, Pin, ChevronRight } from "lucide-react";

type NewsRow = {
  id: string;
  title: string;
  body: string | null;
  content: string | null;
  category: string;
  image_url: string | null;
  link_url: string | null;
  pinned: boolean;
  created_at: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "news", label: "News" },
  { key: "high_earner", label: "Winners" },
  { key: "promotion", label: "Promos" },
];

export default function News() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["news-feed", filter],
    queryFn: async () => {
      let q = supabase
        .from("news_items")
        .select("*")
        .eq("is_published", true)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(40);
      if (filter !== "all") q = q.eq("category", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as NewsRow[];
    },
  });

  return (
    <UserLayout>
      <SEO
        title="News & Winners | FlexiEarn"
        description="Latest FlexiEarn platform news, top earners, winners and promotions."
      />
      <div className="space-y-4">
        {/* Striped header */}
        <div className="relative overflow-hidden rounded-2xl gradient-primary p-5">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, hsl(var(--primary-foreground)) 0 12px, transparent 12px 26px)",
            }}
          />
          <div className="relative flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary-foreground" />
            <h1 className="text-2xl font-extrabold uppercase tracking-wide text-primary-foreground">
              News
            </h1>
          </div>
          <p className="relative mt-1 text-xs text-primary-foreground/85">
            Winners, promotions and everything happening on FlexiEarn.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={<Newspaper className="h-7 w-7" />}
            title="Nothing yet"
            description="Platform news, winners and promotions will appear here."
          />
        ) : (
          <div className="space-y-4">
            {data.map((n) => (
              <article
                key={n.id}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                {n.image_url && (
                  <img
                    src={n.image_url}
                    alt={n.title}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    {n.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString(undefined, {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold leading-snug">{n.title}</h2>
                  {n.body && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <Button
                    onClick={() => navigate(`/news/${n.id}`)}
                    className="mt-1 h-10 rounded-lg px-5 text-xs font-bold uppercase tracking-wide tap-pop"
                  >
                    Read more <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
