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
    fullName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: referralCode,
  });
  const [isLoading, setIsLoading] = useState(false);

  const registrationFee = settings?.registration_fee
    ? Number(settings.registration_fee)
    : 5000;

  const formatPhoneForEmail = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `${cleaned}@flexiearn.ug`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const email = formatPhoneForEmail(formData.phone);
      const cleanedPhone = formData.phone.replace(/\D/g, "");

      // Check if referral code exists
      let referrerId = null;
      if (formData.referralCode) {
        const { data: referrer } = await supabase
          .from("profiles")
          .select("id")
          .eq("referral_code", formData.referralCode.toUpperCase())
          .single();

        if (referrer) {
          referrerId = referrer.id;
        } else {
          toast.error("Invalid referral code");
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            phone: cleanedPhone,
            full_name: formData.fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This phone number is already registered");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Update profile with referrer if provided
      if (data.user && referrerId) {
        await supabase
          .from("profiles")
          .update({ referred_by: referrerId })
          .eq("user_id", data.user.id);
      }

      toast.success("Registration successful! Welcome to FlexiEarn.");
      navigate("/dashboard");
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <CardTitle className="text-2xl font-bold">Join FlexiEarn</CardTitle>
          <CardDescription>
            Start earning money by completing simple tasks
          </CardDescription>
          <div className="rounded-lg bg-secondary/20 p-2">
            <p className="text-sm font-medium">
              One-time registration fee:{" "}
              <span className="text-primary">UGX {registrationFee.toLocaleString()}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="phone"
                  type="tel"
                  placeholder="0700123456"
                  value={formData.phone}
                  onChange={handleChange}
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
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Referral Code (Optional)</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="referralCode"
                  placeholder="Enter referral code"
                  value={formData.referralCode}
                  onChange={handleChange}
                  className="pl-10 uppercase"
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
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
