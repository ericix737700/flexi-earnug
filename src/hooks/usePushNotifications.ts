import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (user && isSupported) {
      checkSubscription();
    }
  }, [user, isSupported]);

  const checkSubscription = async () => {
    try {
      if (!user) return;
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .single();
      setIsSubscribed(!!data);
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Notification permission denied");
        return;
      }
      toast.success("Push notifications enabled");
      setIsSubscribed(true);
    } catch (error) {
      toast.error("Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      if (user) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id);
      }
      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch {
      toast.error("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe };
}
