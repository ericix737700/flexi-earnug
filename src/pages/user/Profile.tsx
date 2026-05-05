import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DepositDialog } from "@/components/user/DepositDialog";
import { SupportDialog } from "@/components/user/SupportDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  User, Phone, Calendar, Shield, LogOut, ChevronRight,
  FileText, ArrowDownToLine, ArrowUpFromLine,
  Copy, Star, Flame, Lock, Users, MessageCircle, Mail, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationsSection } from "@/components/user/NotificationsSection";
import { PushNotificationToggle } from "@/components/user/PushNotificationToggle";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PlatformLogo } from "@/components/PlatformLogo";
import { EmailPrompt } from "@/components/user/EmailPrompt";
import { EditProfileDialog } from "@/components/user/EditProfileDialog";

export default function Profile() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [depositOpen, setDepositOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { data: settings } = usePlatformSettings();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/15 text-green-700 border-green-500/30";
      case "pending": return "bg-amber-500/15 text-amber-700 border-amber-500/30";
      case "suspended": return "bg-destructive/15 text-destructive border-destructive/30";
      case "blocked": return "bg-destructive/15 text-destructive border-destructive/30";
      default: return "bg-muted";
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const openCommunity = () => {
    const link = settings?.community_whatsapp;
    if (link) {
      window.open(link, "_blank");
    } else {
      toast.error("Community link not configured yet");
    }
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        {/* Profile Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-foreground/10" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-primary-foreground/10" />
          <div className="relative flex items-center gap-4">
            <PlatformLogo size="lg" className="ring-2 ring-primary-foreground/30" />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile?.full_name || "User"}</h2>
              <div className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                <Phone className="h-3.5 w-3.5" />
                <span>{profile?.phone}</span>
              </div>
              <Badge className={`mt-2 border ${getStatusColor(profile?.status || "pending")}`} variant="outline">
                {profile?.status?.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-primary-foreground/15 px-3 py-2 text-center backdrop-blur-sm">
              <p className="text-lg font-bold">UGX {Number(profile?.balance || 0).toLocaleString()}</p>
              <p className="text-[10px] text-primary-foreground/70">Balance</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/15 px-3 py-2 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-4 w-4" />
                <p className="text-lg font-bold">{profile?.daily_checkin_streak || 0}</p>
              </div>
              <p className="text-[10px] text-primary-foreground/70">Day Streak</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/15 px-3 py-2 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4" />
                <p className="text-lg font-bold">{profile?.registration_paid ? "Active" : "Free"}</p>
              </div>
              <p className="text-[10px] text-primary-foreground/70">Account</p>
            </div>
          </div>
        </div>

        {/* Email Prompt (only shows if email is missing) */}
        <EmailPrompt variant="card" />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-14 flex-col gap-1 rounded-xl border-2" onClick={() => setDepositOpen(true)}>
            <ArrowDownToLine className="h-5 w-5 text-green-600" />
            <span className="text-sm">Deposit</span>
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1 rounded-xl border-2" onClick={() => navigate("/wallet")}>
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
            <span className="text-sm">Withdraw</span>
          </Button>
        </div>

        {/* Join Community */}
        <Card className="cursor-pointer rounded-xl border-2 border-green-500/30 bg-green-500/5 transition-colors hover:bg-green-500/10" onClick={openCommunity}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/15">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">Join Our Community</p>
                <p className="text-xs text-muted-foreground">Connect with other earners</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>

        {/* Referral Code */}
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs text-muted-foreground">Your Referral Code</p>
              <p className="text-xl font-mono font-bold text-primary">{profile?.referral_code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyReferralCode}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <NotificationsSection />
        <PushNotificationToggle />

        {/* Account Info */}
        <Card className="rounded-xl">
          <CardContent className="p-0">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-muted-foreground">Account Details</p>
            </div>
            <Separator />
            {[
              { icon: User, label: "Full Name", value: profile?.full_name || "Not set" },
              { icon: Phone, label: "Phone", value: profile?.phone },
              { icon: Mail, label: "Email", value: profile?.email || "Not set" },
              { icon: Calendar, label: "Joined", value: profile?.created_at ? formatDate(profile.created_at) : "N/A" },
              { icon: Shield, label: "Referral Code", value: profile?.referral_code, mono: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b last:border-b-0 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className={`text-sm font-medium ${item.mono ? "font-mono text-primary" : ""}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Admin Link */}
        {isAdmin && (
          <Card className="cursor-pointer rounded-xl transition-colors hover:bg-muted/50" onClick={() => navigate("/admin")}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">Admin Panel</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Menu */}
        <Card className="rounded-xl">
          <CardContent className="p-0">
            <div className="flex cursor-pointer items-center justify-between border-b px-4 py-3.5 hover:bg-muted/50" onClick={() => setSupportOpen(true)}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm">Help & Support</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex cursor-pointer items-center justify-between border-b px-4 py-3.5 hover:bg-muted/50" onClick={() => setTermsOpen(true)}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm">Terms & Conditions</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex cursor-pointer items-center justify-between px-4 py-3.5 hover:bg-muted/50" onClick={() => setPrivacyOpen(true)}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm">Privacy Policy</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
        <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />

        {/* Terms Sheet */}
        <Sheet open={termsOpen} onOpenChange={setTermsOpen}>
          <SheetContent side="right" className="glass-card border-0 overflow-y-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle className="text-gradient-primary">Terms & Conditions</SheetTitle></SheetHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {settings?.terms_and_conditions || "Terms and conditions have not been set yet."}
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => setTermsOpen(false)}>Close</Button>
          </SheetContent>
        </Sheet>

        {/* Privacy Sheet */}
        <Sheet open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <SheetContent side="right" className="glass-card border-0 overflow-y-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle className="text-gradient-primary">Privacy Policy</SheetTitle></SheetHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {settings?.privacy_policy || "Privacy policy has not been set yet."}
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => setPrivacyOpen(false)}>Close</Button>
          </SheetContent>
        </Sheet>


        <Button variant="destructive" className="w-full rounded-xl" onClick={handleSignOut}>
          <LogOut className="mr-2 h-5 w-5" />
          Log Out
        </Button>

        {/* Version & Powered By */}
        <div className="text-center pb-4 space-y-1">
          <p className="text-xs text-muted-foreground">
            Version {settings?.app_version || "1.0.0"}
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by {settings?.powered_by || "Veltrix Technologies Ltd"}
          </p>
        </div>
      </div>
    </UserLayout>
  );
}
