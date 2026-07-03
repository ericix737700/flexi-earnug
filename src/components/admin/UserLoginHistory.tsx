import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe, MapPin, Monitor, Loader2 } from "lucide-react";

interface Props {
  userId: string;
}

interface Entry {
  id: string;
  event_type: string;
  ip_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
  user_agent: string | null;
  created_at: string;
}

export function UserLoginHistory({ userId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["login-audit", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_audit" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data as unknown as Entry[]) || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading history…</div>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No login history recorded yet.</p>;
  }

  const shortUA = (ua: string | null) => {
    if (!ua) return "Unknown device";
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Android/i.test(ua)) return "Android";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
    if (/Linux/i.test(ua)) return "Linux";
    return ua.slice(0, 30);
  };

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      {data.map((e) => {
        const loc = [e.city, e.region, e.country].filter(Boolean).join(", ") || "Unknown location";
        return (
          <div key={e.id} className="rounded-lg border p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize">{e.event_type}</span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="font-mono truncate">{e.ip_address || "unknown"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{loc}{e.isp ? ` • ${e.isp}` : ""}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Monitor className="h-3 w-3 shrink-0" />
              <span className="truncate">{shortUA(e.user_agent)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
