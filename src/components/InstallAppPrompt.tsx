import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Plus } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "flexiearn_install_dismissed";
const IOS_DISMISS_KEY = "flexiearn_ios_install_dismissed";
const SESSION_KEY = "flexiearn_install_session_dismissed";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-ignore iOS Safari
    window.navigator.standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

export function InstallAppPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    // iOS path — no beforeinstallprompt; show A2HS hint.
    if (isIos()) {
      if (localStorage.getItem(IOS_DISMISS_KEY) === "1") return;
      const t = setTimeout(() => setIosVisible(true), 1500);
      return () => clearTimeout(t);
    }

    // Other browsers — only show when the real event fires.
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      localStorage.setItem(DISMISS_KEY, "1");
      localStorage.setItem(IOS_DISMISS_KEY, "1");
      setVisible(false);
      setIosVisible(false);
      setEvt(null);
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    setEvt(null);
  };

  const dismissIos = () => {
    localStorage.setItem(IOS_DISMISS_KEY, "1");
    sessionStorage.setItem(SESSION_KEY, "1");
    setIosVisible(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setVisible(false);
    setEvt(null);
  };

  if (iosVisible) {
    return (
      <div
        role="dialog"
        aria-label="Install FlexiEarn on your iPhone"
        className="fixed top-3 inset-x-0 z-[90] px-3 animate-in slide-in-from-top-5 duration-300 pointer-events-none"
      >
        <div className="mx-auto max-w-md glass-card rounded-2xl border border-border/60 shadow-2xl p-3 pointer-events-auto">
          <div className="flex items-start gap-3">
            <PlatformLogo size="sm" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Add FlexiEarn to your Home Screen</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                Tap <Share className="inline h-3.5 w-3.5" aria-hidden="true" /> Share, then
                <Plus className="inline h-3.5 w-3.5" aria-hidden="true" /> Add to Home Screen.
              </div>
            </div>
            <button onClick={dismissIos} className="text-muted-foreground hover:text-foreground p-1 min-h-11 min-w-11 flex items-center justify-center" aria-label="Dismiss install prompt">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!visible || !evt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install FlexiEarn app"
      className="fixed top-3 inset-x-0 z-[90] px-3 animate-in slide-in-from-top-5 duration-300 pointer-events-none"
    >
      <div className="mx-auto max-w-md glass-card rounded-2xl border border-border/60 shadow-2xl p-3 flex items-center gap-3 pointer-events-auto">
        <PlatformLogo size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">Get the FlexiEarn app</div>
          <div className="text-xs text-muted-foreground truncate">One tap to install — opens like a native app.</div>
        </div>
        <Button
          size="sm"
          className="gradient-primary border-0 text-primary-foreground hover:opacity-90 h-9 min-w-[88px]"
          onClick={install}
        >
          <Download className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Install
        </Button>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground p-1 min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
