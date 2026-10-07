import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformLogo } from "@/components/PlatformLogo";
import { SecurityBadge } from "@/components/SecurityBadge";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Checkbox } from "@/components/ui/checkbox";
import { SupportDialog } from "@/components/user/SupportDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import { Loader2, Phone, Lock, ShieldAlert, Mail, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your phone number or email").max(255),
  password: z.string().min(1, "Enter your password").max(128),
});

export default function Login() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [blockedStatus, setBlockedStatus] = useState<{ status: string } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const formatPhoneForEmail = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `${cleaned}@flexiearn.ug`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginMode === "phone" ? phone : email;
    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      setFieldError(validation.error.issues[0]?.message ?? "Check your details and try again");
      return;
    }
    if (loginMode === "phone" && phone.replace(/\D/g, "").length < 10) {
      setFieldError("Enter a valid 10-digit Ugandan phone number");
      return;
    }
    setFieldError(null);
    setIsLoading(true);
    setBlockedStatus(null);

    try {
      const loginEmail = loginMode === "phone" ? formatPhoneForEmail(phone) : email;
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

      if (error) {
        toast.error(error.message.includes("Invalid login credentials") ? "Invalid credentials" : error.message);
        return;
      }

      if (authData.user) {
        // Fast blocking check: only fetch status + admin role in parallel.
        const [{ data: profile }, { data: adminRole }] = await Promise.all([
          supabase.from("profiles").select("status").eq("user_id", authData.user.id).single(),
          supabase.from("user_roles").select("role").eq("user_id", authData.user.id).eq("role", "admin").maybeSingle(),
        ]);
        const isAdminUser = !!adminRole;

        if (!isAdminUser && profile && (profile.status === "blocked" || profile.status === "suspended")) {
          await supabase.auth.signOut();
          setBlockedStatus({ status: profile.status });
          return;
        }

        // BACKGROUND (non-blocking): fingerprint, dupe check, audit log.
        const fp = generateFingerprint();
        void runBackgroundSecurity(authData.user.id, fp, isAdminUser);
      }

      setShowLoading(true);
      if (!rememberDevice) sessionStorage.setItem("flexiearn_session_only", "true");
      else sessionStorage.removeItem("flexiearn_session_only");
      toast.success("Welcome back!");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const runBackgroundSecurity = async (userId: string, fp: string, isAdminUser: boolean) => {
    try {
      const auditPromise = supabase.functions.invoke("record-login-audit", {
        body: { event_type: "login", device_fingerprint: fp },
      });
      await supabase.from("profiles").update({ device_fingerprint: fp } as any).eq("user_id", userId);
      await auditPromise;

      if (!isAdminUser) {
        const { data: dupes } = await supabase
          .from("profiles").select("user_id").eq("device_fingerprint", fp)
          .neq("user_id", userId).in("status", ["active", "pending"]);
        const nonAdminDupes: { user_id: string }[] = [];
        for (const d of dupes ?? []) {
          const { data: r } = await supabase
            .from("user_roles").select("role").eq("user_id", d.user_id).eq("role", "admin").maybeSingle();
          if (!r) nonAdminDupes.push(d);
        }
        if (nonAdminDupes.length > 0) {
          await supabase.from("profiles").update({ status: "suspended" } as any).eq("user_id", userId);
          for (const dupe of nonAdminDupes) {
            await supabase.from("profiles").update({ status: "suspended" } as any).eq("user_id", dupe.user_id);
          }
          await supabase.auth.signOut();
          window.location.href = "/login";
        }
      }
    } catch (e) {
      console.error("Background security check failed:", e);
    }
  };

  if (showLoading) return <LoadingScreen />;

  if (blockedStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/5 p-4">
        <Card className="w-full max-w-md border-destructive/20 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2"><PlatformLogo size="lg" /></div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Account {blockedStatus.status === "blocked" ? "Blocked" : "Suspended"}
            </CardTitle>
            <CardDescription className="text-base">
              {blockedStatus.status === "blocked"
                ? "Your account has been permanently blocked due to a violation of our terms of service."
                : "Your account has been temporarily suspended. Please contact support for more information."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => setSupportOpen(true)}>
              Contact Support
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setBlockedStatus(null)}>Back to Login</Button>
          </CardContent>
        </Card>
        <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
      </div>
    );
  }

  return (
    <AuthPageShell mode="login" title="Welcome back" description="Log in securely to continue earning, investing, and managing your wallet.">
      <SEO title="Log In" description="Sign in to your FlexiEarn Uganda account to check earnings, complete tasks and withdraw to Mobile Money." path="/login" />
          <Tabs value={loginMode} onValueChange={(v) => setLoginMode(v as "phone" | "email")} className="mb-4">
            <TabsList className="grid h-11 w-full grid-cols-2 bg-background/50">
              <TabsTrigger value="phone" className="gap-1.5"><Phone className="h-3.5 w-3.5" />Phone</TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
            </TabsList>
          </Tabs>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginMode === "phone" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" inputMode="numeric" maxLength={13} placeholder="0700 123 456" value={phone} onChange={(e) => { setPhone(e.target.value); setFieldError(null); }} className="h-12 bg-background/60 pl-10" required />
                </div>
                <p className="text-xs text-muted-foreground">Use the MTN or Airtel number linked to your account.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="email" maxLength={255} placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setFieldError(null); }} className="h-12 bg-background/60 pl-10" required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldError(null); }}
                  maxLength={128}
                  className="h-12 bg-background/60 pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1.5 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {fieldError && <p role="alert" className="text-sm font-medium text-destructive">{fieldError}</p>}
            <div className="flex items-center justify-between gap-3 -mt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={rememberDevice} onCheckedChange={(checked) => setRememberDevice(checked === true)} />
                Remember this device
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="h-12 w-full border-0 gradient-primary font-semibold text-primary-foreground hover:opacity-90" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in...</> : "Log In"}
            </Button>
          </form>
          <SecurityBadge variant="encrypted" className="mt-5 border-primary/30 bg-primary/10" />
    </AuthPageShell>
  );
}

function generateFingerprint(): string {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}
