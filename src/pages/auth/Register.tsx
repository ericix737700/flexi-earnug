import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { SecurityBadge } from "@/components/SecurityBadge";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import { Loader2, Phone, Lock, User, Users, Mail, Eye, EyeOff } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PasswordStrength, evaluatePassword } from "@/components/PasswordStrength";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().regex(/^\d{10,12}$/, "Enter a valid 10-digit Ugandan phone number"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must contain at least 8 characters").max(128),
});

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [referrer, setReferrer] = useState<{ full_name: string | null; account_id: string | null; is_verified: boolean } | null>(null);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Look up the referrer so the invited user sees who referred them.
  useEffect(() => {
    const code = formData.referralCode.trim();
    if (!code) { setReferrer(null); return; }
    let cancelled = false;
    setReferrerLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("get_referrer_preview" as any, { _code: code });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      setReferrer(error || !row ? null : (row as any));
      setReferrerLoading(false);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); setReferrerLoading(false); };
  }, [formData.referralCode]);

  const registrationFee = settings?.registration_fee ? Number(settings.registration_fee) : 5000;

  const formatPhoneForEmail = (phone: string) => `${phone.replace(/\D/g, "")}@flexiearn.ug`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = registerSchema.safeParse({ ...formData, phone: formData.phone.replace(/\D/g, "") });
    if (!validation.success) { setFieldError(validation.error.issues[0]?.message ?? "Check your details"); return; }
    if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }
    const { passed, total } = evaluatePassword(formData.password);
    if (passed < total - 1) {
      toast.error("Password is too weak. Please meet at least 4 of the 5 rules.");
      return;
    }
    const trimmedEmail = formData.email.trim().toLowerCase();
    if (!trimmedEmail) { toast.error("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error("Please enter a valid email address"); return; }
    if (!acceptedTerms) { setFieldError("Agree to the Terms and Privacy Policy to continue"); return; }
    setFieldError(null);

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
        // Fire off profile update + audit in background — don't block navigation.
        const fp = generateFingerprint();
        const updates: any = { device_fingerprint: fp };
        if (referrerId) updates.referred_by = referrerId;
        if (trimmedEmail) updates.email = trimmedEmail;
        void supabase.from("profiles").update(updates).eq("user_id", data.user.id);
        void supabase.functions.invoke("record-login-audit", {
          body: { event_type: "signup", device_fingerprint: fp },
        });
      }

      toast.success("Registration successful! Welcome to FlexiEarn.");
      setShowLoading(true);
      setTimeout(() => navigate("/dashboard"), 800);
    } catch { toast.error("An error occurred. Please try again."); }
    finally { setIsLoading(false); }
  };

  if (showLoading) return <LoadingScreen />;

  if (settingsLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <AuthPageShell mode="register" title="Create your account" description="Join FlexiEarn with your Ugandan phone number and start your earning journey.">
      <SEO title="Create Account" description="Register on FlexiEarn Uganda in seconds. Start earning through tasks, referrals and gift codes paid via Mobile Money." path="/register" />
          <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-secondary/30 bg-secondary/10 p-3">
            <div><p className="text-xs text-muted-foreground">One-time activation</p><p className="font-bold text-secondary">UGX {registrationFee.toLocaleString()}</p></div>
            <div className="text-right"><p className="text-xs text-muted-foreground">Supported networks</p><p className="text-sm font-bold">MTN · Airtel</p></div>
          </div>
          <form onSubmit={handleRegister} className="space-y-3.5">
            {[
              { name: "fullName", label: "Full Name", icon: User, type: "text", placeholder: "Enter your full name", required: true },
              { name: "phone", label: "Phone Number", icon: Phone, type: "tel", placeholder: "0700123456", required: true },
              { name: "email", label: "Email Address", icon: Mail, type: "email", placeholder: "you@example.com", required: true },
            ].map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-sm font-medium">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input name={field.name} type={field.type} maxLength={field.name === "fullName" ? 100 : field.name === "email" ? 255 : 13} inputMode={field.name === "phone" ? "numeric" : undefined} placeholder={field.placeholder} value={formData[field.name as keyof typeof formData]} onChange={(event) => { handleChange(event); setFieldError(null); }} className="h-11 bg-background/60 pl-10" required={field.required} />
                </div>
              </div>
            ))}
            {([
              { name: "password", label: "Password", placeholder: "Create a password", show: showPassword, toggle: () => setShowPassword(v => !v) },
              { name: "confirmPassword", label: "Confirm Password", placeholder: "Confirm your password", show: showConfirm, toggle: () => setShowConfirm(v => !v) },
            ] as const).map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-sm font-medium">{field.label}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    name={field.name}
                    type={field.show ? "text" : "password"}
                    placeholder={field.placeholder}
                    value={formData[field.name as keyof typeof formData]}
                    onChange={handleChange}
                    className="pl-10 pr-10 h-11"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={field.toggle}
                    className="absolute right-1 top-1 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                    aria-label={field.show ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {field.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {field.name === "password" && (
                  <div className="pt-1">
                    <PasswordStrength password={formData.password} />
                  </div>
                )}
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Referral Code (Optional)</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input name="referralCode" placeholder="Enter referral code" value={formData.referralCode} onChange={handleChange} className="pl-10 h-11 uppercase" />
              </div>
              {formData.referralCode.trim() && (
                referrerLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking referral code…
                  </div>
                ) : referrer ? (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {(referrer.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold flex items-center gap-1.5">
                        {referrer.full_name || "FlexiEarn Member"}
                        {referrer.is_verified && <VerifiedBadge size="sm" label="Verified account" />}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Referral ID: <span className="font-mono">{referrer.account_id || formData.referralCode.trim().toUpperCase()}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-primary">Referred you</span>
                  </div>
                ) : (
                  <p className="text-xs text-destructive">We couldn't find that referral code.</p>
                )
              )}
            </div>
            {fieldError && <p role="alert" className="text-sm font-medium text-destructive">{fieldError}</p>}
            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <Checkbox className="mt-0.5" checked={acceptedTerms} onCheckedChange={(checked) => { setAcceptedTerms(checked === true); setFieldError(null); }} />
              <span>I agree to the <Link to="/terms" className="font-semibold text-primary hover:underline">Terms &amp; Conditions</Link> and <Link to="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.</span>
            </label>
            <Button type="submit" className="w-full h-11 font-semibold gradient-primary border-0 text-primary-foreground hover:opacity-90" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</> : "Create Account"}
            </Button>
          </form>
          <SecurityBadge variant="encrypted" className="mt-5 border-primary/30 bg-primary/10" />
    </AuthPageShell>
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
