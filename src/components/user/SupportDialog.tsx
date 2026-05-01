import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MessageCircle, Send, ExternalLink, Bot } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { ChatBot } from "./ChatBot";
import { toast } from "sonner";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { data: settings } = usePlatformSettings();
  const [chatOpen, setChatOpen] = useState(false);

  const whatsappNumber = settings?.support_whatsapp;
  const telegramHandle = settings?.support_telegram;

  const openWhatsApp = () => {
    if (whatsappNumber) {
      window.open(`https://wa.me/${whatsappNumber}`, "_blank");
    } else {
      toast.error("WhatsApp support not configured");
    }
  };

  const openTelegram = () => {
    if (telegramHandle) {
      const link = telegramHandle.startsWith("http")
        ? telegramHandle
        : `https://t.me/${telegramHandle}`;
      window.open(link, "_blank");
    } else {
      toast.error("Telegram support not configured");
    }
  };

  const openChat = () => {
    onOpenChange(false);
    setChatOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card border-0 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Help & Support</DialogTitle>
            <DialogDescription>Choose how you'd like to reach us</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* AI Chat */}
            <button
              onClick={openChat}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-border p-4 transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Live Chat</p>
                <p className="text-sm text-muted-foreground">Chat with our AI assistant</p>
              </div>
            </button>

            {/* WhatsApp */}
            <button
              onClick={openWhatsApp}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-border p-4 transition-all hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 active:scale-[0.98]"
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

            {/* Telegram */}
            <button
              onClick={openTelegram}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-border p-4 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 active:scale-[0.98]"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chat Sheet */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <ChatBot onClose={() => setChatOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
