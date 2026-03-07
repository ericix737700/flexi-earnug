import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DepositDialog } from "@/components/user/DepositDialog";
import {
  User,
  Phone,
  Calendar,
  Shield,
  LogOut,
  ChevronRight,
  HelpCircle,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationsSection } from "@/components/user/NotificationsSection";
import { PushNotificationToggle } from "@/components/user/PushNotificationToggle";

export default function Profile() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [depositOpen, setDepositOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-UG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success";
      case "pending":
        return "bg-amber-500";
      case "suspended":
        return "bg-destructive";
      case "blocked":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="border-2">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {profile?.full_name || "User"}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{profile?.phone}</span>
                </div>
                <Badge className={`mt-2 ${getStatusColor(profile?.status || "pending")}`}>
                  {profile?.status?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposit & Withdraw Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14 flex-col gap-1"
            onClick={() => setDepositOpen(true)}
          >
            <ArrowDownToLine className="h-5 w-5 text-success" />
            <span>Deposit</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 flex-col gap-1"
            onClick={() => navigate("/wallet")}
          >
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
            <span>Withdraw</span>
          </Button>
        </div>

         {/* Notifications */}
         <NotificationsSection />

        {/* Push Notification Settings */}
        <PushNotificationToggle />

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>Full Name</span>
              </div>
              <span className="font-medium">{profile?.full_name || "Not set"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>Phone</span>
              </div>
              <span className="font-medium">{profile?.phone}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span>Joined</span>
              </div>
              <span className="font-medium">
                {profile?.created_at ? formatDate(profile.created_at) : "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span>Referral Code</span>
              </div>
              <span className="font-mono font-medium text-primary">
                {profile?.referral_code}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Admin Link */}
        {isAdmin && (
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => navigate("/admin")}
          >
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Admin Panel</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Menu Items */}
        <Card>
          <CardContent className="divide-y p-0">
            <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span>Help & Support</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span>Terms & Conditions</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </UserLayout>
  );
}
