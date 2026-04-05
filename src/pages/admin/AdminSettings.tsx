import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePlatformSettings, useUpdatePlatformSetting } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import {
  Save,
  Loader2,
  DollarSign,
  Gift,
  Wallet,
  Calendar,
  Bell,
  Store,
  MessageCircle,
  ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";

export default function AdminSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();

  const [formData, setFormData] = useState({
    registration_fee: "",
    referral_bonus: "",
    minimum_withdrawal: "",
    daily_checkin_reward: "",
    platform_announcement: "",
    merchant_name: "",
    merchant_id: "",
    support_whatsapp: "",
    terms_and_conditions: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        registration_fee: settings.registration_fee || "5000",
        referral_bonus: settings.referral_bonus || "1000",
        minimum_withdrawal: settings.minimum_withdrawal || "5000",
        daily_checkin_reward: settings.daily_checkin_reward || "100",
        platform_announcement: settings.platform_announcement || "",
        merchant_name: settings.merchant_name || "FlexiEarn Payments",
        merchant_id: settings.merchant_id || "256700000000",
        support_whatsapp: settings.support_whatsapp || "",
        terms_and_conditions: settings.terms_and_conditions || "",
      });
    }
  }, [settings]);

  const handleSave = async (key: string, value: string) => {
    try {
      await updateSetting.mutateAsync({ key, value });
      toast.success("Setting updated successfully");
    } catch {
      toast.error("Failed to update setting");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure platform fees, rewards, and announcements
          </p>
        </div>

        {/* Logo Upload */}
        <LogoUploadCard settings={settings} onSave={handleSave} />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Registration Fee */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-primary" />
                Registration Fee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={formData.registration_fee}
                  onChange={(e) =>
                    setFormData({ ...formData, registration_fee: e.target.value })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  handleSave("registration_fee", formData.registration_fee)
                }
                disabled={updateSetting.isPending}
              >
                {updateSetting.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Referral Bonus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="h-5 w-5 text-secondary" />
                Referral Bonus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={formData.referral_bonus}
                  onChange={(e) =>
                    setFormData({ ...formData, referral_bonus: e.target.value })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  handleSave("referral_bonus", formData.referral_bonus)
                }
                disabled={updateSetting.isPending}
              >
                {updateSetting.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Minimum Withdrawal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-5 w-5 text-accent" />
                Minimum Withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={formData.minimum_withdrawal}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimum_withdrawal: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  handleSave("minimum_withdrawal", formData.minimum_withdrawal)
                }
                disabled={updateSetting.isPending}
              >
                {updateSetting.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Daily Check-in Reward */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-success" />
                Daily Check-in Reward
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={formData.daily_checkin_reward}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      daily_checkin_reward: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  handleSave("daily_checkin_reward", formData.daily_checkin_reward)
                }
                disabled={updateSetting.isPending}
              >
                {updateSetting.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Merchant Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-5 w-5 text-primary" />
              Merchant Settings (Deposits)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Merchant Name</Label>
                <Input
                  value={formData.merchant_name}
                  onChange={(e) =>
                    setFormData({ ...formData, merchant_name: e.target.value })
                  }
                  placeholder="e.g. FlexiEarn Payments"
                />
              </div>
              <div className="space-y-2">
                <Label>Merchant Number/ID</Label>
                <Input
                  value={formData.merchant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, merchant_id: e.target.value })
                  }
                  placeholder="e.g. 256700000000"
                />
              </div>
            </div>
            <Button
              onClick={async () => {
                await handleSave("merchant_name", formData.merchant_name);
                await handleSave("merchant_id", formData.merchant_id);
              }}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Merchant Settings
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-green-600" />
              WhatsApp Support Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>WhatsApp Number (with country code)</Label>
              <Input
                placeholder="e.g. 256700123456"
                value={formData.support_whatsapp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    support_whatsapp: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                This number will be shown on the user profile as support contact and used for the WhatsApp link.
              </p>
            </div>
            <Button
              onClick={() =>
                handleSave("support_whatsapp", formData.support_whatsapp)
              }
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </CardContent>
        </Card>

        {/* Platform Announcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              Platform Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Announcement Message</Label>
              <Textarea
                placeholder="Enter a message to display to all users (leave empty to hide)"
                value={formData.platform_announcement}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    platform_announcement: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <Button
              onClick={() =>
                handleSave("platform_announcement", formData.platform_announcement)
              }
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Update Announcement
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function LogoUploadCard({ settings, onSave }: { settings: Record<string, string> | undefined; onSave: (key: string, value: string) => Promise<void> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const currentLogo = settings?.platform_logo || "";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("branding")
        .getPublicUrl(fileName);

      await onSave("platform_logo", urlData.publicUrl);
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    try {
      await onSave("platform_logo", "");
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-5 w-5 text-primary" />
          Platform Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a logo that will be displayed across the entire platform (login, register, navigation, etc.)
        </p>

        {currentLogo && (
          <div className="flex items-center gap-4">
            <img
              src={currentLogo}
              alt="Current logo"
              className="h-16 w-16 rounded-full object-cover border-2 border-primary"
            />
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Logo
            </Button>
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? "Uploading..." : "Upload Logo"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Recommended: Square image, max 2MB (PNG or JPG)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
