import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DepositDialog } from "@/components/user/DepositDialog";
import { SupportDialog } from "@/components/user/SupportDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  User, Phone, Shield, LogOut, ChevronRight,
  FileText, ArrowDownToLine, ArrowUpFromLine,
  Copy, Lock, Users, MessageCircle, Mail, Pencil, Bell, Wallet as WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationsSection } from "@/components/user/NotificationsSection";
import { PushNotificationToggle } from "@/components/user/PushNotificationToggle";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PlatformLogo } from "@/components/PlatformLogo";
import { EmailPrompt } from "@/components/user/EmailPrompt";
import { EditProfileDialog } from "@/components/user/EditProfileDialog";

type RowProps = {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  iconClass?: string;
};

function Row({ icon: Icon, label, value, onClick, showChevron = true, iconClass = "text-muted-foreground" }: RowProps) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${onClick ? "hover:bg-muted/60 active:bg-muted" : ""}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </div>
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      {value !== undefined && (
        <span className="max-w-[45%] truncate text-xs text-muted-foreground">{value}</span>
      )}
      {showChevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
    </Comp>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="overflow-hidden rounded-2xl border bg-card divide-y">
        {children}
      </div>
    </div>
  );
}

export default function Profile() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [depositOpen, setDepositOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: settings } = usePlatformSettings();


  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/15 text-green-700 border-green-500/30";
      case "pending": return "bg-amber-500/15 text-amber-700 border-amber-500/30";
      default: return "bg-destructive/15 text-destructive border-destructive/30";
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
    if (link) window.open(link, "_blank");
    else toast.error("Community link not configured yet");
  };

  return (
    <UserLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-center pt-1">
          <h1 className="text-lg font-semibold">Profile</h1>
        </div>

        {/* User card */}
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <PlatformLogo size="lg" className="ring-2 ring-primary/20" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{profile?.full_name || "User"}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email || profile?.phone}</p>
            <Badge className={`mt-1.5 border text-[10px] ${getStatusColor(profile?.status || "pending")}`} variant="outline">
              {profile?.status?.toUpperCase()}
            </Badge>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditOpen(true)} aria-label="Edit profile">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {/* Balance + quick actions */}
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Wallet Balance</p>
          <p className="mt-0.5 text-2xl font-bold text-primary">
            UGX {Number(profile?.balance || 0).toLocaleString()}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10 justify-start gap-2 rounded-xl" onClick={() => setDepositOpen(true)}>
              <ArrowDownToLine className="h-4 w-4 text-green-600" /> Deposit
            </Button>
            <Button variant="outline" className="h-10 justify-start gap-2 rounded-xl" onClick={() => navigate("/wallet")}>
              <ArrowUpFromLine className="h-4 w-4 text-primary" /> Withdraw
            </Button>
          </div>
        </div>

        <EmailPrompt variant="card" />

        {/* Account */}
        <Group title="Account">
          <Row icon={User} label="Manage Profile" onClick={() => setEditOpen(true)} />
          <Row icon={Phone} label="Phone" value={profile?.phone} showChevron={false} />
          <Row icon={Mail} label="Email" value={profile?.email || "Not set"} showChevron={false} />
          <Row icon={Shield} label="Referral Code" value={
            <span className="font-mono font-semibold text-primary">{profile?.referral_code}</span>
          } onClick={copyReferralCode} />
        </Group>

        {/* Preferences */}
        <Group title="Preferences">
          <Row icon={Bell} label="Notifications" onClick={() => setNotificationsOpen(true)} />
          <Row icon={Users} label="Join Our Community" onClick={openCommunity} />
          <Row icon={Copy} label="Copy Referral Code" onClick={copyReferralCode} />

        </Group>

        {/* Support */}
        <Group title="Support">
          <Row icon={MessageCircle} label="Help Center" onClick={() => setSupportOpen(true)} iconClass="text-green-600" />
          <Row icon={FileText} label="Terms & Conditions" onClick={() => setTermsOpen(true)} />
          <Row icon={Lock} label="Privacy Policy" onClick={() => setPrivacyOpen(true)} />
        </Group>

        {isAdmin && (
          <Group title="Admin">
            <Row icon={Shield} label="Admin Panel" onClick={() => navigate("/admin")} iconClass="text-primary" />
          </Group>
        )}

        <Button variant="outline" className="w-full rounded-xl text-destructive hover:text-destructive" onClick={handleSignOut}>

          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </Button>

        <div className="space-y-1 pb-4 text-center">
          <p className="text-xs text-muted-foreground">Version {settings?.app_version || "1.0.0"}</p>
          <p className="text-xs text-muted-foreground">Powered by {settings?.powered_by || "Veltrix Technologies Ltd"}</p>
        </div>

        <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
        <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
        <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />

        <Sheet open={termsOpen} onOpenChange={setTermsOpen}>
          <SheetContent side="right" className="glass-card border-0 overflow-y-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle className="text-gradient-primary">Terms & Conditions</SheetTitle></SheetHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {settings?.terms_and_conditions || "Terms and conditions have not been set yet."}
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => setTermsOpen(false)}>Close</Button>
          </SheetContent>
        </Sheet>

        <Sheet open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <SheetContent side="right" className="glass-card border-0 overflow-y-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle className="text-gradient-primary">Privacy Policy</SheetTitle></SheetHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {settings?.privacy_policy || "Privacy policy has not been set yet."}
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => setPrivacyOpen(false)}>Close</Button>
          </SheetContent>
        </Sheet>

        <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <SheetContent side="right" className="glass-card border-0 overflow-y-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle className="text-gradient-primary">Notifications</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-3">
              <NotificationsSection />
              <PushNotificationToggle />
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => setNotificationsOpen(false)}>Close</Button>
          </SheetContent>
        </Sheet>

      </div>
    </UserLayout>
  );
}
