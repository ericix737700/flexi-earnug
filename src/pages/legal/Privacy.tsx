import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SecurityBadge } from "@/components/SecurityBadge";
import { SEO } from "@/components/SEO";

export default function Privacy() {
  const navigate = useNavigate();
  const { data: settings } = usePlatformSettings();

  return (
    <div className="min-h-screen app-bg">
      <SEO title="Privacy Policy" description="How FlexiEarn Uganda collects, uses and protects your personal information, phone number, and transaction data." path="/privacy" />
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Lock className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Privacy Policy</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap gap-2">
          <SecurityBadge variant="encrypted" />
          <SecurityBadge variant="ssl" />
        </div>
        <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-2xl border bg-card p-5 text-sm leading-relaxed text-foreground/90">
          {settings?.privacy_policy || "Privacy policy has not been set yet."}
        </article>
        <p className="text-center text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </main>
    </div>
  );
}
