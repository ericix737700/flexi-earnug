import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface SuccessAnimationProps {
  message: string;
  subMessage?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({ message, subMessage, onComplete }: SuccessAnimationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
    if (onComplete) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className={`flex flex-col items-center py-6 text-center transition-all duration-700 ${show ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-green-400/30" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle className="h-10 w-10 text-green-500" strokeWidth={2.5} />
        </div>
      </div>
      <h3 className="mt-4 text-xl font-bold">{message}</h3>
      {subMessage && <p className="mt-1 text-sm text-muted-foreground">{subMessage}</p>}
      
      {/* Confetti dots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full animate-bounce"
            style={{
              backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5],
              left: `${15 + Math.random() * 70}%`,
              top: `${10 + Math.random() * 60}%`,
              animationDelay: `${i * 100}ms`,
              animationDuration: `${800 + Math.random() * 400}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
