import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "flexiearn_install_dismissed";
const SESSION_KEY = "flexiearn_install_session_dismissed";

export function InstallAppPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (standalone) return;

    // Permanently dismissed by the user (X) — never show again unless they clear storage.
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    // Dismissed for this browser session.
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
      setEvt(null);
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = () => {
    // Permanent dismiss — keeps it from reappearing.
    localStorage.setItem(DISMISS_KEY, "1");
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    setEvt(null);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setVisible(false);
    setEvt(null);
  };

  if (!visible || !evt) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-[90] px-3 animate-in slide-in-from-top-5 duration-300 pointer-events-none">
      <div className="mx-auto max-w-md glass-card rounded-2xl border border-border/60 shadow-2xl p-3 flex items-center gap-3 pointer-events-auto">
        <PlatformLogo size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">Install FlexiEarn</div>
          <div className="text-xs text-muted-foreground truncate">Faster access. Works like an app.</div>
        </div>
        <Button
          size="sm"
          className="gradient-primary border-0 text-primary-foreground hover:opacity-90 h-8"
          onClick={install}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Install
        </Button>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
