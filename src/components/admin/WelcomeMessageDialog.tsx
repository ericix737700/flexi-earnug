import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Sparkles, Eye } from "lucide-react";
import { toast } from "sonner";

interface Props {
  settings: Record<string, string> | undefined;
  onSave: (key: string, value: string) => Promise<void>;
}

/** Converts an ISO string to the value format required by datetime-local inputs. */
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WelcomeMessageDialog({ settings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!open) return;
    setMessage(settings?.welcome_message || "");
    setStart(toLocalInput(settings?.welcome_message_start));
    setEnd(toLocalInput(settings?.welcome_message_end));
  }, [open, settings]);

  const publish = async () => {
    if (start && end && new Date(start) >= new Date(end)) {
      toast.error("The end date must be after the start date");
      return;
    }
    setSaving(true);
    try {
      await onSave("welcome_message", message.trim());
      await onSave("welcome_message_start", start ? new Date(start).toISOString() : "");
      await onSave("welcome_message_end", end ? new Date(end).toISOString() : "");
      toast.success("Welcome message published");
      setOpen(false);
    } catch {
      toast.error("Could not publish the welcome message");
    } finally {
      setSaving(false);
    }
  };

  const active = (() => {
    const now = Date.now();
    const s = start ? new Date(start).getTime() : null;
    const e = end ? new Date(end).getTime() : null;
    return (!s || now >= s) && (!e || now <= e);
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Sparkles className="mr-2 h-4 w-4" /> Configure Welcome Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome message</DialogTitle>
          <DialogDescription>
            Shown at the top of the user home screen during the activation window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Welcome to FlexiEarn. Introducing Investment Machines — invest once and your reward is credited automatically the moment your machine matures."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start (optional)</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End (optional)</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave both blank to show the message permanently.{" "}
            <span className={active ? "text-success" : "text-destructive"}>
              {active ? "Currently visible to users." : "Currently hidden from users."}
            </span>
          </p>

          <Button variant="outline" size="sm" onClick={() => setShowPreview((p) => !p)}>
            <Eye className="mr-2 h-4 w-4" /> {showPreview ? "Hide preview" : "Show preview"}
          </Button>

          {showPreview && (
            <Card className="relative overflow-hidden border-0 glass-card">
              <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
              <CardContent className="relative flex gap-3 py-4">
                <div className="h-fit rounded-xl bg-primary/15 p-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Hello, Sarah 👋</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {message.trim() || "Welcome to FlexiEarn. Introducing Investment Machines — invest once and your reward is credited automatically the moment your machine matures."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={publish} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
