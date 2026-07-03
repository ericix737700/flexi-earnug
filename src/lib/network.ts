// Uganda mobile network detection from phone number prefix.
export type NetworkProvider = "mtn" | "airtel" | "utl" | "lycamobile" | "unknown";

/** Prefix → provider. Uses last 9 digits (strip leading 0 / country code). */
const PREFIX_MAP: Record<string, NetworkProvider> = {
  // MTN Uganda
  "77": "mtn", "78": "mtn", "76": "mtn", "39": "mtn", "31": "mtn", "25": "mtn",
  // Airtel Uganda (formerly Warid/Zain)
  "70": "airtel", "75": "airtel", "74": "airtel", "20": "airtel", "45": "airtel",
  // UTL / Lycamobile
  "71": "utl",
  "72": "lycamobile",
};

export function detectNetwork(rawPhone?: string | null): NetworkProvider {
  if (!rawPhone) return "unknown";
  let digits = String(rawPhone).replace(/\D/g, "");
  // strip country code 256 or leading 0
  if (digits.startsWith("256")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  const p = digits.slice(0, 2);
  return PREFIX_MAP[p] || "unknown";
}

export const NETWORK_LABEL: Record<NetworkProvider, string> = {
  mtn: "MTN",
  airtel: "Airtel",
  utl: "UTL",
  lycamobile: "Lycamobile",
  unknown: "Unknown",
};

export const NETWORK_COLOR: Record<NetworkProvider, string> = {
  mtn: "bg-[#FFCC00] text-black",              // MTN yellow
  airtel: "bg-[#E60000] text-white",           // Airtel red
  utl: "bg-blue-600 text-white",
  lycamobile: "bg-orange-500 text-white",
  unknown: "bg-muted text-muted-foreground",
};
