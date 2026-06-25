import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "flexiearn_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (choice: "accepted" | "rejected") => {
    localStorage.setItem(STORAGE_KEY, choice);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="mx-auto max-w-2xl glass-card rounded-2xl border border-border/60 shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base">We value your privacy</h3>
              <button
                onClick={() => decide("rejected")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              We use cookies to keep you signed in, secure your account, and improve your experience.
              Read our{" "}
              <Link to="/privacy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
                onClick={() => decide("accepted")}
              >
                Accept all
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide("rejected")}>
                Reject non-essential
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
