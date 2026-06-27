 import { useState } from "react";
 import { AdminLayout } from "@/components/layout/AdminLayout";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import { supabase } from "@/integrations/supabase/client";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { toast } from "sonner";
 import {
   Bell,
   Megaphone,
   User,
   Plus,
   Loader2,
   Trash2,
 } from "lucide-react";
 
 type NotificationType = "transaction" | "public" | "personal";

 import { Checkbox } from "@/components/ui/checkbox";

 interface Notification {
   id: string;
   user_id: string | null;
   title: string;
   message: string;
   notification_type: NotificationType;
   is_read: boolean;
   created_at: string;
 }
 
 interface Profile {
   user_id: string;
   full_name: string | null;
   phone: string;
 }
 
 export default function AdminNotifications() {
   const queryClient = useQueryClient();
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const [title, setTitle] = useState("");
   const [message, setMessage] = useState("");
   const [notificationType, setNotificationType] = useState<NotificationType>("public");
   const [selectedUserId, setSelectedUserId] = useState<string>("");
   const [alsoPush, setAlsoPush] = useState(true);
 
   // Fetch all notifications
   const { data: notifications, isLoading } = useQuery({
     queryKey: ["admin-notifications"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("notifications")
         .select("*")
         .order("created_at", { ascending: false })
         .limit(100);
 
       if (error) throw error;
       return data as Notification[];
     },
   });
 
   // Fetch users for personal notifications
   const { data: users } = useQuery({
     queryKey: ["admin-users-list"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("profiles")
         .select("user_id, full_name, phone")
         .order("full_name");
 
       if (error) throw error;
       return data as Profile[];
     },
   });
 
   // Create notification
   const createMutation = useMutation({
     mutationFn: async () => {
       const notificationData: {
         title: string;
         message: string;
         notification_type: NotificationType;
         user_id?: string | null;
       } = {
         title,
         message,
         notification_type: notificationType,
       };
 
       // For public notifications, user_id is null
       // For personal notifications, set the specific user
       if (notificationType === "personal" && selectedUserId) {
         notificationData.user_id = selectedUserId;
       } else if (notificationType === "public") {
         notificationData.user_id = null;
       }
 
        const { error } = await supabase
          .from("notifications")
          .insert(notificationData);

        if (error) throw error;

        if (alsoPush) {
          const payload: Record<string, unknown> = { title, body: message };
          if (notificationType === "public") payload.broadcast = true;
          else if (notificationType === "personal") payload.user_id = selectedUserId;
          try {
            await supabase.functions.invoke("send-push", { body: payload });
          } catch (e) {
            console.warn("send-push failed", e);
          }
        }
      },
     onSuccess: () => {
       toast.success("Notification sent successfully");
       setIsCreateOpen(false);
       setTitle("");
       setMessage("");
       setNotificationType("public");
       setSelectedUserId("");
       queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
     },
     onError: () => {
       toast.error("Failed to send notification");
     },
   });
 
   // Delete notification
   const deleteMutation = useMutation({
     mutationFn: async (notificationId: string) => {
       const { error } = await supabase
         .from("notifications")
         .delete()
         .eq("id", notificationId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Notification deleted");
       queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
     },
     onError: () => {
       toast.error("Failed to delete notification");
     },
   });
 
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
 
   const getTypeIcon = (type: NotificationType) => {
     switch (type) {
       case "public":
         return <Megaphone className="h-4 w-4" />;
       case "personal":
         return <User className="h-4 w-4" />;
       default:
         return <Bell className="h-4 w-4" />;
     }
   };
 
   const formatDate = (date: string) => {
     return new Date(date).toLocaleDateString("en-UG", {
       day: "numeric",
       month: "short",
       year: "numeric",
       hour: "2-digit",
       minute: "2-digit",
     });
   };
 
   return (
     <AdminLayout>
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold">Notifications</h1>
             <p className="text-muted-foreground">
               Send and manage user notifications
             </p>
           </div>
           <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
             <DialogTrigger asChild>
               <Button>
                 <Plus className="mr-2 h-4 w-4" />
                 New Notification
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Send Notification</DialogTitle>
                 <DialogDescription>
                   Create a new notification for users
                 </DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4">
                 <div className="space-y-2">
                   <Label>Type</Label>
                   <Select
                     value={notificationType}
                     onValueChange={(v) => setNotificationType(v as NotificationType)}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="public">
                         <div className="flex items-center gap-2">
                           <Megaphone className="h-4 w-4" />
                           Public (All Users)
                         </div>
                       </SelectItem>
                       <SelectItem value="personal">
                         <div className="flex items-center gap-2">
                           <User className="h-4 w-4" />
                           Personal (Specific User)
                         </div>
                       </SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
 
                 {notificationType === "personal" && (
                   <div className="space-y-2">
                     <Label>Select User</Label>
                     <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select a user" />
                       </SelectTrigger>
                       <SelectContent>
                         {users?.map((user) => (
                           <SelectItem key={user.user_id} value={user.user_id}>
                             {user.full_name || user.phone}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
 
                 <div className="space-y-2">
                   <Label>Title</Label>
                   <Input
                     placeholder="Notification title"
                     value={title}
                     onChange={(e) => setTitle(e.target.value)}
                   />
                 </div>
 
                 <div className="space-y-2">
                   <Label>Message</Label>
                   <Textarea
                     placeholder="Notification message"
                     value={message}
                     onChange={(e) => setMessage(e.target.value)}
                   />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={alsoPush}
                      onCheckedChange={(v) => setAlsoPush(v === true)}
                    />
                    Also send as push notification
                  </label>

 
                 <Button
                   className="w-full"
                   onClick={() => createMutation.mutate()}
                   disabled={
                     createMutation.isPending ||
                     !title ||
                     !message ||
                     (notificationType === "personal" && !selectedUserId)
                   }
                 >
                   {createMutation.isPending ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Sending...
                     </>
                   ) : (
                     "Send Notification"
                   )}
                 </Button>
               </div>
             </DialogContent>
           </Dialog>
         </div>
 
         {/* Notifications Table */}
         <Card>
           <CardContent className="p-0">
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
               </div>
             ) : notifications?.length === 0 ? (
               <div className="py-8 text-center text-muted-foreground">
                 No notifications sent yet
               </div>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Type</TableHead>
                     <TableHead>Title</TableHead>
                     <TableHead>Message</TableHead>
                     <TableHead>Date</TableHead>
                     <TableHead>Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {notifications?.map((notification) => (
                     <TableRow key={notification.id}>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           {getTypeIcon(notification.notification_type)}
                           {getTypeBadge(notification.notification_type)}
                         </div>
                       </TableCell>
                       <TableCell className="font-medium">
                         {notification.title}
                       </TableCell>
                       <TableCell className="max-w-xs truncate">
                         {notification.message}
                       </TableCell>
                       <TableCell>{formatDate(notification.created_at)}</TableCell>
                       <TableCell>
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => deleteMutation.mutate(notification.id)}
                           disabled={deleteMutation.isPending}
                         >
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </CardContent>
         </Card>
       </div>
     </AdminLayout>
   );
 }