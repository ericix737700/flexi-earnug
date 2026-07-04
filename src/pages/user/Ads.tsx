import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Megaphone, Plus, ExternalLink, Coins, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const AD_TYPES = [
  { value: "banner", label: "Banner ad (dashboard/tasks)" },
  { value: "popup", label: "Popup (app open)" },
  { value: "inline", label: "Inline card (between tasks)" },
  { value: "native", label: "Native / feed" },
  { value: "sponsored", label: "Sponsored listing" },
  { value: "video", label: "Video ad" },
  { value: "notification", label: "Notification ad" },
];

const PLACEMENTS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "tasks", label: "Between tasks" },
  { value: "popup", label: "Popup on app open" },
  { value: "ads_page", label: "Ads page only" },
  { value: "all", label: "Everywhere" },
];

export default function Ads() {
  const { profile, user, refreshProfile } = useAuth();
  const [tab, setTab] = useState("browse");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Approved ads to browse
  const { data: liveAds } = useQuery({
    queryKey: ["ads-live"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ads").select("*").eq("status", "active").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: myAds } = useQuery({
    queryKey: ["my-ads", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("ads").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: packages } = useQuery({
    queryKey: ["ad-packages"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ad_packages").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-ads"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "ad_custom_day_rate").maybeSingle();
      return data;
    },
  });

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", target_url: "", cta_text: "Learn more",
    ad_type: "banner", placement: "dashboard",
    package_id: "" as string, custom_days: 3,
    payment_method: "balance" as "balance" | "mobile_money",
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dayRate = Number(settings?.setting_value || 5000);
  const selectedPackage = packages?.find((p: any) => p.id === form.package_id);
  const days = selectedPackage?.days ?? form.custom_days;
  const cost = selectedPackage?.price ?? form.custom_days * dayRate;

  const trackClick = async (ad: any) => {
    await (supabase as any).from("ad_events").insert({ ad_id: ad.id, user_id: user?.id ?? null, event_type: "click" });
    if (ad.target_url) window.open(ad.target_url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async () => {
    if (!user?.id || !profile) return;
    if (!form.title.trim()) return toast.error("Enter a title");
    if (form.title.length > 120) return toast.error("Title too long");
    if (form.description.length > 500) return toast.error("Description too long");
    if (cost <= 0) return toast.error("Invalid pricing");

    setSubmitting(true);
    try {
      let media_url: string | null = null;
      if (mediaFile) {
        if (mediaFile.size > 5 * 1024 * 1024) throw new Error("Media must be under 5MB");
        const ext = mediaFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("ads").upload(path, mediaFile);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("ads").createSignedUrl(path, 60 * 60 * 24 * 365);
        media_url = signed?.signedUrl || null;
      }

      let paid = false;
      let status: string = "pending_review";

      if (form.payment_method === "balance") {
        if (Number(profile.balance) < cost) throw new Error("Insufficient balance");
        const newBalance = Number(profile.balance) - cost;
        const { error: bErr } = await supabase.from("profiles").update({ balance: newBalance }).eq("user_id", user.id);
        if (bErr) throw bErr;
        await supabase.from("transactions").insert({
          user_id: user.id, transaction_type: "ad_payment", amount: -cost, balance_after: newBalance,
          description: `Ad campaign: ${form.title}`,
        });
        paid = true;
        status = "pending_review";
      } else {
        status = "pending_payment";
      }

      const { error: insErr } = await (supabase as any).from("ads").insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        cta_text: form.cta_text.trim() || "Learn more",
        target_url: form.target_url.trim() || null,
        media_url,
        media_type: mediaFile?.type.startsWith("video") ? "video" : "image",
        ad_type: form.ad_type,
        placement: form.placement,
        package_id: form.package_id || null,
        days,
        cost,
        payment_method: form.payment_method,
        paid,
        status,
      });
      if (insErr) throw insErr;

      toast.success(form.payment_method === "balance"
        ? "Ad submitted for review!"
        : "Ad created. Complete payment via mobile money to proceed.");
      setOpen(false);
      setMediaFile(null);
      setForm({ ...form, title: "", description: "", target_url: "" });
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Ads</h1>
          </div>
          <Button size="sm" className="gradient-primary border-0 text-primary-foreground" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />Advertise
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="mine">My Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3">
            {(!liveAds || liveAds.length === 0) ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No ads yet — be the first to advertise on FlexiEarn.</CardContent></Card>
            ) : liveAds.map((ad: any) => (
              <Card key={ad.id} onClick={() => trackClick(ad)} className="cursor-pointer overflow-hidden hover:shadow-md transition-all">
                {ad.media_url && <img src={ad.media_url} alt={ad.title} className="w-full h-32 object-cover" loading="lazy" />}
                <CardContent className="py-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Sponsored</Badge>
                    <Badge variant="secondary" className="text-[10px]">{ad.ad_type}</Badge>
                  </div>
                  <p className="font-semibold">{ad.title}</p>
                  {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
                  <p className="text-xs text-primary font-medium">{ad.cta_text || "Learn more"} <ExternalLink className="inline h-3 w-3" /></p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mine" className="space-y-3">
            {(!myAds || myAds.length === 0) ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">You haven't submitted any ads yet.</CardContent></Card>
            ) : myAds.map((ad: any) => (
              <Card key={ad.id}>
                <CardContent className="py-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm">{ad.title}</p>
                    <Badge variant={ad.status === "active" ? "default" : ad.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                      {ad.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{ad.days}d</span> · <span>UGX {Number(ad.cost).toLocaleString()}</span> ·
                    <span>{ad.impression_count || 0} views</span> · <span>{ad.click_count || 0} clicks</span>
                  </div>
                  {ad.rejection_reason && <p className="text-xs text-destructive">Rejected: {ad.rejection_reason}</p>}
                  {ad.status === "pending_payment" && (
                    <p className="text-xs text-amber-600">Send UGX {Number(ad.cost).toLocaleString()} via MarzPay mobile money, then contact admin to activate.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advertise with FlexiEarn</DialogTitle>
            <DialogDescription>Reach thousands of active FlexiEarn users. All ads reviewed by admin before going live.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} rows={2} />
            </div>
            <div>
              <Label>Target URL</Label>
              <Input type="url" placeholder="https://..." value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} />
            </div>
            <div>
              <Label>Call-to-action</Label>
              <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} maxLength={30} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ad type</Label>
                <Select value={form.ad_type} onValueChange={(v) => setForm({ ...form, ad_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLACEMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />Media (image/video, max 5MB)
              </Label>
              <Input type="file" accept="image/*,video/*" onChange={(e) => setMediaFile(e.target.files?.[0] || null)} />
            </div>

            <div>
              <Label>Package</Label>
              <div className="grid gap-2">
                {packages?.map((p: any) => (
                  <Card key={p.id} className={`cursor-pointer p-2 ${form.package_id === p.id ? "border-primary" : ""}`}
                        onClick={() => setForm({ ...form, package_id: p.id })}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{p.name} · {p.days} days</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                      <Badge variant="secondary">UGX {Number(p.price).toLocaleString()}</Badge>
                    </div>
                  </Card>
                ))}
                <Card className={`p-2 cursor-pointer ${!form.package_id ? "border-primary" : ""}`} onClick={() => setForm({ ...form, package_id: "" })}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">Custom · {form.custom_days} days</p>
                      <p className="text-xs text-muted-foreground">UGX {dayRate.toLocaleString()}/day</p>
                    </div>
                    <Input type="number" min={1} max={365} className="w-20 h-8"
                           value={form.custom_days}
                           onClick={(e) => e.stopPropagation()}
                           onChange={(e) => setForm({ ...form, package_id: "", custom_days: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <Label>Payment method</Label>
              <RadioGroup value={form.payment_method} onValueChange={(v: any) => setForm({ ...form, payment_method: v })} className="mt-1">
                <label className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer">
                  <RadioGroupItem value="balance" />
                  <span className="text-sm">From account balance (UGX {Number(profile?.balance || 0).toLocaleString()})</span>
                </label>
                <label className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer">
                  <RadioGroupItem value="mobile_money" />
                  <span className="text-sm">Mobile Money (MTN/Airtel via MarzPay)</span>
                </label>
              </RadioGroup>
            </div>

            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <Badge className="gap-1 gradient-primary border-0 text-primary-foreground">
                  <Coins className="h-3 w-3" />UGX {cost.toLocaleString()} · {days} days
                </Badge>
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-primary border-0 text-primary-foreground" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting</> : "Submit ad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdPopup />
    </UserLayout>
  );
}

// re-export to lazy avoid separate import in dashboard
import { AdPopup } from "@/components/user/AdPopup";
