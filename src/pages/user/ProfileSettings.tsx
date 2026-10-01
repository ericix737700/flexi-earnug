import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { detectNetwork, NETWORK_LABEL, type NetworkProvider } from "@/lib/network";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth() as any;
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
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

  const pinStatus = useQuery({
    queryKey: ["fe-pin-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("withdrawal-security", { body: { action: "status" } });
      if (error) throw error;
      return Boolean(data?.configured);
    },
  });

  const savePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("FE PIN must contain exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New FE PINs do not match");
      return;
    }
    if (pinStatus.data && currentPin.length !== 4) {
      toast.error("Enter your current FE PIN");
      return;
    }
    setPinLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("withdrawal-security", {
        body: { action: "set_pin", pin: newPin, ...(pinStatus.data ? { current_pin: currentPin } : {}) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await queryClient.invalidateQueries({ queryKey: ["fe-pin-status"] });
      toast.success(pinStatus.data ? "FE PIN changed securely" : "FE PIN created securely");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save FE PIN");
    } finally {
      setPinLoading(false);
    }
  };

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

      <Card id="fe-pin" className="border shadow-sm scroll-mt-5">
        <CardContent className="space-y-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <LockKeyhole className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">Security & FE PIN</h2>
                {pinStatus.data && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"><ShieldCheck className="h-3 w-3" />Protected</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Your private 4-digit FlexiEarn PIN authorizes withdrawals. Never share it with anyone.</p>
            </div>
          </div>

          {pinStatus.isLoading ? <div className="h-14 animate-pulse rounded-xl bg-muted" /> : (
            <div className="space-y-4">
              {pinStatus.data && (
                <PinField label="Current FE PIN" value={currentPin} onChange={setCurrentPin} />
              )}
              <PinField label={pinStatus.data ? "New FE PIN" : "Create FE PIN"} value={newPin} onChange={setNewPin} />
              <PinField label="Confirm new FE PIN" value={confirmPin} onChange={setConfirmPin} />
              <Button type="button" variant="outline" className="h-12 w-full rounded-xl font-semibold" onClick={savePin} disabled={pinLoading}>
                {pinLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving securely…</> : pinStatus.data ? "Change FE PIN" : "Set FE PIN"}
              </Button>
            </div>
          )}
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

function PinField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <InputOTP maxLength={4} value={value} onChange={onChange} inputMode="numeric">
        <InputOTPGroup className="gap-2">
          {[0, 1, 2, 3].map((index) => (
            <InputOTPSlot key={index} index={index} className="h-12 w-12 rounded-lg border bg-background text-lg font-bold first:rounded-lg first:border last:rounded-lg" />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
