import { Link } from "react-router-dom";
import { PlatformLogo } from "@/components/PlatformLogo";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export function PublicFooter() {
  const { data: settings } = usePlatformSettings();
  const year = new Date().getFullYear();
  const poweredBy = settings?.powered_by || "Veltrix Technologies Ltd";
  const version = settings?.app_version || "1.0.0";

  return (
    <footer className="mt-16 px-4 pb-6">
      <div className="glass-card relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2.5rem]">
        {/* Ambient glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -left-24 h-56 w-56 rounded-full blur-[80px]"
          style={{ background: "hsl(var(--primary) / 0.16)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-24 h-56 w-56 rounded-full blur-[80px]"
          style={{ background: "hsl(var(--secondary) / 0.14)" }}
        />

        <div className="relative flex flex-col gap-10 px-6 pt-10 pb-8 sm:px-10 md:grid md:grid-cols-[1.2fr_2fr] md:items-start md:gap-12">
          {/* Brand block with soft green glow behind the logo */}
          <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 70%)" }}
              />
              <PlatformLogo size="sm" />
            </div>
            <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              Uganda's premier platform for smart investments and daily digital earnings.
            </p>
          </div>

          {/* Link grid */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterCol
              title="Platform"
              links={[
                { to: "/", label: "Home" },
                { to: "/about", label: "About" },
                { to: "/faq", label: "FAQ" },
                { to: "/make-money-online-uganda", label: "Earning Guide" },
                { to: "/status", label: "System Status" },
              ]}
            />
            <FooterCol
              title="Support"
              links={[
                { to: "/contact", label: "Contact Us" },
                { to: "/login", label: "Sign In" },
                { to: "/register", label: "Create Account" },
              ]}
            />
            <div className="col-span-2 sm:col-span-1">
              <FooterCol
                title="Legal"
                links={[
                  { to: "/terms", label: "Terms & Conditions" },
                  { to: "/privacy", label: "Privacy Policy" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative flex flex-col items-center gap-3 border-t border-border/40 px-6 py-5 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {year} FlexiEarn Uganda. All rights reserved.
          </p>
          <div className="rounded-full border border-border/60 bg-background/50 px-4 py-2 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Powered by{" "}
              <span className="text-gradient-gold font-semibold">{poweredBy}</span>
              <span className="opacity-40">|</span>
              <span className="rounded-md border border-border/60 bg-secondary/60 px-1.5 py-0.5 text-[9px]">
                v{version}
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-gradient-gold mb-4 text-[11px] font-bold uppercase tracking-[0.2em]">{title}</h4>
      <ul className="space-y-3 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
