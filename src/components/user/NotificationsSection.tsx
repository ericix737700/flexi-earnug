 import { useState } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import {
   Bell,
   CheckCircle,
   XCircle,
   Megaphone,
   User,
   ArrowDownToLine,
   ArrowUpFromLine,
   Loader2,
   CheckCheck,
 } from "lucide-react";
 
 type NotificationType = "transaction" | "public" | "personal";
 
 interface Notification {
   id: string;
   user_id: string | null;
   title: string;
   message: string;
   notification_type: NotificationType;
   is_read: boolean;
   created_at: string;
 }
 
 export function NotificationsSection() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const { data: notifications, isLoading } = useQuery({
     queryKey: ["user-notifications", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("notifications")
         .select("*")
         .or(`user_id.eq.${user?.id},user_id.is.null`)
         .order("created_at", { ascending: false })
         .limit(50);
 
       if (error) throw error;
       return data as Notification[];
     },
     enabled: !!user,
   });
 
   const markAsReadMutation = useMutation({
     mutationFn: async (notificationId: string) => {
       const { error } = await supabase
         .from("notifications")
         .update({ is_read: true })
         .eq("id", notificationId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
     },
   });
 
   const markAllAsReadMutation = useMutation({
     mutationFn: async () => {
       const { error } = await supabase
         .from("notifications")
         .update({ is_read: true })
         .eq("user_id", user?.id)
         .eq("is_read", false);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
     },
   });
 
   const getNotificationIcon = (type: NotificationType, title: string) => {
     if (title.toLowerCase().includes("approved") || title.toLowerCase().includes("success")) {
       return <CheckCircle className="h-5 w-5 text-success" />;
     }
     if (title.toLowerCase().includes("rejected") || title.toLowerCase().includes("failed")) {
       return <XCircle className="h-5 w-5 text-destructive" />;
     }
     if (title.toLowerCase().includes("deposit")) {
       return <ArrowDownToLine className="h-5 w-5 text-success" />;
     }
     if (title.toLowerCase().includes("withdraw")) {
       return <ArrowUpFromLine className="h-5 w-5 text-primary" />;
     }
     switch (type) {
       case "public":
         return <Megaphone className="h-5 w-5 text-primary" />;
       case "personal":
         return <User className="h-5 w-5 text-accent" />;
       default:
         return <Bell className="h-5 w-5 text-muted-foreground" />;
     }
   };
 
   const getTypeBadge = (type: NotificationType) => {
     switch (type) {
       case "transaction":
         return <Badge variant="outline">Transaction</Badge>;
       case "public":
         return <Badge className="bg-primary/10 text-primary">Public</Badge>;
       case "personal":
         return <Badge className="bg-accent/10 text-accent-foreground">Personal</Badge>;
       default:
         return null;
     }
   };
 
   const formatDate = (date: string) => {
     const now = new Date();
     const notifDate = new Date(date);
     const diffMs = now.getTime() - notifDate.getTime();
     const diffMins = Math.floor(diffMs / 60000);
     const diffHours = Math.floor(diffMs / 3600000);
     const diffDays = Math.floor(diffMs / 86400000);
 
     if (diffMins < 1) return "Just now";
     if (diffMins < 60) return `${diffMins}m ago`;
     if (diffHours < 24) return `${diffHours}h ago`;
     if (diffDays < 7) return `${diffDays}d ago`;
     return notifDate.toLocaleDateString("en-UG", {
       day: "numeric",
       month: "short",
     });
   };
 
   const unreadCount = notifications?.filter((n) => !n.is_read && n.user_id).length || 0;
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between pb-2">
         <CardTitle className="flex items-center gap-2 text-base">
           <Bell className="h-5 w-5" />
           Notifications
           {unreadCount > 0 && (
             <Badge className="bg-destructive">{unreadCount}</Badge>
           )}
         </CardTitle>
         {unreadCount > 0 && (
           <Button
             variant="ghost"
             size="sm"
             onClick={() => markAllAsReadMutation.mutate()}
             disabled={markAllAsReadMutation.isPending}
           >
             <CheckCheck className="mr-1 h-4 w-4" />
             Mark all read
           </Button>
         )}
       </CardHeader>
       <CardContent className="p-0">
         {isLoading ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
           </div>
         ) : notifications?.length === 0 ? (
           <div className="py-8 text-center text-muted-foreground">
             No notifications yet
           </div>
         ) : (
           <ScrollArea className="h-[300px]">
             <div className="divide-y">
               {notifications?.map((notification) => (
                 <div
                   key={notification.id}
                   className={`flex items-start gap-3 p-4 transition-colors ${
                     !notification.is_read && notification.user_id
                       ? "bg-primary/5"
                       : ""
                   }`}
                   onClick={() => {
                     if (!notification.is_read && notification.user_id) {
                       markAsReadMutation.mutate(notification.id);
                     }
                   }}
                 >
                   <div className="mt-0.5">
                     {getNotificationIcon(notification.notification_type, notification.title)}
                   </div>
                   <div className="flex-1 space-y-1">
                     <div className="flex items-center justify-between gap-2">
                       <p className="font-medium leading-tight">
                         {notification.title}
                       </p>
                       {getTypeBadge(notification.notification_type)}
                     </div>
                     <p className="text-sm text-muted-foreground">
                       {notification.message}
                     </p>
                     <p className="text-xs text-muted-foreground">
                       {formatDate(notification.created_at)}
                     </p>
                   </div>
                   {!notification.is_read && notification.user_id && (
                     <div className="h-2 w-2 rounded-full bg-primary" />
                   )}
                 </div>
               ))}
             </div>
           </ScrollArea>
         )}
       </CardContent>
     </Card>
   );
 }