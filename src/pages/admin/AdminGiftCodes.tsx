import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Gift, Copy, Loader2, Trash2 } from "lucide-react";

interface GiftCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Redemption {
  id: string;
  gift_code_id: string;
  user_id: string;
  amount: number;
  redeemed_at: string;
  code?: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

const randomCode = () =>
  "GIFT-" + Math.random().toString(36).slice(2, 8).toUpperCase();

export default function AdminGiftCodes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState(randomCode());
  const [amount, setAmount] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");

  const { data: codes, isLoading } = useQuery({
    queryKey: ["gift-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_codes" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as GiftCode[];
    },
  });

  const { data: redemptions, isLoading: redLoading } = useQuery({
    queryKey: ["gift-redemptions"],
    queryFn: async () => {
      const { data: reds, error } = await supabase
        .from("gift_code_redemptions" as any)
        .select("*")
        .order("redeemed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const list = (reds || []) as any[];
      const codeIds = [...new Set(list.map((r) => r.gift_code_id))];
      const userIds = [...new Set(list.map((r) => r.user_id))];
      const [{ data: gcs }, { data: profs }] = await Promise.all([
        supabase.from("gift_codes" as any).select("id, code").in("id", codeIds.length ? codeIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const codeMap = new Map((gcs as any[] || []).map((g) => [g.id, g.code]));
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return list.map((r) => ({
        ...r,
        code: codeMap.get(r.gift_code_id),
        full_name: profMap.get(r.user_id)?.full_name,
        phone: profMap.get(r.user_id)?.phone,
        email: profMap.get(r.user_id)?.email,
      })) as Redemption[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      const uses = Number(maxUses);
      if (!code.trim() || isNaN(amt) || amt <= 0 || isNaN(uses) || uses <= 0)
        throw new Error("Fill all fields with valid values");
      const { error } = await supabase.from("gift_codes" as any).insert({
        code: code.trim().toUpperCase(),
        amount: amt,
        max_uses: uses,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gift code created");
      setCode(randomCode());
      setAmount("");
      setMaxUses("1");
      setExpiresAt("");
      qc.invalidateQueries({ queryKey: ["gift-codes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("gift_codes" as any).update({ is_active: active } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["gift-codes"] });
  };

  const deleteCode = async (id: string) => {
    await supabase.from("gift_codes" as any).delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["gift-codes"] });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Code copied");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" /> Gift Codes
          </h1>
          <p className="text-muted-foreground">Create promotional codes that reward users</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create New Code</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="uppercase" />
                <Button type="button" variant="outline" onClick={() => setCode(randomCode())}>Random</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reward Amount (UGX)</Label>
              <Input type="number" placeholder="e.g. 1000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Number of Users</Label>
              <Input type="number" min={1} placeholder="How many people can redeem" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button className="w-full gradient-primary border-0 text-primary-foreground" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Gift Code"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">All Gift Codes</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold">
                        <div className="flex items-center gap-2">
                          {c.code}
                          <Button size="icon" variant="ghost" onClick={() => copy(c.code)}><Copy className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>UGX {Number(c.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={c.uses_count >= c.max_uses ? "destructive" : "secondary"}>
                          {c.uses_count}/{c.max_uses}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell>
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteCode(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {codes?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No gift codes yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
