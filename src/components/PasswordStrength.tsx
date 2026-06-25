import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

const rules = [
  { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "num", label: "One number", test: (p: string) => /\d/.test(p) },
  { id: "sym", label: "One symbol (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function evaluatePassword(p: string) {
  const passed = rules.filter((r) => r.test(p)).length;
  return { passed, total: rules.length };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-muted" };
    const passed = rules.filter((r) => r.test(password)).length;
    if (passed <= 2) return { score: 1, label: "Weak", color: "bg-destructive" };
    if (passed === 3) return { score: 2, label: "Fair", color: "bg-orange-500" };
    if (passed === 4) return { score: 3, label: "Good", color: "bg-yellow-500" };
    return { score: 4, label: "Strong", color: "bg-green-500" };
  }, [password]);

  if (!password) {
    return (
      <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            {r.label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= score ? color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          Strength: <span className="text-foreground">{label}</span>
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {rules.map((r) => {
          const ok = r.test(password);
          return (
            <li
              key={r.id}
              className={`flex items-center gap-1.5 ${
                ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              }`}
            >
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
