import { usePlatformLogo } from "@/hooks/usePlatformLogo";

export function LoadingScreen() {
  const logoUrl = usePlatformLogo();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <div className="relative">
        <div className="absolute -inset-4 animate-ping rounded-full bg-primary/20" />
        <div className="relative h-20 w-20 animate-pulse">
          {logoUrl ? (
            <img src={logoUrl} alt="Loading" className="h-20 w-20 rounded-full object-cover shadow-lg" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg">
              <span className="text-2xl font-bold text-primary-foreground">FE</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 flex items-center gap-2">
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
}
