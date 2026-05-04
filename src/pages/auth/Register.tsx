import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { Loader2, Phone, Lock, User, Users, Mail } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const { data: settings, isLoading: settingsLoading } = usePlatformSettings();

  const [formData, setFormData] = useState({
    fullName: "", phone: "", email: "", password: "", confirmPassword: "", referralCode,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const registrationFee = settings?.registration_fee ? Number(settings.registration_fee) : 5000;

  const formatPhoneForEmail = (phone: string) => `${phone.replace(/\D/g, "")}@flexiearn.ug`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (formData.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setIsLoading(true);
    try {
      const email = formatPhoneForEmail(formData.phone);
      const cleanedPhone = formData.phone.replace(/\D/g, "");

      let referrerId: string | null = null;
      if (formData.referralCode) {
        const { data: refId, error: refErr } = await supabase.rpc("find_referrer_by_code" as any, { _code: formData.referralCode.trim() });
        if (refErr || !refId) { toast.error("Invalid referral code"); setIsLoading(false); return; }
        referrerId = refId as unknown as string;
      }

      const trimmedEmail = formData.email.trim().toLowerCase();
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        toast.error("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email, password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            phone: cleanedPhone,
            full_name: formData.fullName,
            recovery_email: trimmedEmail || null,
          },
        },
      });

      if (error) { toast.error(error.message.includes("already registered") ? "This phone number is already registered" : error.message); return; }
      if (data.user) {
        const updates: any = {};
        if (referrerId) updates.referred_by = referrerId;
        if (trimmedEmail) updates.email = trimmedEmail;
        if (Object.keys(updates).length) {
          await supabase.from("profiles").update(updates).eq("user_id", data.user.id);
        }
        // Store device fingerprint
        const fp = generateFingerprint();
        await supabase.from("profiles").update({ device_fingerprint: fp } as any).eq("user_id", data.user.id);
      }

      toast.success("Registration successful! Welcome to FlexiEarn.");
      setShowLoading(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch { toast.error("An error occurred. Please try again."); }
    finally { setIsLoading(false); }
  };

  if (showLoading) return <LoadingScreen />;

  if (settingsLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Animated background shapes */}
      <div className="absolute inset-0 gradient-hero opacity-[0.06]" />
      <div className="absolute top-10 -right-24 h-80 w-80 rounded-full bg-primary/25 blur-3xl animate-pulse" />
      <div className="absolute bottom-10 -left-24 h-80 w-80 rounded-full bg-secondary/30 blur-3xl animate-pulse [animation-delay:1.5s]" />
      <div className="absolute top-1/2 left-1/3 h-44 w-44 rounded-full bg-accent/20 blur-3xl animate-pulse [animation-delay:0.7s]" />
      <div className="absolute bottom-1/3 right-1/4 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
      {/* Geometric accents */}
      <div className="absolute top-12 left-8 h-16 w-16 rotate-12 rounded-2xl border-2 border-primary/30 hidden sm:block animate-pulse" />
      <div className="absolute bottom-16 right-10 h-20 w-20 -rotate-6 rounded-full border-2 border-secondary/40 hidden sm:block" />
      <div className="absolute top-1/3 right-12 h-10 w-10 rotate-45 bg-primary/15 rounded-md hidden md:block" />
      <div className="absolute top-1/4 right-1/3 h-6 w-6 rotate-12 rounded bg-secondary/30 hidden md:block" />
      <div className="absolute bottom-1/4 left-1/3 h-8 w-8 -rotate-12 rounded-full border border-accent/40 hidden md:block" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <Card className="relative w-full max-w-md border-border/50 shadow-2xl glass-card">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-4"><PlatformLogo size="lg" /></div>
          <CardTitle className="text-2xl font-bold text-gradient-primary">Join FlexiEarn</CardTitle>
          <CardDescription>Start earning money by completing simple tasks</CardDescription>
          <div className="rounded-xl bg-primary/10 p-2.5 mt-2">
            <p className="text-sm font-semibold">
              One-time activation fee: <span className="text-primary">UGX {registrationFee.toLocaleString()}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3.5">
            {[
              { name: "fullName", label: "Full Name", icon: User, type: "text", placeholder: "Enter your full name", required: true },
              { name: "phone", label: "Phone Number", icon: Phone, type: "tel", placeholder: "0700123456", required: true },
              { name: "email", label: "Email Address (Optional)", icon: Mail, type: "email", placeholder: "you@example.com", required: false },
              { name: "password", label: "Password", icon: Lock, type: "password", placeholder: "Create a password", required: true },
              { name: "confirmPassword", label: "Confirm Password", icon: Lock, type: "password", placeholder: "Confirm your password", required: true },
            ].map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-sm font-medium">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input name={field.name} type={field.type} placeholder={field.placeholder} value={formData[field.name as keyof typeof formData]} onChange={handleChange} className="pl-10 h-11" required={field.required} />
                </div>
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Referral Code (Optional)</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input name="referralCode" placeholder="Enter referral code" value={formData.referralCode} onChange={handleChange} className="pl-10 h-11 uppercase" />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold gradient-primary border-0 text-primary-foreground hover:opacity-90" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</> : "Create Account"}
            </Button>
          </form>
          <div className="mt-5 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="font-semibold text-primary hover:underline">Log In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function generateFingerprint(): string {
  const raw = [
    navigator.userAgent, screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}
