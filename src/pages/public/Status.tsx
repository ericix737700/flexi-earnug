import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { SEO } from "@/components/SEO";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

type Health = "operational" | "degraded" | "down";

function StatusPill({ state }: { state: Health }) {
  const cfg: Record<Health, { label: string; icon: any; cls: string }> = {
    operational: { label: "Operational", icon: CheckCircle2, cls: "text-green-600 bg-green-500/10" },
    degraded:    { label: "Degraded",    icon: AlertTriangle, cls: "text-amber-600 bg-amber-500/10" },
    down:        { label: "Outage",      icon: XCircle,       cls: "text-destructive bg-destructive/10" },
  };
  const c = cfg[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${c.cls}`}>
      <c.icon className="h-3.5 w-3.5" /> {c.label}
    </span>
  );
}

export default function Status() {
  const { data: settings } = usePlatformSettings();
  const [dbHealth, setDbHealth] = useState<Health | "loading">("loading");

  useEffect(() => {
    (async () => {
      try {
        const start = Date.now();
        const { error } = await supabase.from("platform_settings").select("key").limit(1);
        const ms = Date.now() - start;
        if (error) setDbHealth("down");
        else if (ms > 2000) setDbHealth("degraded");
        else setDbHealth("operational");
      } catch {
        setDbHealth("down");
      }
    })();
  }, []);

  const maintenance = settings?.maintenance_mode === "true";
  const emergency = settings?.emergency_mode === "true";
  const txKill = settings?.kill_transactions === "true";
  const tasksKill = settings?.kill_tasks === "true";

  const apiState: Health = emergency ? "down" : maintenance ? "degraded" : "operational";
  const txState: Health = emergency || txKill ? "down" : maintenance ? "degraded" : "operational";
  const tasksState: Health = emergency || tasksKill ? "down" : "operational";
  const dbState: Health = dbHealth === "loading" ? "operational" : dbHealth;

  const overall: Health = [apiState, txState, tasksState, dbState].includes("down")
    ? "down"
    : [apiState, txState, tasksState, dbState].includes("degraded")
    ? "degraded"
    : "operational";

  const services = [
    { name: "Platform API", desc: "Sign-in, dashboard, and core endpoints", state: apiState },
    { name: "Database", desc: "User data and transactions store", state: dbState },
    { name: "Mobile Money (Deposits & Withdrawals)", desc: "MarzPay processing", state: txState },
    { name: "Tasks & Rewards", desc: "Daily tasks and earning features", state: tasksState },
  ];

  return (
    <div className="min-h-screen app-bg flex flex-col">
      <SEO title="System Status" description="Real-time status of FlexiEarn Uganda services: API, database, payments, and earning features." path="/status" />

      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <PlatformLogo size="md" />
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Home</Button></Link>
      </header>

      <main className="container mx-auto flex-1 px-4 pb-12">
        <div className="mx-auto max-w-3xl">
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <h1 className="text-3xl font-bold text-gradient-primary md:text-4xl">System Status</h1>
              <div className="mt-4 flex items-center justify-center gap-2">
                {dbHealth === "loading" ? (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                  </span>
                ) : (
                  <StatusPill state={overall} />
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {overall === "operational" && "All systems are operational."}
                {overall === "degraded" && "Some services are experiencing reduced performance."}
                {overall === "down" && "We are aware of issues affecting one or more services."}
              </p>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-3">
            {services.map((s) => (
              <Card key={s.name} className="glass-card">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <StatusPill state={s.state} />
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Status is updated live based on platform configuration and a real connectivity check.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
