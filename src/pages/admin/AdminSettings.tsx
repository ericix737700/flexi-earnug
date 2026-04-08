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
import { useQueryClient } from "@tanstack/react-query";
import {
  Save, Loader2, DollarSign, Gift, Wallet, Calendar, Bell,
  Store, MessageCircle, ImageIcon, Upload, Trash2, Send, Lock, Hand, Info, Users,
} from "lucide-react";

export default function AdminSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    registration_fee: "",
    referral_bonus: "",
    minimum_withdrawal: "",
    daily_checkin_reward: "",
    platform_announcement: "",
    merchant_name: "",
    merchant_id: "",
    support_whatsapp: "",
    support_telegram: "",
    terms_and_conditions: "",
    privacy_policy: "",
    welcome_message: "",
    community_whatsapp: "",
    app_version: "",
    powered_by: "",
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
        support_telegram: settings.support_telegram || "",
        terms_and_conditions: settings.terms_and_conditions || "",
        privacy_policy: settings.privacy_policy || "",
        welcome_message: settings.welcome_message || "",
        community_whatsapp: settings.community_whatsapp || "",
        app_version: settings.app_version || "1.0.0",
        powered_by: settings.powered_by || "Veltrix Technologies Ltd",
      });
    }
  }, [settings]);

  const handleSave = async (key: string, value: string) => {
    try {
      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
          { onConflict: "setting_key" }
        );

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-logo"] });
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
          <p className="text-muted-foreground">Configure platform fees, rewards, branding, and content</p>
        </div>

        {/* Logo Upload */}
        <LogoUploadCard settings={settings} onSave={handleSave} />

        <div className="grid gap-6 md:grid-cols-2">
          <SettingCard icon={DollarSign} iconColor="text-primary" title="Registration Fee" label="Amount (UGX)" value={formData.registration_fee} onChange={(v) => setFormData({ ...formData, registration_fee: v })} onSave={() => handleSave("registration_fee", formData.registration_fee)} isPending={updateSetting.isPending} type="number" />
          <SettingCard icon={Gift} iconColor="text-secondary" title="Referral Bonus" label="Amount (UGX)" value={formData.referral_bonus} onChange={(v) => setFormData({ ...formData, referral_bonus: v })} onSave={() => handleSave("referral_bonus", formData.referral_bonus)} isPending={updateSetting.isPending} type="number" />
          <SettingCard icon={Wallet} iconColor="text-accent" title="Minimum Withdrawal" label="Amount (UGX)" value={formData.minimum_withdrawal} onChange={(v) => setFormData({ ...formData, minimum_withdrawal: v })} onSave={() => handleSave("minimum_withdrawal", formData.minimum_withdrawal)} isPending={updateSetting.isPending} type="number" />
          <SettingCard icon={Calendar} iconColor="text-green-600" title="Daily Check-in Reward" label="Amount (UGX)" value={formData.daily_checkin_reward} onChange={(v) => setFormData({ ...formData, daily_checkin_reward: v })} onSave={() => handleSave("daily_checkin_reward", formData.daily_checkin_reward)} isPending={updateSetting.isPending} type="number" />
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
                <Input value={formData.merchant_name} onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })} placeholder="e.g. FlexiEarn Payments" />
              </div>
              <div className="space-y-2">
                <Label>Merchant Number/ID</Label>
                <Input value={formData.merchant_id} onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })} placeholder="e.g. 256700000000" />
              </div>
            </div>
            <Button onClick={async () => { await handleSave("merchant_name", formData.merchant_name); await handleSave("merchant_id", formData.merchant_id); }} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Merchant Settings
            </Button>
          </CardContent>
        </Card>

        {/* Support Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Support & Community
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>WhatsApp Support Number</Label>
                <Input placeholder="e.g. 256700123456" value={formData.support_whatsapp} onChange={(e) => setFormData({ ...formData, support_whatsapp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telegram Support</Label>
                <Input placeholder="e.g. FlexiEarnSupport" value={formData.support_telegram} onChange={(e) => setFormData({ ...formData, support_telegram: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Community WhatsApp Channel Link</Label>
              <Input placeholder="https://chat.whatsapp.com/..." value={formData.community_whatsapp} onChange={(e) => setFormData({ ...formData, community_whatsapp: e.target.value })} />
              <p className="text-xs text-muted-foreground">Link shown as "Join Community" button in user profile.</p>
            </div>
            <Button onClick={async () => {
              await handleSave("support_whatsapp", formData.support_whatsapp);
              await handleSave("support_telegram", formData.support_telegram);
              await handleSave("community_whatsapp", formData.community_whatsapp);
            }} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Support & Community
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 text-blue-500" />
              App Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>App Version</Label>
                <Input placeholder="1.0.0" value={formData.app_version} onChange={(e) => setFormData({ ...formData, app_version: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Powered By</Label>
                <Input placeholder="Veltrix Technologies Ltd" value={formData.powered_by} onChange={(e) => setFormData({ ...formData, powered_by: e.target.value })} />
              </div>
            </div>
            <Button onClick={async () => {
              await handleSave("app_version", formData.app_version);
              await handleSave("powered_by", formData.powered_by);
            }} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save App Info
            </Button>
          </CardContent>
        </Card>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hand className="h-5 w-5 text-amber-500" />
              Welcome Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Message shown on dashboard</Label>
              <Textarea placeholder="Welcome to FlexiEarn!" value={formData.welcome_message} onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })} rows={3} />
            </div>
            <Button onClick={() => handleSave("welcome_message", formData.welcome_message)} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Welcome Message
            </Button>
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              Platform Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Enter announcement (leave empty to hide)" value={formData.platform_announcement} onChange={(e) => setFormData({ ...formData, platform_announcement: e.target.value })} rows={3} />
            <Button onClick={() => handleSave("platform_announcement", formData.platform_announcement)} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Update Announcement
            </Button>
          </CardContent>
        </Card>

        {/* Terms & Privacy */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Store className="h-5 w-5 text-primary" />Terms & Conditions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Enter terms and conditions..." value={formData.terms_and_conditions} onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })} rows={10} />
            <Button onClick={() => handleSave("terms_and_conditions", formData.terms_and_conditions)} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Terms
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-5 w-5 text-primary" />Privacy Policy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Enter privacy policy..." value={formData.privacy_policy} onChange={(e) => setFormData({ ...formData, privacy_policy: e.target.value })} rows={10} />
            <Button onClick={() => handleSave("privacy_policy", formData.privacy_policy)} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Privacy Policy
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function SettingCard({ icon: Icon, iconColor, title, label, value, onChange, onSave, isPending, type = "text" }: {
  icon: any; iconColor: string; title: string; label: string; value: string;
  onChange: (v: string) => void; onSave: () => void; isPending: boolean; type?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
        <Button className="w-full" onClick={onSave} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function LogoUploadCard({ settings, onSave }: { settings: Record<string, string> | undefined; onSave: (key: string, value: string) => Promise<void> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const currentLogo = settings?.platform_logo || "";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("branding").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(fileName);
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
    try { await onSave("platform_logo", ""); toast.success("Logo removed"); } catch { toast.error("Failed to remove logo"); }
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
        <p className="text-sm text-muted-foreground">Upload a logo displayed across the platform</p>
        {currentLogo && (
          <div className="flex items-center gap-4">
            <img src={currentLogo} alt="Current logo" className="h-16 w-16 rounded-full object-cover border-2 border-primary" />
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Logo
            </Button>
          </div>
        )}
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? "Uploading..." : "Upload Logo"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">Recommended: Square image, max 2MB (PNG or JPG)</p>
        </div>
      </CardContent>
    </Card>
  );
}
