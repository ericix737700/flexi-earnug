import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";

interface AuthPageShellProps {
  children: React.ReactNode;
  title: string;
  description: string;
  mode: "login" | "register";
}

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Secure by design", description: "Protected account access and encrypted information." },
  { icon: Smartphone, title: "Made for Uganda", description: "Use your phone number or email on any device." },
  { icon: WalletCards, title: "Mobile Money ready", description: "Built around supported MTN and Airtel payments." },
];

export function AuthPageShell({ children, title, description, mode }: AuthPageShellProps) {
  return (
    <main className="dark min-h-screen bg-emerald-night text-foreground">
      <header className="border-b border-border/40 bg-background/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="FlexiEarn home">
            <PlatformLogo size="sm" />
            <span className="text-lg font-bold">FlexiEarn</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl lg:grid-cols-[0.92fr_1.08fr]">
        <section className="hidden border-r border-border/40 px-10 py-16 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-md">
            <p className="text-sm font-bold uppercase text-secondary">Your phone. Your profit.</p>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight">Earn confidently with FlexiEarn.</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Complete real earning activities and access your money through Uganda's leading Mobile Money networks.
            </p>
            <div className="mt-10 space-y-5">
              {TRUST_POINTS.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                <div key={itemTitle} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-secondary/40 bg-secondary/10 text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold">{itemTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{itemDescription}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {["256-bit protection", "MTN supported", "Airtel supported"].map((label) => (
                <span key={label} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" /> {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:py-14">
          <div className="w-full max-w-lg">
            <div className="mb-6 lg:hidden">
              <p className="text-sm font-bold uppercase text-secondary">Secure FlexiEarn account</p>
            </div>
            <div className="card-gold-glow rounded-2xl p-5 sm:p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-extrabold">{title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
              {children}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/contact" className="hover:text-foreground">Help &amp; Support</Link>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {mode === "login" ? "New to FlexiEarn?" : "Already registered?"}{" "}
              <Link to={mode === "login" ? "/register" : "/login"} className="font-bold text-primary hover:underline">
                {mode === "login" ? "Create an account" : "Log in"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}