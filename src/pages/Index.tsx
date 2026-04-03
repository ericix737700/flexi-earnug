import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlatformLogo } from "@/components/PlatformLogo";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import {
  Smartphone,
  Users,
  CalendarCheck,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Gift,
  Star,
} from "lucide-react";

import heroImg from "@/assets/hero-earning.jpg";
import referralImg from "@/assets/referral-friends.jpg";
import dailyBonusImg from "@/assets/daily-bonus.jpg";

const Index = () => {
  const { data: settings } = usePlatformSettings();
  const registrationFee = settings?.registration_fee ? Number(settings.registration_fee) : 5000;
  const dailyReward = settings?.daily_checkin_reward ? Number(settings.daily_checkin_reward) : 800;
  const referralBonus = settings?.referral_bonus ? Number(settings.referral_bonus) : 3000;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <PlatformLogo size="sm" />
            <span className="text-xl font-bold text-foreground">FlexiEarn</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium">Log In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="gradient-primary border-0 font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.07]" />
        <div className="absolute top-20 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 -right-32 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                <Zap className="h-4 w-4" />
                Uganda's #1 Earning Platform
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Turn Your Phone Into a{" "}
                <span className="text-gradient-primary">Money Machine</span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                Join thousands of Ugandans earning real money daily by completing simple tasks,
                watching videos, answering trivia, and referring friends. Withdraw straight to
                your Mobile Money!
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button size="lg" className="w-full gap-2 gradient-primary border-0 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90 sm:w-auto">
                    Start Earning Now <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full text-base border-primary/30 text-primary hover:bg-primary/5 sm:w-auto">
                    I Have an Account
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Instant MTN/Airtel payouts
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  24/7 support
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/5 blur-2xl" />
              <img
                src={heroImg}
                alt="Happy Ugandans earning money on their phones"
                className="relative rounded-2xl shadow-2xl ring-1 ring-primary/10"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border/50 bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {[
            { value: "10,000+", label: "Active Earners" },
            { value: `UGX ${dailyReward.toLocaleString()}`, label: "Daily Login Bonus" },
            { value: `UGX ${referralBonus.toLocaleString()}`, label: "Per Referral" },
            { value: "Instant", label: "Mobile Money Payouts" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-extrabold text-primary md:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Start earning in just 3 simple steps. No experience needed — if you can use a phone, you can earn!
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: "1",
              icon: Smartphone,
              title: "Create & Activate",
              desc: `Register with your phone number and pay a one-time activation fee of UGX ${registrationFee.toLocaleString()} via Mobile Money. Your account is activated instantly!`,
              gradient: "from-primary/10 to-primary/5",
              iconBg: "bg-primary/15 text-primary",
            },
            {
              step: "2",
              icon: TrendingUp,
              title: "Complete Tasks & Earn",
              desc: "Watch videos, answer trivia questions, take surveys, and check in daily. Every task earns you real money deposited into your wallet.",
              gradient: "from-secondary/10 to-secondary/5",
              iconBg: "bg-secondary/15 text-secondary",
            },
            {
              step: "3",
              icon: Gift,
              title: "Withdraw to Mobile Money",
              desc: "Cash out your earnings anytime directly to your MTN or Airtel Mobile Money. Fast, secure, and hassle-free!",
              gradient: "from-primary/10 to-secondary/5",
              iconBg: "bg-primary/15 text-primary",
            },
          ].map((item) => (
            <div
              key={item.step}
              className={`relative rounded-2xl border border-border/50 bg-gradient-to-br ${item.gradient} p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1`}
            >
              <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground shadow-md">
                {item.step}
              </div>
              <div className={`mb-4 inline-flex rounded-xl p-3 ${item.iconBg}`}>
                <item.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Earning Methods */}
      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">
              Multiple Ways to Earn
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              The more you do, the more you earn. Stack your income with these earning methods.
            </p>
          </div>

          {/* Daily Login Bonus */}
          <div className="mb-16 grid items-center gap-10 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <CalendarCheck className="h-4 w-4" />
                Daily Reward
              </div>
              <h3 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
                Daily Login Bonus
              </h3>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                Simply open the app and check in every day to earn <strong className="text-primary font-bold">UGX {dailyReward.toLocaleString()}</strong> for free!
                Build a streak for even bigger rewards. It takes just 5 seconds.
              </p>
              <ul className="mt-4 space-y-2">
                {["Earn just by logging in", "Build daily streaks for bonuses", "Never miss a day, never miss money"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <img
                src={dailyBonusImg}
                alt="Daily login bonus reward"
                className="rounded-2xl shadow-xl ring-1 ring-border/50"
                loading="lazy"
              />
            </div>
          </div>

          {/* Referral Program */}
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <img
                src={referralImg}
                alt="Friends sharing referral codes"
                className="rounded-2xl shadow-xl ring-1 ring-border/50"
                loading="lazy"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-sm font-semibold text-secondary">
                <Users className="h-4 w-4" />
                Referral Program
              </div>
              <h3 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
                Invite Friends, Earn Big
              </h3>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                Share your referral code and earn <strong className="text-primary font-bold">UGX {referralBonus.toLocaleString()}</strong> for every friend who joins and activates their account.
                There's no limit — the more friends you bring, the more you earn!
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  `UGX ${referralBonus.toLocaleString()} per successful referral`,
                  "Unlimited referral earnings",
                  "Your friends earn too — everyone wins!",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-accent/50 via-card to-primary/5 p-8 md:p-12">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-foreground">
              Why Thousands Trust FlexiEarn
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Secure Payments",
                desc: "All transactions are processed securely through MarzPay, Uganda's trusted payment gateway.",
              },
              {
                icon: Zap,
                title: "Instant Withdrawals",
                desc: "Request a withdrawal and receive money directly to your MTN or Airtel Mobile Money within minutes.",
              },
              {
                icon: Star,
                title: "Real Earnings",
                desc: "No scams, no tricks. Complete real tasks and get paid real money. Join our growing community of earners.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="gradient-primary py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-primary-foreground md:text-4xl">
            Ready to Start Earning?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Join FlexiEarn today for just UGX {registrationFee.toLocaleString()} and start earning immediately.
            Your phone is all you need!
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="mt-8 gap-2 gradient-gold border-0 text-base font-bold text-secondary-foreground shadow-xl hover:opacity-90"
            >
              Create My Account <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <PlatformLogo size="sm" />
            <span className="font-bold text-foreground">FlexiEarn</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FlexiEarn Uganda. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-primary transition-colors">Login</Link>
            <Link to="/register" className="hover:text-primary transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
