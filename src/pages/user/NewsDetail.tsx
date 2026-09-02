import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserLayout } from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SEO } from "@/components/SEO";
import { ArrowLeft, Newspaper, ExternalLink } from "lucide-react";

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["news-item", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_items")
        .select("*")
        .eq("id", id!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  return (
    <UserLayout>
      <SEO title={`${data?.title || "News"} | FlexiEarn`} description={data?.body || "FlexiEarn news"} />
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/news")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to news
        </Button>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !data ? (
          <EmptyState icon={<Newspaper className="h-7 w-7" />} title="Story not found" description="This article may have been removed." />
        ) : (
          <article className="overflow-hidden rounded-2xl border bg-card">
            {data.image_url && (
              <img src={data.image_url} alt={data.title} className="h-52 w-full object-cover" />
            )}
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">{data.category}</Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(data.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <h1 className="text-xl font-bold leading-snug">{data.title}</h1>
              {data.body && <p className="text-sm font-medium leading-relaxed">{data.body}</p>}
              {data.content && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {data.content}
                </p>
              )}
              {data.link_url && (
                <Button
                  variant="outline"
                  className="mt-2 rounded-lg"
                  onClick={() => {
                    if (data.link_url.startsWith("/")) navigate(data.link_url);
                    else window.open(data.link_url, "_blank", "noopener");
                  }}
                >
                  Learn more <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </article>
        )}
      </div>
    </UserLayout>
  );
}
