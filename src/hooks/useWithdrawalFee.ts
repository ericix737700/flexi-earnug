import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export interface WithdrawalFee {
  enabled: boolean;
  percent: number;
  min: number;
  note: string;
  /** fee charged on top of the requested amount */
  calculate: (amount: number) => number;
}

export function useWithdrawalFee(): WithdrawalFee {
  const { data: settings } = usePlatformSettings();

  const enabled = settings?.withdrawal_fee_enabled === "true";
  const percent = Number(settings?.withdrawal_fee_percent || 0);
  const min = Number(settings?.withdrawal_fee_min || 0);
  const note =
    settings?.withdrawal_fee_note ||
    "A small processing fee covers mobile money telecom charges and keeps the platform running smoothly.";

  const calculate = (amount: number) => {
    if (!enabled || !amount || amount <= 0) return 0;
    return Math.max(min, Math.round((amount * percent) / 100));
  };

  return { enabled, percent, min, note, calculate };
}
