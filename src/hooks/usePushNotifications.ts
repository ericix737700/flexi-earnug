import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Fallback only — the live key is fetched from the backend so it always matches
// the key the push sender signs with.
const FALLBACK_VAPID_KEY =
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

async function getServerVapidKey(): Promise<string> {
  try {
    const { data } = await supabase.functions.invoke("get-vapid-key");
    if (data?.publicKey) return data.publicKey as string;
  } catch {
    /* fall through */
  }
  return FALLBACK_VAPID_KEY;
}

async function getPushRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported on this browser");
  }
  const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
  if (existing) return existing;
  return await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

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
      const sub = await reg.pushManager.getSubscription();
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
    setLastError(null);
    try {
      if (!window.isSecureContext) {
        throw new Error("Push needs a secure (https) connection");
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error("Notification permission was not granted");
      }

      const reg = await getPushRegistration();
      await navigator.serviceWorker.ready.catch(() => undefined);

      const vapidKey = await getServerVapidKey();
      let sub = await reg.pushManager.getSubscription();

      if (sub) {
        // If the stored subscription used a different key, replace it.
        const current = bufToB64(sub.options?.applicationServerKey ?? null);
        const wanted = bufToB64(urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer);
        if (current && wanted && current !== wanted) {
          await sub.unsubscribe().catch(() => undefined);
          sub = null;
        }
      }

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
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
      if (error) throw new Error(error.message);

      setIsSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to enable notifications";
      console.error("Push subscribe failed:", err);
      setLastError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const reg = await getPushRegistration();
      const sub = await reg.pushManager.getSubscription();
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, isSubscribed, permission, isLoading, lastError, subscribe, unsubscribe };
}
