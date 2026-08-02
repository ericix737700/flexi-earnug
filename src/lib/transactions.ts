export type TxCategory = {
  label: string;
  /** semantic tone used for badges */
  tone: "in" | "out" | "neutral";
};

const MAP: Record<string, string> = {
  earning: "Task Earning",
  task: "Task Earning",
  withdrawal: "Withdrawal",
  deposit: "Deposit",
  top_up: "Top Up",
  topup: "Top Up",
  admin_credit: "Admin Top-up",
  admin_debit: "Deduction",
  deduction: "Deduction",
  gift_code: "Gift Code",
  achievement: "Achievement",
  referral: "Referral Bonus",
  ad_payment: "Ad Payment",
  investment: "Machine Purchase",
  investment_purchase: "Machine Purchase",
  investment_reward: "Machine Maturity",
  investment_refund: "Machine Refund",
  checkin: "Daily Check-in",
};

export function transactionLabel(type: string, amount = 0): string {
  const mapped = MAP[type];
  if (mapped) return mapped;
  if (!type) return amount >= 0 ? "Credit" : "Debit";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function transactionCategory(type: string, amount: number): TxCategory {
  return {
    label: transactionLabel(type, amount),
    tone: amount > 0 ? "in" : amount < 0 ? "out" : "neutral",
  };
}

export function formatUGX(amount: number): string {
  return `UGX ${Math.abs(Number(amount) || 0).toLocaleString()}`;
}

export function formatTxDate(date: string): string {
  return new Date(date).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
