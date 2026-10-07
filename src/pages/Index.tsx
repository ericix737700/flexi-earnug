import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlatformLogo } from "@/components/PlatformLogo";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PublicFooter } from "@/components/PublicFooter";
import { SEO } from "@/components/SEO";
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
  Megaphone,
  Target,
  Eye,
  Trophy,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

import heroImg from "@/assets/hero-earning.jpg";
import referralImg from "@/assets/referral-friends.jpg";
import dailyBonusImg from "@/assets/daily-bonus.jpg";

const Index = () => {
  const { data: settings } = usePlatformSettings();
  const registrationFee = settings?.registration_fee ? Number(settings.registration_fee) : 5000;
  const dailyReward = settings?.daily_checkin_reward ? Number(settings.daily_checkin_reward) : 800;
  const referralBonus = settings?.referral_bonus ? Number(settings.referral_bonus) : 3000;

  const [bootLoading, setBootLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBootLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (bootLoading) return <LoadingScreen />;

  return (
    <div className="dark min-h-screen bg-emerald-night text-foreground">
      <SEO title="FlexiEarn Uganda — Smart Earning & Investments" description="Earn through investments, daily tasks, referrals and gift codes. Paid in UGX via mobile money. Join FlexiEarn Uganda today." path="/" />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/40 backdrop-blur-xl">
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
        <div aria-hidden className="absolute left-1/2 top-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 md:pt-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="text-center md:text-left">
              <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight text-foreground md:text-7xl">
                Your Phone,<br />Your Profit
              </h1>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:mx-0 md:text-lg">
                Earning, investments, and everything in between. One account to complete tasks and build a streak for even bigger rewards.
              </p>
              <div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3 md:mx-0">
                <Link to="/register">
                  <Button size="lg" className="h-12 w-full gap-2 rounded-full gradient-primary border-0 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90">
                    Get Started <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="h-12 w-full rounded-full border-primary/50 bg-transparent font-medium">
                    Log In
                  </Button>
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground md:justify-start">
                {["Instant MTN & Airtel payouts", "Bank-grade security", "24/7 support"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" />{t}</span>
                ))}
              </div>
              <Link to="/make-money-online-uganda" className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
                New here? Read our guide to making money online in Uganda →
              </Link>
            </div>
            <div className="relative hidden md:block">
              <div className="absolute -inset-6 rounded-[2rem] bg-primary/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
                <img src={heroImg} alt="Ugandans earning on their phones with FlexiEarn" className="h-80 w-full object-cover" loading="lazy" />
              </div>
              <div className="absolute -bottom-5 -left-4 rounded-2xl card-neon px-4 py-3">
                <p className="text-[11px] text-muted-foreground">Withdrawal sent</p>
                <p className="text-sm font-bold text-foreground">UGX 45,000 → MTN</p>
              </div>
            </div>
          </div>

          {/* Stat chips */}
          <div className="mt-12 grid grid-cols-3 gap-2 md:gap-4">
            {[
              { icon: Trophy, value: "10,000+", label: "Active Earners" },
              { icon: Gift, value: `UGX ${dailyReward.toLocaleString()}`, label: "Daily Login Bonus" },
              { icon: Zap, value: "Instant Mobile", label: "Money Payouts" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-xl border border-secondary/30 bg-card/60 p-2.5 backdrop-blur md:p-4">
                <div className="hidden shrink-0 rounded-lg bg-secondary/15 p-1.5 text-secondary sm:block"><s.icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground md:text-base">{s.value}</p>
                  <p className="truncate text-[10px] text-muted-foreground md:text-xs">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <h2 className="mb-8 text-center text-3xl font-extrabold text-foreground md:text-4xl">How It Works</h2>
        <div className="grid grid-cols-3 gap-2.5 md:gap-6">
          {[
            { step: 1, icon: Smartphone, title: "Join & Activate", desc: `Register and pay a one-time fee of UGX ${registrationFee.toLocaleString()} via Mobile Money.` },
            { step: 2, icon: TrendingUp, title: "Complete Tasks & Earn", desc: "Watch videos, answer surveys, and check in daily. Build streaks for bonuses." },
            { step: 3, icon: Wallet, title: "Cash Out", desc: "Withdraw your earnings anytime directly to your MTN or Airtel Mobile Money." },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl card-gold-glow p-3 transition-transform hover:-translate-y-1 md:p-6">
              <div className="mb-4 w-fit rounded-lg border border-secondary/40 bg-secondary/10 p-2 text-secondary md:mb-6">
                <item.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <p className="text-[11px] font-medium text-secondary md:text-sm">Step {item.step}</p>
              <h3 className="mt-0.5 text-sm font-bold leading-tight text-foreground md:text-xl">{item.title}</h3>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground md:text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Earning Methods */}
      <section className="border-y border-border/40 bg-card/20">
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

      {/* Gift Codes - How It Works + Redeem CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/15 via-card to-primary/10 p-8 md:p-12">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-3 py-1 text-sm font-semibold text-secondary">
              <Gift className="h-4 w-4" />
              Gift Codes
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">
              Got a Gift Code? Redeem it in 3 Steps
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Watch out for FlexiEarn gift codes on our social media, community groups, and promotions.
              Each code instantly credits your wallet with real cash.
            </p>
          </div>

          {/* Steps */}
          <div className="relative mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Log into your account",
                desc: "Sign in with your phone number and password. Don't have an account? Create one in seconds.",
              },
              {
                step: "2",
                title: "Open the Wallet page",
                desc: "Tap the Wallet icon in the bottom navigation, then scroll to the 'Redeem Gift Code' card.",
              },
              {
                step: "3",
                title: "Enter your code",
                desc: "Type or paste the code (e.g. GIFT-XXXXXX) and tap Redeem. Cash lands in your balance instantly.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground shadow-md">
                  {s.step}
                </div>
                <h3 className="mt-2 mb-2 text-lg font-bold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Visual code + CTA */}
          <div className="relative mt-10 grid items-center gap-6 md:grid-cols-2">
            <div className="flex justify-center">
              <div className="relative w-full max-w-sm rounded-2xl border-2 border-dashed border-primary/40 bg-card/70 p-6 backdrop-blur-sm shadow-xl">
                <div className="text-center">
                  <Gift className="mx-auto h-10 w-10 text-primary" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sample Gift Code</p>
                  <p className="mt-2 font-mono text-2xl font-extrabold tracking-widest text-gradient-primary">
                    GIFT-XXXXXX
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">Redeem at Wallet → Redeem Gift Code</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-foreground">Ready to redeem?</h3>
              <p className="text-muted-foreground">
                Already have a code? Sign in and head straight to your Wallet to claim your reward.
                New here? Create your account and start earning today.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/wallet" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 gradient-primary border-0 font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90 sm:w-auto">
                    <Gift className="h-5 w-5" /> Redeem a Code
                  </Button>
                </Link>
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5 sm:w-auto">
                    Create Account
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Codes are case-insensitive and can only be redeemed once per user.
              </p>
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

      {/* Advertise with FlexiEarn */}

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-secondary/10 p-8 md:p-12">
          <div className="absolute -top-16 -right-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
                <Megaphone className="h-4 w-4" />
                Advertise with FlexiEarn
              </div>
              <h2 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">
                Reach thousands of Ugandans from just <span className="text-gradient-primary">UGX 5,000</span>
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                Promote your business, event, product or service on FlexiEarn. Choose from banner ads,
                popup ads, in-feed ads and sponsored placements — all shown to our active daily earners.
              </p>

              <ul className="mt-5 space-y-2.5">
                {[
                  "Affordable daily packages — pay by day or bundle",
                  "Pay via Mobile Money or wallet balance",
                  "Target dashboard, tasks, popups or dedicated Ads page",
                  "Track impressions & clicks in real time",
                  "Manual admin review keeps quality high",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/ads" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 gradient-primary border-0 font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90 sm:w-auto">
                    <Megaphone className="h-5 w-5" /> Start Advertising
                  </Button>
                </Link>
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5 sm:w-auto">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Megaphone, title: "Banner Ads", desc: "Rotating banner on user dashboard", color: "text-rose-500 bg-rose-500/15" },
                { icon: Eye, title: "Popup Ads", desc: "Full-screen modal on app open", color: "text-purple-500 bg-purple-500/15" },
                { icon: Target, title: "In-Feed Ads", desc: "Native card between tasks", color: "text-blue-500 bg-blue-500/15" },
                { icon: Star, title: "Sponsored", desc: "Featured on dedicated Ads page", color: "text-amber-500 bg-amber-500/15" },
              ].map((t) => (
                <div key={t.title} className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm shadow-sm">
                  <div className={`mb-3 inline-flex rounded-xl p-2.5 ${t.color}`}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <p className="font-bold text-foreground">{t.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


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

      <PublicFooter />

    </div>
  );
};

export default Index;
