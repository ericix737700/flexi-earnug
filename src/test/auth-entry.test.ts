import { beforeEach, describe, expect, it } from "vitest";
import { registrationEntrySchema, setRememberedDevice, shouldEndTabSession } from "@/lib/auth-entry";

const registration = { fullName: "Test Member", phone: "0700123456", email: "member@example.com", password: "Example123!" };

describe("registration trust essentials", () => {
  it("requires agreement to Terms and Privacy before account creation", () => {
    expect(registrationEntrySchema.safeParse({ ...registration, acceptedTerms: false }).success).toBe(false);
    expect(registrationEntrySchema.safeParse({ ...registration, acceptedTerms: true }).success).toBe(true);
  });
  it("requires an email address", () => {
    expect(registrationEntrySchema.safeParse({ ...registration, email: "", acceptedTerms: true }).success).toBe(false);
  });
});

describe("remembered-device choice", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("keeps remembered sessions after the tab ends", () => {
    setRememberedDevice(true);
    sessionStorage.clear();
    expect(shouldEndTabSession()).toBe(false);
  });
  it("ends an unremembered session when its tab session is gone", () => {
    setRememberedDevice(false);
    expect(shouldEndTabSession()).toBe(false);
    sessionStorage.clear();
    expect(shouldEndTabSession()).toBe(true);
  });
});