import { describe, expect, it } from "vitest";
import { canCountVideoWatch } from "@/lib/video-watch";

describe("video feed watch progress", () => {
  it("counts only the visible, playing video after a successful start", () => {
    expect(canCountVideoWatch(true, true, true, true, false)).toBe(true);
    expect(canCountVideoWatch(false, true, true, true, false)).toBe(false);
    expect(canCountVideoWatch(true, false, true, true, false)).toBe(false);
    expect(canCountVideoWatch(true, true, false, true, false)).toBe(false);
    expect(canCountVideoWatch(true, true, true, false, false)).toBe(false);
    expect(canCountVideoWatch(true, true, true, true, true)).toBe(false);
  });
});