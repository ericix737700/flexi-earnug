import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { UserLayout } from "@/components/layout/UserLayout";

interface FeaturePageProps {
  title: string;
  description?: string;
  /** Where the back arrow goes. Defaults to browser history. */
  backTo?: string;
  /** Render without the authenticated app chrome (used on public/blocked screens). */
  bare?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

export function FeaturePage({
  title,
  description,
  backTo,
  bare = false,
  actions,
  children,
}: FeaturePageProps) {
  const navigate = useNavigate();

  const goBack = () => {
    if (backTo) navigate(backTo);
    else if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  const content = (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-8">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-card text-foreground transition-colors hover:bg-muted tap-pop"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>

      {children}
    </div>
  );

  if (bare) {
    return (
      <div className="min-h-screen app-bg px-4 py-5">
        {content}
      </div>
    );
  }

  return <UserLayout>{content}</UserLayout>;
}
