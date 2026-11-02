import { z } from "zod";

export const loginEntrySchema = z.object({
  mode: z.enum(["phone", "email"]),
  identifier: z.string().trim().min(1, "Enter your phone number or email").max(255),
  password: z.string().min(1, "Enter your password").max(128),
}).superRefine((data, ctx) => {
  if (data.mode === "phone" && !/^\d{10,12}$/.test(data.identifier.replace(/\D/g, ""))) {
    ctx.addIssue({ code: "custom", path: ["identifier"], message: "Enter your registered Ugandan phone number" });
  }
  if (data.mode === "email" && !z.string().email().safeParse(data.identifier).success) {
    ctx.addIssue({ code: "custom", path: ["identifier"], message: "Enter a valid email address" });
  }
});

export const registrationEntrySchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().regex(/^\d{10,12}$/, "Enter your registered Ugandan phone number"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must contain at least 8 characters").max(128),
  acceptedTerms: z.boolean().refine((accepted) => accepted, "Agree to the Terms and Privacy Policy to continue"),
});

// This preference selects persistent or tab-scoped session storage without changing
// the managed auth client. Only the preference, never a password, is stored here.
export const SESSION_PREFERENCE_KEY = "flexiearn_session_only";
export const TAB_SESSION_KEY = "flexiearn_tab_session";

export function setRememberedDevice(remember: boolean) {
  if (remember) {
    localStorage.removeItem(SESSION_PREFERENCE_KEY);
    sessionStorage.removeItem(TAB_SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_PREFERENCE_KEY, "true");
    sessionStorage.setItem(TAB_SESSION_KEY, "true");
  }
}

export function shouldEndTabSession() {
  return localStorage.getItem(SESSION_PREFERENCE_KEY) === "true" && sessionStorage.getItem(TAB_SESSION_KEY) !== "true";
}