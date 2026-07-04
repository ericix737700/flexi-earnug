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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trophy, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { value: "first_task", label: "First task" },
  { value: "tasks_count", label: "Tasks completed" },
  { value: "login_streak", label: "Login streak (days)" },
  { value: "referrals", label: "Referral count" },
  { value: "custom", label: "Custom" },
];

export default function AdminAchievements() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    key: "", title: "", description: "", achievement_type: "tasks_count",
    threshold: 1, reward_amount: 0, icon: "Trophy", is_active: true, sort_order: 0,
  });

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["admin-achievements"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("achievements").select("*").order("sort_order");
      return data || [];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ key: "", title: "", description: "", achievement_type: "tasks_count", threshold: 1, reward_amount: 0, icon: "Trophy", is_active: true, sort_order: 0 });
    setOpen(true);
  };
  const openEdit = (a: any) => { setEditing(a); setForm(a); setOpen(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await (supabase as any).from("achievements").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("achievements").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-achievements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("achievements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["admin-achievements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Achievements</h1>
          </div>
          <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New</Button>
        </div>

        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
          <div className="grid gap-3">
            {achievements?.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{a.title}</p>
                      <Badge variant="outline">{a.achievement_type}</Badge>
                      {!a.is_active && <Badge variant="secondary">inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <p className="text-xs mt-1">Threshold {a.threshold} · UGX {Number(a.reward_amount).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Achievement</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label>Key (unique)</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={form.achievement_type} onValueChange={(v) => setForm({ ...form, achievement_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Threshold</Label><Input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} /></div>
              <div><Label>Reward (UGX)</Label><Input type="number" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Icon (lucide name)</Label><Input value={form.icon || ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Trophy" /></div>
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
