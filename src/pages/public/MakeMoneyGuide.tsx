import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlatformLogo } from "@/components/PlatformLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { SEO } from "@/components/SEO";
import { ArrowLeft, UserPlus, BadgeCheck, Coins, Wallet } from "lucide-react";

const STEPS = [
  { icon: UserPlus, title: "Sign up", text: "Create a free account with your phone number, email and a password." },
  { icon: BadgeCheck, title: "Activate", text: "Pay the one-time activation fee with MTN MoMo or Airtel Money." },
  { icon: Coins, title: "Earn", text: "Watch videos, answer surveys, redeem gift codes, invest in machines and invite friends." },
  { icon: Wallet, title: "Withdraw", text: "Cash out straight to your MTN or Airtel number, confirmed with your FE PIN." },
];

const NETWORKS = [
  {
    name: "MTN Mobile Money",
    code: "*165#",
    tone: "bg-secondary/15 text-secondary",
    steps: [
      "Make sure your MTN line is registered for MoMo and has enough balance.",
      "In FlexiEarn, go to Wallet → Deposit, enter the amount and your MTN number.",
      "A prompt appears on your phone — enter your MoMo PIN to approve. If it doesn't, dial *165# and check Approvals.",
      "To withdraw, go to Wallet → Withdraw, enter your MTN number, check the registered name shown, then confirm with your FE PIN.",
    ],
  },
  {
    name: "Airtel Money",
    code: "*185#",
    tone: "bg-destructive/15 text-destructive",
    steps: [
      "Make sure your Airtel line is registered for Airtel Money.",
      "In FlexiEarn, go to Wallet → Deposit, enter the amount and your Airtel number.",
      "Approve the prompt with your Airtel Money PIN. If it doesn't appear, dial *185# and check pending payments.",
      "To withdraw, go to Wallet → Withdraw, enter your Airtel number, check the registered name, then confirm with your FE PIN.",
    ],
  },
];

const FAQS = [
  { q: "Can I really make money online in Uganda with FlexiEarn?", a: "Yes. You earn UGX for completing videos, surveys, daily check-ins, referrals, gift codes and investment machines. Earnings go to your FlexiEarn wallet and can be withdrawn to mobile money." },
  { q: "Do I need a smartphone?", a: "Any phone with a web browser works. You can also install FlexiEarn as an app from your browser." },
  { q: "Which networks are supported?", a: "MTN Mobile Money and Airtel Money Uganda, for both deposits and withdrawals." },
  { q: "Why is there an activation fee?", a: "The one-time fee keeps out fake accounts and funds rewards for real members. You only pay it once." },
  { q: "How much can I earn per day?", a: "It depends on how many tasks are available and how active you are. Daily bonuses, tasks and referrals all add up — rewards are shown before you start each task." },
  { q: "How long do withdrawals take?", a: "Most withdrawals arrive within minutes. Some may need a quick admin check first." },
  { q: "Are there fees on withdrawals?", a: "A small processing fee may apply. It is always shown before you confirm." },
  { q: "Can I open more than one account?", a: "No. Only one account per person and device is allowed. Extra accounts are suspended automatically." },
  { q: "What is an FE PIN?", a: "A 4-digit PIN you set to protect withdrawals. Nobody can cash out from your wallet without it." },
];

export default function MakeMoneyGuide() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="min-h-screen bg-emerald-night flex flex-col">
      <SEO title="Make Money Online in Uganda — Step-by-Step Guide" description="How to make money online in Uganda with FlexiEarn: sign up, earn from tasks and surveys, and withdraw to MTN MoMo or Airtel Money. Includes FAQ." path="/make-money-online-uganda" type="article" />
      <Helmet><script type="application/ld+json">{JSON.stringify(faqLd)}</script></Helmet>

      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <PlatformLogo size="md" />
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Home</Button></Link>
      </header>

      <main className="container mx-auto max-w-3xl flex-1 space-y-14 px-4 pb-14">
        <section className="pt-4 text-center">
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Make Money Online <span className="text-gold-gradient">in Uganda</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">A simple guide to earning UGX from your phone and cashing out to MTN or Airtel mobile money.</p>
          <Button asChild size="lg" className="mt-6 rounded-full gradient-primary border-0 px-8 font-semibold text-primary-foreground"><Link to="/register">Start earning</Link></Button>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">How to start</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card-gold-glow rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><s.icon className="h-5 w-5" /></div>
                  <h3 className="font-semibold">{i + 1}. {s.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">MTN & Airtel steps</h2>
          {NETWORKS.map((n) => (
            <div key={n.name} className="card-neon rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{n.name}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${n.tone}`}>{n.code}</span>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {n.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Mobile money providers may charge small transaction fees. FlexiEarn shows any processing fee before you confirm.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="rounded-2xl border bg-card/60 px-4">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
