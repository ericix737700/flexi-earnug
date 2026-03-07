import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Copy,
  Share2,
  Gift,
  UserPlus,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Referral {
  id: string;
  full_name: string | null;
  phone: string;
  registration_paid: boolean;
  created_at: string;
}

export default function Referrals() {
  const { profile } = useAuth();
  const { data: settings } = usePlatformSettings();

  const referralBonus = settings?.referral_bonus
    ? Number(settings.referral_bonus)
    : 1000;

  const referralLink = `${window.location.origin}/register?ref=${profile?.referral_code}`;

  // Fetch referrals
  const { data: referrals, isLoading } = useQuery({
    queryKey: ["referrals", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, registration_paid, created_at")
        .eq("referred_by", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!profile?.id,
  });

  const completedReferrals = referrals?.filter((r) => r.registration_paid).length || 0;
  const pendingReferrals = referrals?.filter((r) => !r.registration_paid).length || 0;
  const totalEarned = completedReferrals * referralBonus;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join FlexiEarn Uganda",
          text: `Join FlexiEarn and start earning money by completing simple tasks! Use my referral code: ${profile?.referral_code}`,
          url: referralLink,
        });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-UG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Referral Stats */}
        <Card className="border-2 border-secondary bg-gradient-to-br from-secondary/20 to-success/20">
          <CardContent className="py-6 text-center">
            <div className="mx-auto mb-3 w-fit rounded-full bg-secondary p-3">
              <Gift className="h-8 w-8 text-secondary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Referral Bonus</p>
            <p className="text-2xl font-bold">
              UGX {referralBonus.toLocaleString()} per friend
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Earn when they register and pay
            </p>
          </CardContent>
        </Card>

        {/* Referral Code & Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="font-mono text-2xl font-bold tracking-widest text-primary">
                {profile?.referral_code}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button onClick={shareLink}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-primary">{completedReferrals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{pendingReferrals}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-success">
                {totalEarned.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">UGX Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Your Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-4 text-center text-muted-foreground">Loading...</p>
            ) : referrals?.length === 0 ? (
              <div className="py-8 text-center">
                <UserPlus className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground">
                  Share your code to start earning!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals?.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {referral.full_name || referral.phone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(referral.created_at)}
                      </p>
                    </div>
                    {referral.registration_paid ? (
                      <Badge className="bg-success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        +UGX {referralBonus.toLocaleString()}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
