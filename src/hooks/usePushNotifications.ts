import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY =
  "BB1wRTiWUmJOddQCrMuKK7UF9bqgOwrkrgB7HfNuOhVDxsKQBbIYipr1eqcPBpNm_7lZ2M-qUzvaXzpKFwj0Lfg";
const PUSH_SW_URL = "/push-sw.js";
const PUSH_SW_SCOPE = "/push-scope/";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufToB64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
    if (existing) return existing;
    return await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });
  } catch {
    return null;
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!user || !isSupported) return;
    try {
      const reg = await getPushRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, [user, isSupported]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Notification permission denied");
        return;
      }
      const reg = await getPushRegistration();
      if (!reg) {
        toast.error("Service worker unavailable");
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const p256dh = bufToB64(sub.getKey("p256dh"));
      const auth = bufToB64(sub.getKey("auth"));

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh,
          auth,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setIsSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const reg = await getPushRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);
        }
      } else if (user) {
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
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
