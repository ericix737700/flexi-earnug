import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { SEO } from "@/components/SEO";
import { Shield, TrendingUp, Users, Sparkles, ArrowLeft } from "lucide-react";

export default function About() {
  const values = [
    { icon: Shield, title: "Trust & Security", desc: "Bank-grade encryption and verified mobile money processing keep every transaction safe." },
    { icon: TrendingUp, title: "Real Earnings", desc: "Transparent earning mechanics — tasks, referrals, and gift codes that actually pay." },
    { icon: Users, title: "Community First", desc: "Built for Ugandans, with local payment rails (MarzPay) and human support." },
    { icon: Sparkles, title: "Always Improving", desc: "New tasks, features, and improvements ship every week." },
  ];

  return (
    <div className="min-h-screen app-bg flex flex-col">
      <SEO title="About FlexiEarn Uganda" description="Learn about FlexiEarn Uganda — our mission, values, and how we help Ugandans earn smarter through investments, tasks, and referrals." path="/about" />

      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <PlatformLogo size="md" />
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Home</Button></Link>
      </header>

      <main className="container mx-auto flex-1 px-4 pb-12">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-gradient-primary md:text-5xl">About FlexiEarn</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            FlexiEarn Uganda is a smart earning platform that helps everyday Ugandans grow their income through
            investments, daily tasks, referrals, and reward codes — all paid via mobile money.
          </p>
        </section>

        <section className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <Card key={v.title} className="glass-card">
              <CardContent className="flex gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <v.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-3xl space-y-4 text-muted-foreground">
          <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
          <p>
            We believe earning opportunities should be accessible, transparent, and reliable. FlexiEarn brings together
            micro-tasks, smart investments, and community referrals into a single platform built for the African
            mobile-money economy.
          </p>
          <h2 className="text-2xl font-bold text-foreground">Built In Uganda</h2>
          <p>
            FlexiEarn is operated and supported locally with payouts in UGX through MarzPay. Every feature is designed
            with mobile-first users in mind.
          </p>
        </section>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
          <Link to="/register" className="flex-1"><Button className="w-full gradient-primary text-primary-foreground">Get Started</Button></Link>
          <Link to="/contact" className="flex-1"><Button variant="outline" className="w-full">Contact Us</Button></Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
