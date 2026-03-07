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
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid phone number or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Check user profile status
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("user_id", authData.user.id)
          .single();

        if (profile && (profile.status === "blocked" || profile.status === "suspended")) {
          // Fetch WhatsApp support number
          const { data: settings } = await supabase
            .from("platform_settings")
            .select("setting_value")
            .eq("setting_key", "support_whatsapp")
            .single();

          // Sign out the blocked user
          await supabase.auth.signOut();

          setBlockedStatus({
            status: profile.status,
            whatsapp: settings?.setting_value || "",
          });
          return;
        }
      }

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openWhatsApp = (number: string) => {
    const cleaned = number.replace(/\D/g, "");
    window.open(
      `https://wa.me/${cleaned}?text=${encodeURIComponent("Hello, I need help with my FlexiEarn account.")}`,
      "_blank"
    );
  };

  // Show blocked/suspended screen
  if (blockedStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-destructive/10 via-background to-destructive/5 p-4">
        <Card className="w-full max-w-md border-2 border-destructive/30 shadow-xl">
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
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                onClick={() => openWhatsApp(blockedStatus.whatsapp)}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Contact Support via WhatsApp
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setBlockedStatus(null)}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <PlatformLogo size="lg" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Log in to continue earning with FlexiEarn Uganda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="0700123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-semibold"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register Now
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-primary">
              Admin Login →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
