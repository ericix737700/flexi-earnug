export type NotificationFilter = "all" | "unread" | "transaction" | "updates";

export interface InboxNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

// Broadcasts do not have a per-user read receipt in the existing system.
export function isUnreadNotification(notification: InboxNotification) {
  return Boolean(notification.user_id) && !notification.is_read;
}

export function filterNotifications(notifications: InboxNotification[], filter: NotificationFilter) {
  return notifications.filter((notification) => {
    if (filter === "unread") return isUnreadNotification(notification);
    if (filter === "transaction") return notification.notification_type === "transaction";
    if (filter === "updates") return notification.notification_type !== "transaction";
    return true;
  });
}

export function notificationDateGroup(date: string, now = new Date()) {
  const value = new Date(date);
  if (value.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday";
  return "Earlier";
}