import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { SecurityBadge } from "@/components/SecurityBadge";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
      toast.success("Reset link sent. Check your inbox.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <SEO title="Forgot Password" description="Reset your FlexiEarn Uganda account password via email." path="/forgot-password" />
      <div className="absolute top-10 -right-24 h-80 w-80 rounded-full bg-primary/25 blur-3xl animate-pulse" />
      <div className="absolute bottom-10 -left-24 h-80 w-80 rounded-full bg-secondary/30 blur-3xl animate-pulse [animation-delay:1.5s]" />

      <Card className="relative w-full max-w-md border-border/50 shadow-2xl glass-card">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-4"><PlatformLogo size="lg" /></div>
          <CardTitle className="text-2xl font-bold text-gradient-primary">
            {sent ? "Check your email" : "Reset your password"}
          </CardTitle>
          <CardDescription>
            {sent
              ? "We've sent a password reset link to your email. It may take a minute to arrive."
              : "Enter the email associated with your account and we'll send a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">
                Sent to <span className="font-medium text-foreground">{email}</span>
              </p>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => { setSent(false); setEmail(""); }}
              >
                Use a different email
              </Button>
              <Button
                className="w-full h-11 gradient-primary border-0 text-primary-foreground hover:opacity-90"
                onClick={() => navigate("/login")}
              >
                Back to login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the recovery email you set on your account.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-semibold gradient-primary border-0 text-primary-foreground hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

          <div className="mt-5 text-center text-sm">
            <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to login
            </Link>
          </div>
          <SecurityBadge variant="encrypted" className="mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
