import { usePlatformLogo } from "@/hooks/usePlatformLogo";

interface PlatformLogoProps {
  className?: string;
  fallbackText?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const textSizeMap = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

export function PlatformLogo({ className = "", fallbackText = "FE", size = "md" }: PlatformLogoProps) {
  const logoUrl = usePlatformLogo();

  if (logoUrl) {
    return (
      <img
        src={`${logoUrl}?t=${Date.now()}`}
        alt="Platform Logo"
        className={`${sizeMap[size]} rounded-full object-cover ${className}`}
        crossOrigin="anonymous"
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-primary ${className}`}
    >
      <span className={`${textSizeMap[size]} font-bold text-primary-foreground`}>
        {fallbackText}
      </span>
    </div>
  );
}
