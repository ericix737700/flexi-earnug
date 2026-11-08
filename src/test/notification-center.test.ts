import { describe, expect, it } from "vitest";
import { filterNotifications, notificationDateGroup, type InboxNotification } from "@/lib/notification-center";

const notifications: InboxNotification[] = [
  { id: "1", user_id: "user", title: "Deposit", message: "Paid", notification_type: "transaction", is_read: false, created_at: "2026-11-08T12:00:00Z" },
  { id: "2", user_id: null, title: "News", message: "Update", notification_type: "public", is_read: false, created_at: "2026-11-07T12:00:00Z" },
  { id: "3", user_id: "user", title: "Welcome", message: "Hello", notification_type: "personal", is_read: true, created_at: "2026-11-01T12:00:00Z" },
];

describe("notification inbox", () => {
  it("only counts unread personal alerts, not shared broadcasts", () => {
    expect(filterNotifications(notifications, "unread").map((n) => n.id)).toEqual(["1"]);
  });
  it("separates transactions from platform and personal updates", () => {
    expect(filterNotifications(notifications, "transaction").map((n) => n.id)).toEqual(["1"]);
    expect(filterNotifications(notifications, "updates").map((n) => n.id)).toEqual(["2", "3"]);
  });
  it("groups dates without treating a recent prior calendar day as today", () => {
    const now = new Date("2026-11-08T16:00:00Z");
    expect(notifications.map((n) => notificationDateGroup(n.created_at, now))).toEqual(["Today", "Yesterday", "Earlier"]);
  });
});