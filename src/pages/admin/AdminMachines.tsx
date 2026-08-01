import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cpu, Loader2, MoreVertical, Plus, Upload, Send } from "lucide-react";

type MachineStatus = "active" | "coming_soon" | "sold_out" | "disabled";

interface MachineForm {
  id?: string;
  name: string;
  series: string;
  description: string;
  image_url: string;
  price: string;
  reward_amount: string;
  duration_hours: string;
  status: MachineStatus;
  max_per_user: string;
  max_total: string;
  sort_order: string;
  is_visible: boolean;
}

const emptyForm: MachineForm = {
  name: "", series: "", description: "", image_url: "",
  price: "10000", reward_amount: "13000", duration_hours: "72",
  status: "coming_soon", max_per_user: "0", max_total: "0",
  sort_order: "0", is_visible: true,
};

export default function AdminMachines() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MachineForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: machines, isLoading } = useQuery({
    queryKey: ["admin-machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_machines")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-machines"] });
    queryClient.invalidateQueries({ queryKey: ["investment-machines"] });
  };

  const openNew = () => { setForm(emptyForm); setOpen(true); };

  const openEdit = (m: Record<string, unknown>) => {
    setForm({
      id: m.id as string,
      name: (m.name as string) || "",
      series: (m.series as string) || "",
      description: (m.description as string) || "",
      image_url: (m.image_url as string) || "",
      price: String(m.price ?? 0),
      reward_amount: String(m.reward_amount ?? 0),
      duration_hours: String(m.duration_hours ?? 24),
      status: m.status as MachineStatus,
      max_per_user: String(m.max_per_user ?? 0),
      max_total: String(m.max_total ?? 0),
      sort_order: String(m.sort_order ?? 0),
      is_visible: Boolean(m.is_visible),
    });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `machines/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      series: form.series.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      price: Number(form.price) || 0,
      reward_amount: Number(form.reward_amount) || 0,
      duration_hours: Math.max(1, Number(form.duration_hours) || 1),
      status: form.status,
      max_per_user: Number(form.max_per_user) || 0,
      max_total: Number(form.max_total) || 0,
      sort_order: Number(form.sort_order) || 0,
      is_visible: form.is_visible,
    };
    try {
      if (form.id) {
        const { error } = await supabase.from("investment_machines").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("investment_machines").insert(payload);
        if (error) throw error;
      }
      toast.success(form.id ? "Machine updated" : "Machine created");
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: MachineStatus) => {
    const { error } = await supabase.from("investment_machines").update({ status }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success("Machine updated");
    refresh();
  };

  const toggleVisible = async (id: string, is_visible: boolean) => {
    const { error } = await supabase.from("investment_machines").update({ is_visible }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    refresh();
  };

  const duplicate = async (m: Record<string, unknown>) => {
    const { id, created_at, updated_at, purchases_count, ...rest } = m as Record<string, unknown>;
    const { error } = await supabase
      .from("investment_machines")
      .insert({ ...(rest as never), name: `${m.name as string} (Copy)`, status: "coming_soon" });
    if (error) { toast.error("Duplicate failed"); return; }
    toast.success("Machine duplicated");
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("investment_machines").delete().eq("id", id);
    if (error) { toast.error("Cannot delete a machine with investments. Disable it instead."); return; }
    toast.success("Machine deleted");
    refresh();
  };

  const announce = async (m: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: null,
        title: "New investment machine",
        message: `${m.name as string} is now available. Invest UGX ${Number(m.price).toLocaleString()} and earn UGX ${Number(m.reward_amount).toLocaleString()}.`,
        notification_type: "investment",
      });
      if (error) throw error;
      await supabase.functions.invoke("send-push", {
        body: {
          broadcast: true,
          title: "New investment machine",
          body: `${m.name as string} is now available on FlexiEarn.`,
          url: "/machines",
        },
      });
      toast.success("Announcement sent");
    } catch {
      toast.error("Failed to send announcement");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Cpu className="h-6 w-6 text-primary" /> Investment Machines
            </h1>
            <p className="text-muted-foreground">Create and manage investment plans</p>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New Machine</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(machines || []).map((m) => (
              <Card key={m.id as string}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{m.name}</p>
                        {m.series && <Badge variant="secondary" className="text-[10px]">{m.series}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span>Price: <b>UGX {Number(m.price).toLocaleString()}</b></span>
                        <span>Reward: <b className="text-success">UGX {Number(m.reward_amount).toLocaleString()}</b></span>
                        <span>Duration: <b>{m.duration_hours}h</b></span>
                        <span>Sold: <b>{m.purchases_count}{Number(m.max_total) > 0 ? `/${m.max_total}` : ""}</b></span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(m as Record<string, unknown>)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(m.id as string, "active")}>Mark Active</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(m.id as string, "coming_soon")}>Mark Coming Soon</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(m.id as string, "sold_out")}>Mark Sold Out</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(m.id as string, "disabled")}>Disable</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(m as Record<string, unknown>)}>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => announce(m as Record<string, unknown>)}>
                          <Send className="mr-2 h-4 w-4" />Announce
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => remove(m.id as string)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">{String(m.status).replace("_", " ")}</Badge>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Visible</span>
                      <Switch
                        checked={Boolean(m.is_visible)}
                        onCheckedChange={(v) => toggleVisible(m.id as string, v)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{form.id ? "Edit machine" : "New machine"}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Series</Label><Input value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} placeholder="S-Series" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-2">
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
                <Button variant="outline" size="icon" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </label>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (UGX)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Reward (UGX)</Label><Input type="number" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} /></div>
              <div><Label>Duration (hours)</Label><Input type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} /></div>
              <div><Label>Display order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              <div><Label>Max per user (0 = ∞)</Label><Input type="number" value={form.max_per_user} onChange={(e) => setForm({ ...form, max_per_user: e.target.value })} /></div>
              <div><Label>Max total (0 = ∞)</Label><Input type="number" value={form.max_total} onChange={(e) => setForm({ ...form, max_total: e.target.value })} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MachineStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  <SelectItem value="sold_out">Sold Out</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Visible to users</Label>
              <Switch checked={form.is_visible} onCheckedChange={(v) => setForm({ ...form, is_visible: v })} />
            </div>
          </div>
          <SheetFooter className="mt-5">
            <Button onClick={save} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save machine
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
