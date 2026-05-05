import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: Props) {
  const { profile, refreshProfile } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", password: "", confirmPassword: "",
  });

  useEffect(() => {
    if (open && profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        password: "",
        confirmPassword: "",
      });
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match"); return;
    }
    if (form.password && form.password.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }

    setLoading(true);
    try {
      const payload: any = {};
      if (form.full_name !== (profile?.full_name || "")) payload.full_name = form.full_name;
      if (form.phone.replace(/\D/g, "") !== (profile?.phone || "")) payload.phone = form.phone;
      if (form.email !== (profile?.email || "")) payload.email = form.email;
      if (form.password) payload.password = form.password;

      if (Object.keys(payload).length === 0) {
        toast.info("Nothing to update");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("update-account", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Profile updated successfully");
      if (refreshProfile) await refreshProfile();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your account information</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0700123456" />
            <p className="text-xs text-muted-foreground">Changing phone updates your login identifier</p>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>New Password (optional)</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current" />
          </div>
          {form.password && (
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            </div>
          )}
          <Button className="w-full gradient-primary border-0 text-primary-foreground" onClick={handleSave} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
