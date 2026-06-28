import { Link } from "react-router-dom";
import { PlatformLogo } from "@/components/PlatformLogo";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export function PublicFooter() {
  const { data: settings } = usePlatformSettings();
  const year = new Date().getFullYear();
  const poweredBy = settings?.powered_by || "Veltrix Technologies Ltd";
  const version = settings?.app_version || "1.0.0";

  return (
    <footer className="mt-16 border-t border-border/40 bg-background/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <PlatformLogo size="sm" />
            <p className="text-sm text-muted-foreground">
              FlexiEarn Uganda — Smart investments and rewards platform.
            </p>
          </div>
          <FooterCol title="Platform" links={[
            { to: "/", label: "Home" },
            { to: "/about", label: "About" },
            { to: "/faq", label: "FAQ" },
            { to: "/status", label: "System Status" },
          ]} />
          <FooterCol title="Legal" links={[
            { to: "/terms", label: "Terms & Conditions" },
            { to: "/privacy", label: "Privacy Policy" },
          ]} />
          <FooterCol title="Support" links={[
            { to: "/contact", label: "Contact Us" },
            { to: "/login", label: "Sign In" },
            { to: "/register", label: "Create Account" },
          ]} />
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} FlexiEarn Uganda. All rights reserved.</p>
          <p>
            Powered by <span className="font-medium text-foreground">{poweredBy}</span> · v{version}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-foreground">{title}</h4>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-muted-foreground transition hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
