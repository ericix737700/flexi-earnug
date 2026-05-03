import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface EmailPromptProps {
  variant?: "card" | "dialog";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmailPrompt({ variant = "card", open, onOpenChange }: EmailPromptProps) {
  const { profile, refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // If profile already has an email, render nothing
  if (profile?.email) return null;

  const isOpen = open !== undefined ? open : dialogOpen;
  const setOpen = onOpenChange || setDialogOpen;

  const handleSave = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!profile?.user_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ email: trimmed } as any)
        .eq("user_id", profile.user_id);
      if (error) throw error;
      toast.success("Email saved successfully");
      await refreshProfile();
      setOpen(false);
      setEmail("");
    } catch (e: any) {
      toast.error(e.message || "Failed to save email");
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="prompt-email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="prompt-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-11"
            autoFocus
          />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary border-0 text-primary-foreground">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Email"
        )}
      </Button>
    </div>
  );

  if (variant === "dialog") {
    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gradient-primary">
              <Mail className="h-5 w-5" />
              Add Your Email
            </DialogTitle>
            <DialogDescription>
              Add an email to secure your account and receive important notifications.
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Add your email address</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Required for account security, notifications, and password recovery.
              </p>
            </div>
          </div>
          {formContent}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            <span>We'll never share your email.</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
