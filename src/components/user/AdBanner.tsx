import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  description: string | null;
  cta_text: string | null;
  target_url: string | null;
  media_url: string | null;
  ad_type: string;
  placement: string;
}

export function AdBanner({ placement = "dashboard" }: { placement?: "dashboard" | "tasks" }) {
  const { user } = useAuth();
  const { data: ads } = useQuery({
    queryKey: ["display-ads", placement],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ads").select("*")
        .eq("status", "active")
        .in("placement", [placement, "all"])
        .in("ad_type", ["banner", "native", "sponsored", "inline"])
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as Ad[];
    },
    staleTime: 60_000,
  });

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!ads?.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), 7000);
    return () => clearInterval(t);
  }, [ads?.length]);

  const ad = ads?.[idx];
  const trackedKey = useMemo(() => ad?.id, [ad?.id]);

  useEffect(() => {
    if (!ad?.id) return;
    (supabase as any).from("ad_events").insert({ ad_id: ad.id, user_id: user?.id ?? null, event_type: "impression" });
    (supabase as any).rpc; // no-op
    // Best-effort increment
    (supabase as any).from("ads").update({ impression_count: (ad as any).impression_count ? undefined : undefined }).eq("id", ad.id);
  }, [trackedKey]);

  if (!ad) return null;

  const handleClick = async () => {
    await (supabase as any).from("ad_events").insert({ ad_id: ad.id, user_id: user?.id ?? null, event_type: "click" });
    if (ad.target_url) window.open(ad.target_url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card
      onClick={handleClick}
      className="relative overflow-hidden cursor-pointer border-primary/20 hover:shadow-md transition-all"
    >
      <div className="flex gap-3 p-3">
        {ad.media_url ? (
          <img src={ad.media_url} alt={ad.title} className="h-16 w-16 rounded-lg object-cover" loading="lazy" />
        ) : (
          <div className="h-16 w-16 rounded-lg gradient-primary flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-primary-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Sponsored</Badge>
          </div>
          <p className="font-semibold text-sm line-clamp-1">{ad.title}</p>
          {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
          <p className="text-xs text-primary font-medium mt-0.5">{ad.cta_text || "Learn more"} →</p>
        </div>
      </div>
    </Card>
  );
}
