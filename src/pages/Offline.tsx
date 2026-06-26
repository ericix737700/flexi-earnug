import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformLogo } from "@/components/PlatformLogo";

export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-sm w-full text-center space-y-5">
        <PlatformLogo size="lg" className="mx-auto" />
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto">
          <WifiOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">You're offline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your connection. FlexiEarn will reconnect automatically.
          </p>
        </div>
        <Button onClick={() => window.location.reload()} className="w-full">
          Try again
        </Button>
      </div>
    </div>
  );
}
