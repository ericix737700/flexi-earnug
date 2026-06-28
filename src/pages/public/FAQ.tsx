import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlatformLogo } from "@/components/PlatformLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { SEO } from "@/components/SEO";
import { ArrowLeft } from "lucide-react";

const FAQS = [
  { q: "What is FlexiEarn?", a: "FlexiEarn is a Uganda-based smart earning platform where you can earn through investments, daily tasks, referrals, and gift codes — paid out in UGX via mobile money." },
  { q: "How do I create an account?", a: "Tap Register, provide your phone number and email, set a password, and complete the one-time activation payment to unlock all earning features." },
  { q: "How do I withdraw my earnings?", a: "Go to Wallet → Withdraw, enter your mobile money number and amount. We verify the recipient name before sending. Withdrawals are processed automatically or by an admin depending on platform settings." },
  { q: "Are there fees?", a: "A small transaction fee from the mobile money provider may apply on deposits and withdrawals. This is shown before you confirm." },
  { q: "How does the referral program work?", a: "Share your referral code. When friends join and activate their account, you earn a referral bonus instantly." },
  { q: "What are gift codes?", a: "Gift codes are limited-use codes that credit your balance instantly. Admins generate them and share them across our community channels." },
  { q: "Is my data secure?", a: "Yes — your session is encrypted in transit (TLS), and sensitive operations are protected by row-level security and authenticated edge functions." },
  { q: "I was charged but my deposit is still pending. What do I do?", a: "Most deposits confirm within a minute. If it remains pending, tap Contact Support from the activation or wallet page with your transaction reference and we'll resolve it." },
];

export default function FAQ() {
  return (
    <div className="min-h-screen app-bg flex flex-col">
      <SEO title="Frequently Asked Questions" description="Answers to common questions about FlexiEarn Uganda — accounts, deposits, withdrawals, referrals, gift codes, and security." path="/faq" />

      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <PlatformLogo size="md" />
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Home</Button></Link>
      </header>

      <main className="container mx-auto flex-1 px-4 pb-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-center text-4xl font-bold text-gradient-primary md:text-5xl">FAQs</h1>
          <p className="mt-3 text-center text-muted-foreground">Everything you need to know about earning with FlexiEarn.</p>

          <Accordion type="single" collapsible className="mt-8 glass-card rounded-2xl px-4">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Didn't find your answer? <Link to="/contact" className="font-semibold text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
