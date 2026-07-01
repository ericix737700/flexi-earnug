import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformLogo } from "@/components/PlatformLogo";
import { SecurityBadge } from "@/components/SecurityBadge";
import { SupportDialog } from "@/components/user/SupportDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import { Loader2, Phone, Lock, ShieldAlert, Mail, Eye, EyeOff } from "lucide-react";

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

  const formatPhoneForEmail = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `${cleaned}@flexiearn.ug`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
        // Generate and store device fingerprint
        const fp = generateFingerprint();
        const { data: profile } = await supabase.from("profiles").select("status, device_fingerprint").eq("user_id", authData.user.id).single();

        // Check admin role — admins bypass all status/fingerprint checks
        const { data: adminRole } = await supabase
          .from("user_roles").select("role").eq("user_id", authData.user.id).eq("role", "admin").maybeSingle();
        const isAdminUser = !!adminRole;

        if (!isAdminUser && profile && (profile.status === "blocked" || profile.status === "suspended")) {
          await supabase.auth.signOut();
          setBlockedStatus({ status: profile.status });
          return;
        }

        // Store fingerprint
        await supabase.from("profiles").update({ device_fingerprint: fp } as any).eq("user_id", authData.user.id);

        if (!isAdminUser) {
          // Check for duplicate fingerprint (multi-account detection) — skip admins
          const { data: dupes } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("device_fingerprint", fp)
            .neq("user_id", authData.user.id)
            .in("status", ["active", "pending"]);

          // Filter out admins from dupes so they can't be suspended
          const nonAdminDupes: { user_id: string }[] = [];
          for (const d of dupes ?? []) {
            const { data: r } = await supabase
              .from("user_roles").select("role").eq("user_id", d.user_id).eq("role", "admin").maybeSingle();
            if (!r) nonAdminDupes.push(d);
          }

          if (nonAdminDupes.length > 0) {
            await supabase.from("profiles").update({ status: "suspended" } as any).eq("user_id", authData.user.id);
            for (const dupe of nonAdminDupes) {
              await supabase.from("profiles").update({ status: "suspended" } as any).eq("user_id", dupe.user_id);
            }
            await supabase.auth.signOut();
            toast.error("Multiple accounts detected on this device. Your accounts have been suspended.");
            setBlockedStatus({ status: "suspended" });
            return;
          }
        }
      }


      setShowLoading(true);
      toast.success("Welcome back!");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
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
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-secondary/10 via-background to-primary/5">
      {/* Animated background blobs */}
      <div className="absolute inset-0 gradient-hero opacity-[0.06]" />
      <div className="absolute top-20 -left-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl animate-pulse" />
      <div className="absolute bottom-20 -right-24 h-80 w-80 rounded-full bg-secondary/30 blur-3xl animate-pulse [animation-delay:1.5s]" />
      <div className="absolute top-1/3 right-1/4 h-44 w-44 rounded-full bg-accent/20 blur-3xl animate-pulse [animation-delay:0.7s]" />
      <div className="absolute bottom-1/4 left-1/4 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
      {/* Geometric accents */}
      <div className="absolute top-16 right-10 h-16 w-16 -rotate-12 rounded-2xl border-2 border-primary/30 hidden sm:block animate-pulse" />
      <div className="absolute bottom-20 left-10 h-20 w-20 rotate-6 rounded-full border-2 border-secondary/40 hidden sm:block" />
      <div className="absolute top-1/2 left-12 h-10 w-10 -rotate-45 bg-primary/15 rounded-md hidden md:block" />
      <div className="absolute top-1/4 left-1/3 h-6 w-6 rotate-12 rounded bg-secondary/30 hidden md:block" />
      <div className="absolute bottom-1/3 right-1/3 h-8 w-8 -rotate-12 rounded-full border border-accent/40 hidden md:block" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <Card className="relative w-full max-w-md border-border/50 shadow-2xl glass-card">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-4"><PlatformLogo size="lg" /></div>
          <CardTitle className="text-2xl font-bold text-gradient-primary">Welcome Back</CardTitle>
          <CardDescription>Log in to continue earning with FlexiEarn</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMode} onValueChange={(v) => setLoginMode(v as "phone" | "email")} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
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
                  <Input type="tel" placeholder="0700123456" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-11" required />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required />
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end -mt-1">
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold gradient-primary border-0 text-primary-foreground hover:opacity-90" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in...</> : "Log In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="font-semibold text-primary hover:underline">Register Now</Link>
          </div>
          <SecurityBadge variant="encrypted" className="mt-4" />
        </CardContent>
      </Card>
    </div>
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
