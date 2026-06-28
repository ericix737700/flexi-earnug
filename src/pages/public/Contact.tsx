import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformLogo } from "@/components/PlatformLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { SEO } from "@/components/SEO";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { ArrowLeft, MessageCircle, Send, Mail, Phone } from "lucide-react";

export default function Contact() {
  const { data: settings } = usePlatformSettings();
  const whatsapp = settings?.support_whatsapp;
  const telegram = settings?.support_telegram;
  const email = settings?.support_email;
  const phone = settings?.support_phone;

  const channels = [
    whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: whatsapp,
      href: `https://wa.me/${String(whatsapp).replace(/\D/g, "")}`,
      color: "text-green-600 bg-green-500/10",
    },
    telegram && {
      icon: Send,
      label: "Telegram",
      value: telegram,
      href: telegram.startsWith("http") ? telegram : `https://t.me/${String(telegram).replace(/^@/, "")}`,
      color: "text-sky-600 bg-sky-500/10",
    },
    email && {
      icon: Mail,
      label: "Email",
      value: email,
      href: `mailto:${email}`,
      color: "text-primary bg-primary/10",
    },
    phone && {
      icon: Phone,
      label: "Phone",
      value: phone,
      href: `tel:${phone}`,
      color: "text-amber-600 bg-amber-500/10",
    },
  ].filter(Boolean) as Array<{ icon: any; label: string; value: string; href: string; color: string }>;

  return (
    <div className="min-h-screen app-bg flex flex-col">
      <SEO title="Contact FlexiEarn Support" description="Reach FlexiEarn Uganda support via WhatsApp, Telegram, email or phone. We're here to help." path="/contact" />

      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <PlatformLogo size="md" />
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Home</Button></Link>
      </header>

      <main className="container mx-auto flex-1 px-4 pb-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-gradient-primary md:text-5xl">Get in Touch</h1>
          <p className="mt-3 text-muted-foreground">
            Our team typically responds within 30 minutes during business hours. Pick the channel that suits you.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
          {channels.length === 0 && (
            <Card className="glass-card sm:col-span-2">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Support channels haven't been configured yet. Please check back soon.
              </CardContent>
            </Card>
          )}
          {channels.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noreferrer">
              <Card className="glass-card transition hover:scale-[1.02] hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.color}`}>
                    <c.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{c.label}</p>
                    <p className="text-sm text-muted-foreground break-all">{c.value}</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          For account-specific issues, please log in first so our team can verify your identity quickly.
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
