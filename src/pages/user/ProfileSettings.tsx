import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { detectNetwork, NETWORK_LABEL, type NetworkProvider } from "@/lib/network";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    network_provider: "" as "" | NetworkProvider,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        password: "",
        confirmPassword: "",
        network_provider: (profile.network_provider as NetworkProvider) || "",
      });
    }
  }, [profile]);

  const autoNetwork = detectNetwork(form.phone);

  const handleSave = async () => {
    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {};
      if (form.full_name !== (profile?.full_name || "")) payload.full_name = form.full_name;
      if (form.phone.replace(/\D/g, "") !== (profile?.phone || "")) payload.phone = form.phone;
      if (form.email !== (profile?.email || "")) payload.email = form.email;
      if (form.password) payload.password = form.password;

      const desiredNetwork = form.network_provider || null;
      const currentNetwork = profile?.network_provider || null;
      const networkChanged = desiredNetwork !== currentNetwork;

      if (Object.keys(payload).length === 0 && !networkChanged) {
        toast.info("Nothing to update");
        setLoading(false);
        return;
      }

      if (Object.keys(payload).length > 0) {
        const { data, error } = await supabase.functions.invoke("update-account", { body: payload });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      if (networkChanged && profile?.user_id) {
        await supabase
          .from("profiles")
          .update({ network_provider: desiredNetwork } as any)
          .eq("user_id", profile.user_id);
      }

      toast.success("Profile updated successfully");
      if (refreshProfile) await refreshProfile();
      navigate("/profile");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeaturePage title="Profile Settings" description="Update your account information" backTo="/profile">
      <Card className="glass-card border-0">
        <CardContent className="space-y-4 py-5">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input
              className="h-11"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input
              className="h-11"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0700123456"
            />
            <p className="text-xs text-muted-foreground">Changing phone updates your login identifier</p>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              className="h-11"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>New Password (optional)</Label>
            <Input
              className="h-11"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />
          </div>
          {form.password && (
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input
                className="h-11"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Mobile Network</Label>
            <div className="flex flex-wrap gap-2">
              {(["", "mtn", "airtel", "utl", "lycamobile"] as const).map((opt) => {
                const active = form.network_provider === opt;
                const label = opt === "" ? `Auto (${NETWORK_LABEL[autoNetwork]})` : NETWORK_LABEL[opt];
                return (
                  <button
                    key={opt || "auto"}
                    type="button"
                    onClick={() => setForm({ ...form, network_provider: opt })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Auto-detected from your phone number. Choose to override.</p>
          </div>
        </CardContent>
      </Card>

      <Button
        className="h-12 w-full gradient-primary rounded-xl border-0 font-semibold text-primary-foreground"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </FeaturePage>
  );
}
