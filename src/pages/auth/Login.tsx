import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { toast } from "sonner";
import { Loader2, Phone, Lock, ShieldAlert, MessageCircle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blockedStatus, setBlockedStatus] = useState<{ status: string; whatsapp: string } | null>(null);

  const formatPhoneForEmail = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `${cleaned}@flexiearn.ug`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setBlockedStatus(null);

    try {
      const email = formatPhoneForEmail(phone);
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(error.message.includes("Invalid login credentials") ? "Invalid phone number or password" : error.message);
        return;
      }

      if (authData.user) {
        const { data: profile } = await supabase.from("profiles").select("status").eq("user_id", authData.user.id).single();
        if (profile && (profile.status === "blocked" || profile.status === "suspended")) {
          const { data: settings } = await supabase.from("platform_settings").select("setting_value").eq("setting_key", "support_whatsapp").single();
          await supabase.auth.signOut();
          setBlockedStatus({ status: profile.status, whatsapp: settings?.setting_value || "" });
          return;
        }
      }

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openWhatsApp = (number: string) => {
    const cleaned = number.replace(/\D/g, "");
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent("Hello, I need help with my FlexiEarn account.")}`, "_blank");
  };

  if (blockedStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/5 p-4">
        <Card className="w-full max-w-md border-destructive/20 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
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
            {blockedStatus.whatsapp && (
              <Button className="w-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-primary-foreground" size="lg" onClick={() => openWhatsApp(blockedStatus.whatsapp)}>
                <MessageCircle className="mr-2 h-5 w-5" />
                Contact Support via WhatsApp
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setBlockedStatus(null)}>Back to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-[0.06]" />
      <div className="absolute top-20 -left-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute bottom-20 -right-20 h-56 w-56 rounded-full bg-secondary/15 blur-3xl" />
      <Card className="relative w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-4">
            <PlatformLogo size="lg" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Log in to continue earning with FlexiEarn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="tel" placeholder="0700123456" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-11" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold gradient-primary border-0 text-primary-foreground hover:opacity-90" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in...</> : "Log In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="font-semibold text-primary hover:underline">Register Now</Link>
          </div>
          <div className="mt-3 text-center">
            <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">Admin Login →</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
