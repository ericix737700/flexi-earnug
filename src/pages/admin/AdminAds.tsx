import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, CheckCircle, XCircle, Play, Pause, Trash2, ExternalLink, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdminAds() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending_review");
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [reason, setReason] = useState("");

  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-ads", tab],
    queryFn: async () => {
      const q = (supabase as any).from("ads").select("*").order("created_at", { ascending: false });
      const { data } = tab === "all" ? await q : await q.eq("status", tab);
      return data || [];
    },
  });

  const approve = useMutation({
    mutationFn: async (ad: any) => {
      const start = new Date();
      const end = new Date(start.getTime() + ad.days * 86400000);
      const { error } = await (supabase as any).from("ads").update({
        status: "active", reviewed_at: new Date().toISOString(),
        start_date: start.toISOString(), end_date: end.toISOString(),
      }).eq("id", ad.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ad approved & live"); queryClient.invalidateQueries({ queryKey: ["admin-ads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const doReject = useMutation({
    mutationFn: async () => {
      if (!rejectFor) return;
      const { error } = await (supabase as any).from("ads").update({
        status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString(),
      }).eq("id", rejectFor.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rejected"); setRejectFor(null); setReason(""); queryClient.invalidateQueries({ queryKey: ["admin-ads"] }); },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { error } = await (supabase as any).from("ads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-ads"] }),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ads").update({ paid: true, status: "pending_review" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked paid"); queryClient.invalidateQueries({ queryKey: ["admin-ads"] }); },
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["admin-ads"] }); },
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Advertisements</h1>
        </div>

        <AdPackagesManager />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="pending_review">Pending review</TabsTrigger>
            <TabsTrigger value="pending_payment">Awaiting payment</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-3">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> :
              !ads?.length ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No ads here.</CardContent></Card> :
              ads.map((ad: any) => (
                <Card key={ad.id}>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {ad.media_url && <img src={ad.media_url} alt={ad.title} className="h-20 w-20 rounded object-cover" />}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold">{ad.title}</p>
                          <Badge variant="outline" className="text-[10px]">{ad.ad_type}</Badge>
                          <Badge variant="outline" className="text-[10px]">{ad.placement}</Badge>
                          <Badge variant={ad.status === "active" ? "default" : "secondary"} className="text-[10px]">{ad.status}</Badge>
                          {ad.paid && <Badge className="text-[10px] bg-success text-success-foreground">paid</Badge>}
                        </div>
                        {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                          <span>{ad.days}d</span>·<span>UGX {Number(ad.cost).toLocaleString()}</span>·
                          <span>{ad.payment_method}</span>·<span>{ad.impression_count || 0} views</span>·<span>{ad.click_count || 0} clicks</span>
                        </div>
                        {ad.target_url && (
                          <a href={ad.target_url} target="_blank" rel="noopener noreferrer"
                             className="text-xs text-primary flex items-center gap-1"><ExternalLink className="h-3 w-3" />{ad.target_url}</a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ad.status === "pending_payment" && !ad.paid && (
                        <Button size="sm" onClick={() => markPaid.mutate(ad.id)}>Mark paid</Button>
                      )}
                      {(ad.status === "pending_review" || ad.status === "approved") && (
                        <Button size="sm" onClick={() => approve.mutate(ad)}><CheckCircle className="mr-1 h-4 w-4" />Approve & activate</Button>
                      )}
                      {ad.status !== "rejected" && ad.status !== "active" && (
                        <Button size="sm" variant="outline" onClick={() => setRejectFor(ad)}><XCircle className="mr-1 h-4 w-4" />Reject</Button>
                      )}
                      {ad.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: ad.id, status: "paused" })}><Pause className="mr-1 h-4 w-4" />Pause</Button>
                      )}
                      {ad.status === "paused" && (
                        <Button size="sm" onClick={() => setStatus.mutate({ id: ad.id, status: "active" })}><Play className="mr-1 h-4 w-4" />Resume</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteAd.mutate(ad.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject ad</DialogTitle><DialogDescription>Tell the advertiser why this ad was rejected.</DialogDescription></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => doReject.mutate()} disabled={doReject.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function AdPackagesManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", description: "", days: 7, price: 30000, is_active: true, sort_order: 0 });

  const { data: packages } = useQuery({
    queryKey: ["admin-ad-packages"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("ad_packages").select("*").order("sort_order");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await (supabase as any).from("ad_packages").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("ad_packages").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); queryClient.invalidateQueries({ queryKey: ["admin-ad-packages"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("ad_packages").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-ad-packages"] }),
  });

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm">Ad packages</p>
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setForm({ name: "", description: "", days: 7, price: 30000, is_active: true, sort_order: 0 }); setOpen(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" />Add
          </Button>
        </div>
        <div className="grid gap-2">
          {packages?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
              <div>
                <p className="font-medium">{p.name} · {p.days}d · UGX {Number(p.price).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setForm(p); setOpen(true); }}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} package</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Days</Label><Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div>
              <div><Label>Price (UGX)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2">
              <Label>Active</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
