import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_KEY = "flexi_ad_popup_shown";

export function AdPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: ad } = useQuery({
    queryKey: ["popup-ad"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ads").select("*")
        .eq("status", "active")
        .in("placement", ["popup", "all"])
        .eq("ad_type", "popup")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!ad) return;
    if (sessionStorage.getItem(SESSION_KEY) === ad.id) return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, ad.id);
      (supabase as any).from("ad_events").insert({ ad_id: ad.id, user_id: user?.id ?? null, event_type: "impression" });
    }, 2500);
    return () => clearTimeout(t);
  }, [ad, user?.id]);

  if (!ad) return null;

  const handleClick = async () => {
    await (supabase as any).from("ad_events").insert({ ad_id: ad.id, user_id: user?.id ?? null, event_type: "click" });
    if (ad.target_url) window.open(ad.target_url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="sr-only"><DialogTitle>{ad.title}</DialogTitle></DialogHeader>
        {ad.media_url && (
          <img src={ad.media_url} alt={ad.title} className="w-full h-40 object-cover" />
        )}
        <div className="p-4 space-y-3">
          <Badge variant="outline" className="text-[10px]">Sponsored</Badge>
          <h3 className="font-bold text-lg">{ad.title}</h3>
          {ad.description && <p className="text-sm text-muted-foreground">{ad.description}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Close</Button>
            <Button className="flex-1 gradient-primary border-0 text-primary-foreground" onClick={handleClick}>
              {ad.cta_text || "Learn more"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
