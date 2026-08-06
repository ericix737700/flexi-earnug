import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Newspaper, Trophy, Gift, Crown, Pin, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

type NewsRow = {
  id: string;
  title: string;
  body: string | null;
  category: string;
  image_url: string | null;
  link_url: string | null;
  pinned: boolean;
  created_at: string;
};

function useNews(category: string) {
  return useQuery({
    queryKey: ["news_items", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_items")
        .select("*")
        .eq("is_published", true)
        .eq("category", category)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as NewsRow[];
    },
  });
}

function NewsList({ category, emptyText }: { category: string; emptyText: string }) {
  const { data, isLoading } = useNews(category);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (!data?.length) {
    return <EmptyState icon={<Newspaper className="h-7 w-7" />} title="Nothing yet" description={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {data.map((n) => (
        <button
          key={n.id}
          onClick={() => {
            if (!n.link_url) return;
            if (n.link_url.startsWith("/")) navigate(n.link_url);
            else window.open(n.link_url, "_blank", "noopener");
          }}
          className="w-full overflow-hidden rounded-2xl border bg-card text-left transition-colors hover:bg-muted/50"
        >
          {n.image_url && (
            <img src={n.image_url} alt={n.title} loading="lazy" className="h-32 w-full object-cover" />
          )}
          <div className="space-y-1.5 p-4">
            <div className="flex items-center gap-2">
              {n.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
              <p className="flex-1 truncate text-sm font-semibold">{n.title}</p>
              {n.link_url && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </div>
            {n.body && <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{n.body}</p>}
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              {new Date(n.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function UnlockedAchievements() {
  const { profile } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["achievement_claims", profile?.user_id],
    enabled: !!profile?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievement_claims")
        .select("id, reward_amount, claimed_at, achievements(title, description, icon)")
        .eq("user_id", profile!.user_id)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>;
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={Trophy}
        title="No achievements unlocked yet"
        description="Complete tasks, keep your login streak and invite friends to unlock bonus rewards."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((c: any) => (
        <div key={c.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15">
            <Trophy className="h-5 w-5 text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{c.achievements?.title || "Achievement"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {new Date(c.claimed_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <Badge className="shrink-0" variant="outline">
            +UGX {Number(c.reward_amount).toLocaleString()}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function NewsSection() {
  return (
    <Tabs defaultValue="news" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="news" className="gap-1 text-xs"><Newspaper className="h-3.5 w-3.5" />News</TabsTrigger>
        <TabsTrigger value="high_earner" className="gap-1 text-xs"><Crown className="h-3.5 w-3.5" />Earners</TabsTrigger>
        <TabsTrigger value="promotion" className="gap-1 text-xs"><Gift className="h-3.5 w-3.5" />Promos</TabsTrigger>
        <TabsTrigger value="achievement" className="gap-1 text-xs"><Trophy className="h-3.5 w-3.5" />Badges</TabsTrigger>
      </TabsList>

      <TabsContent value="news" className="mt-4">
        <NewsList category="news" emptyText="Platform updates and announcements will appear here." />
      </TabsContent>
      <TabsContent value="high_earner" className="mt-4">
        <NewsList category="high_earner" emptyText="Top earner highlights will be published here soon." />
      </TabsContent>
      <TabsContent value="promotion" className="mt-4">
        <NewsList category="promotion" emptyText="Promotions and bonus campaigns will show up here." />
      </TabsContent>
      <TabsContent value="achievement" className="mt-4">
        <UnlockedAchievements />
      </TabsContent>
    </Tabs>
  );
}
