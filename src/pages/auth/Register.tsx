import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { toast } from "sonner";
import { Loader2, Phone, Lock, User, Users } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const { data: settings, isLoading: settingsLoading } = usePlatformSettings();

  const [formData, setFormData] = useState({
    fullName: "", phone: "", password: "", confirmPassword: "", referralCode,
  });
  const [isLoading, setIsLoading] = useState(false);

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

      let referrerId = null;
      if (formData.referralCode) {
        const { data: referrer } = await supabase.from("profiles").select("id").eq("referral_code", formData.referralCode.toUpperCase()).single();
        if (referrer) { referrerId = referrer.id; } else { toast.error("Invalid referral code"); setIsLoading(false); return; }
      }

      const { data, error } = await supabase.auth.signUp({
        email, password: formData.password,
        options: { emailRedirectTo: window.location.origin, data: { phone: cleanedPhone, full_name: formData.fullName } },
      });

      if (error) { toast.error(error.message.includes("already registered") ? "This phone number is already registered" : error.message); return; }
      if (data.user && referrerId) { await supabase.from("profiles").update({ referred_by: referrerId }).eq("user_id", data.user.id); }

      toast.success("Registration successful! Welcome to FlexiEarn.");
      navigate("/dashboard");
    } catch { toast.error("An error occurred. Please try again."); }
    finally { setIsLoading(false); }
  };

  if (settingsLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-[0.06]" />
      <div className="absolute top-10 -right-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute bottom-10 -left-20 h-56 w-56 rounded-full bg-secondary/15 blur-3xl" />
      <Card className="relative w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-4"><PlatformLogo size="lg" /></div>
          <CardTitle className="text-2xl font-bold">Join FlexiEarn</CardTitle>
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
              { name: "fullName", label: "Full Name", icon: User, type: "text", placeholder: "Enter your full name" },
              { name: "phone", label: "Phone Number", icon: Phone, type: "tel", placeholder: "0700123456" },
              { name: "password", label: "Password", icon: Lock, type: "password", placeholder: "Create a password" },
              { name: "confirmPassword", label: "Confirm Password", icon: Lock, type: "password", placeholder: "Confirm your password" },
            ].map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-sm font-medium">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input name={field.name} type={field.type} placeholder={field.placeholder} value={formData[field.name as keyof typeof formData]} onChange={handleChange} className="pl-10 h-11" required />
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
