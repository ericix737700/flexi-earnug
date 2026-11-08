import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle2, XCircle, Megaphone, User, ArrowDownToLine, ArrowUpFromLine, Loader2, CheckCheck, RefreshCw, Inbox, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { filterNotifications, isUnreadNotification, notificationDateGroup, type InboxNotification, type NotificationFilter } from "@/lib/notification-center";

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "unread", label: "Unread" },
  { value: "transaction", label: "Transactions" }, { value: "updates", label: "Updates" },
];

function notificationIcon(notification: InboxNotification) {
  const title = notification.title.toLowerCase();
  if (title.includes("rejected") || title.includes("failed")) return <XCircle className="h-5 w-5 text-destructive" />;
  if (title.includes("deposit")) return <ArrowDownToLine className="h-5 w-5 text-success" />;
  if (title.includes("withdraw")) return <ArrowUpFromLine className="h-5 w-5 text-primary" />;
  if (title.includes("approved") || title.includes("success")) return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (notification.notification_type === "public") return <Megaphone className="h-5 w-5 text-primary" />;
  if (notification.notification_type === "personal") return <User className="h-5 w-5 text-primary" />;
  return <Bell className="h-5 w-5 text-primary" />;
}

export function NotificationsSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { data: notifications = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("notifications").select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as InboxNotification[];
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string | undefined) => {
      if (!user) throw new Error("Please sign in again");
      let request = supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      if (id) request = request.eq("id", id);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
    onError: () => toast.error("Couldn't mark notifications as read. Please try again."),
  });

  const unreadCount = notifications.filter(isUnreadNotification).length;
  const visible = filterNotifications(notifications, filter);
  const groups = ["Today", "Yesterday", "Earlier"].map((label) => ({
    label, items: visible.filter((notification) => notificationDateGroup(notification.created_at) === label),
  })).filter((group) => group.items.length > 0);

  return (
    <section aria-label="Notification inbox" className="space-y-5">
      <div className="flex items-center gap-3 border-b pb-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Bell className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">Your inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{isLoading ? "Loading your alerts…" : isError ? "Alerts unavailable" : unreadCount ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}` : "You're all caught up"}</p>
        </div>
        <Button variant="outline" size="icon" className="shrink-0 rounded-lg" aria-label="Refresh notifications" title="Refresh notifications" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Filter notifications">
        {FILTERS.map((item) => <Button key={item.value} variant={filter === item.value ? "default" : "ghost"} size="sm" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className="h-10 min-w-0 px-1 text-xs sm:text-sm">{item.label}</Button>)}
      </div>
      {unreadCount > 0 && !isError && <div className="flex justify-end"><Button variant="ghost" size="sm" className="text-primary" disabled={markRead.isPending} onClick={() => markRead.mutate(undefined)}>
        {markRead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}Mark all as read
      </Button></div>}
      {isLoading ? <div className="space-y-3" aria-label="Loading notifications">{[1, 2, 3].map((i) => <div key={i} className="flex gap-3 rounded-lg border bg-card p-4"><Skeleton className="h-10 w-10 shrink-0 rounded-lg" /><div className="flex-1 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>
        : isError ? <div role="alert" className="flex flex-col items-center py-12 text-center"><AlertCircle className="mb-4 h-9 w-9 text-destructive" /><h3 className="font-semibold">Couldn't load your notifications</h3><p className="mt-2 text-sm text-muted-foreground">Please check your connection and try again.</p><Button variant="outline" className="mt-5" onClick={() => refetch()}>Try again</Button></div>
        : visible.length === 0 ? <div className="flex flex-col items-center py-14 text-center"><div className="mb-4 rounded-full bg-accent p-5 text-accent-foreground"><Inbox className="h-8 w-8" /></div><h3 className="font-semibold">{filter === "unread" ? "All caught up" : "No notifications yet"}</h3><p className="mt-2 max-w-xs text-sm text-muted-foreground">{filter === "unread" ? "You have no unread alerts." : filter === "all" ? "Your account alerts and platform updates will appear here." : "No notifications in this category."}</p></div>
        : <div className="space-y-6">{groups.map((group) => <section key={group.label} aria-label={group.label}>
          <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{group.label}</h3>
          <div className="space-y-2">{group.items.map((notification) => {
            const unread = isUnreadNotification(notification);
            return <article key={notification.id} className={`rounded-lg border p-4 ${unread ? "border-primary/25 bg-accent/40" : "bg-card"}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card">{notificationIcon(notification)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2"><h4 className="min-w-0 flex-1 break-words text-sm font-semibold leading-5">{notification.title}</h4>{unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}</div>
                  <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">{notification.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-md bg-card text-[10px] font-medium">{notification.notification_type === "transaction" ? "Transaction" : notification.notification_type === "public" ? "Announcement" : "Personal"}</Badge>
                    <time dateTime={notification.created_at} title={new Date(notification.created_at).toLocaleString("en-UG")} className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</time>
                  </div>
                  {unread && <Button variant="ghost" size="sm" className="mt-2 h-8 px-0 text-xs text-primary hover:bg-transparent" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}><Check className="mr-1.5 h-3.5 w-3.5" />Mark as read</Button>}
                </div>
              </div>
            </article>;
          })}</div>
        </section>)}</div>}
    </section>
  );
}
