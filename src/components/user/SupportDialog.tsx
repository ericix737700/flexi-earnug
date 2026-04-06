import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageCircle, Send, ExternalLink } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { data: settings } = usePlatformSettings();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>Choose how you'd like to reach us</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
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
  );
}
