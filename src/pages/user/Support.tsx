import { useState } from "react";
import { Link } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Bot, ExternalLink, MessageCircle, Send } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAuth } from "@/contexts/AuthContext";
import { ChatBot } from "@/components/user/ChatBot";
import { toast } from "sonner";

export default function Support() {
  const { data: settings } = usePlatformSettings();
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  const whatsappNumber = settings?.support_whatsapp;
  const telegramHandle = settings?.support_telegram;

  const openWhatsApp = () => {
    if (whatsappNumber) window.open(`https://wa.me/${whatsappNumber}`, "_blank");
    else toast.error("WhatsApp support not configured");
  };

  const openTelegram = () => {
    if (telegramHandle) {
      const link = telegramHandle.startsWith("http") ? telegramHandle : `https://t.me/${telegramHandle}`;
      window.open(link, "_blank");
    } else {
      toast.error("Telegram support not configured");
    }
  };

  return (
    <FeaturePage
      title="Help & Support"
      description={chatOpen ? "Chatting with the FlexiEarn assistant" : "Choose how you'd like to reach us"}
      bare={!user}
      backTo={user ? "/profile" : "/login"}
    >
      {chatOpen ? (
        <Card className="glass-card overflow-hidden border-0">
          <div className="h-[70vh] min-h-[420px]">
            <ChatBot onClose={() => setChatOpen(false)} />
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setChatOpen(true)}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Live Chat</p>
              <p className="text-sm text-muted-foreground">Chat with our AI assistant</p>
            </div>
          </button>

          <button
            onClick={openWhatsApp}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 transition-all hover:border-green-500 hover:bg-green-500/5 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">WhatsApp</p>
              <p className="text-sm text-muted-foreground">Chat with us on WhatsApp</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={openTelegram}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 transition-all hover:border-blue-500 hover:bg-blue-500/5 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Telegram</p>
              <p className="text-sm text-muted-foreground">Message us on Telegram</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          <Link
            to="/status"
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">System Status</p>
              <p className="text-sm text-muted-foreground">Check if there's an outage</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Card className="glass-card border-0">
            <CardContent className="py-4 text-xs text-muted-foreground">
              Our conversations are protected with 256-bit encryption. Never share your password with anyone —
              FlexiEarn staff will never ask for it.
            </CardContent>
          </Card>
        </div>
      )}

      {chatOpen && (
        <Button variant="outline" className="w-full rounded-xl" onClick={() => setChatOpen(false)}>
          Back to support options
        </Button>
      )}
    </FeaturePage>
  );
}
