import { describe, expect, it } from "vitest";
import catalog from "../../.lovable/licensed-video-catalog.json";

describe("published video rewards", () => {
  const videos = catalog.videos.filter((video) => video.status === "published");
  it.each([20, 28, 30, 33, 45])("includes a UGX %i video", (reward) => {
    expect(videos.some((video) => video.reward_amount === reward)).toBe(true);
  });
});