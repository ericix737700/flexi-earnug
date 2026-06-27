import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

// Warn the user 2 minutes before their session expires.
const WARN_BEFORE_MS = 2 * 60 * 1000;

export function SessionTimeoutWarning() {
  const { user, signOut } = useAuth() as any;
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const schedule = async () => {
      const { data } = await supabase.auth.getSession();
      const expiresAt = data.session?.expires_at;
      if (!expiresAt || cancelled) return;
      const msUntilExpiry = expiresAt * 1000 - Date.now();
      const msUntilWarn = Math.max(msUntilExpiry - WARN_BEFORE_MS, 0);

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setSecondsLeft(Math.max(Math.floor((expiresAt * 1000 - Date.now()) / 1000), 0));
        setOpen(true);
        if (tickRef.current) window.clearInterval(tickRef.current);
        tickRef.current = window.setInterval(() => {
          const s = Math.max(Math.floor((expiresAt * 1000 - Date.now()) / 1000), 0);
          setSecondsLeft(s);
          if (s <= 0) {
            window.clearInterval(tickRef.current!);
          }
        }, 1000);
      }, msUntilWarn);
    };

    schedule();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        setOpen(false);
        schedule();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [user]);

  const stay = async () => {
    await supabase.auth.refreshSession();
    setOpen(false);
  };

  const leave = async () => {
    setOpen(false);
    try {
      await signOut?.();
    } catch {
      await supabase.auth.signOut();
    }
  };

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Session expiring soon
          </AlertDialogTitle>
          <AlertDialogDescription>
            For your security, you'll be signed out automatically in{" "}
            <span className="font-mono font-semibold text-foreground">
              {mm}:{ss}
            </span>
            . Stay signed in to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={leave}>Sign out</AlertDialogCancel>
          <AlertDialogAction onClick={stay}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
