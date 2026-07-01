import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";

export default function Terms() {
  const navigate = useNavigate();
  const { data: settings } = usePlatformSettings();

  return (
    <div className="min-h-screen app-bg">
      <SEO title="Terms & Conditions" description="Read the FlexiEarn Uganda terms of service governing use of the platform, tasks, payouts and referrals." path="/terms" />
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Terms & Conditions</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-2xl border bg-card p-5 text-sm leading-relaxed text-foreground/90">
          {settings?.terms_and_conditions || "Terms and conditions have not been set yet."}
        </article>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </main>
    </div>
  );
}
