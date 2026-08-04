import logo from "@/assets/logo.png";

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

/** Permanent brand mark — same asset used for the favicon and app icons. */
export function PlatformLogo({ className = "", size = "md" }: PlatformLogoProps) {
  return (
    <img
      src={logo}
      alt="FlexiEarn logo"
      width={1024}
      height={1024}
      loading="lazy"
      className={`${sizeMap[size]} rounded-full object-contain ${className}`}
    />
  );
}
