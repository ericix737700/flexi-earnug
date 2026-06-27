// Sends Web Push to one user, a list of users, or all subscribers.
// Body: { user_id?: string, user_ids?: string[], broadcast?: boolean, title: string, body: string, url?: string, tag?: string }
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@flexiearn.ug";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { user_id, user_ids, broadcast, title, body: msgBody, url, tag } = body || {};

    if (!title || !msgBody) {
      return json({ success: false, error: "title and body required" }, 400);
    }

    // Auth: must be either admin (caller) OR called from another edge function with service role
    const authHeader = req.headers.get("Authorization") || "";
    const callerToken = authHeader.replace("Bearer ", "");
    let isAdmin = false;
    if (callerToken) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${callerToken}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", u.user.id);
        isAdmin = !!roles?.some((r: any) => r.role === "admin");
        // Allow self-targeted notifications
        if (!isAdmin && user_id && user_id !== u.user.id) {
          return json({ success: false, error: "Forbidden" }, 403);
        }
        if (!isAdmin && (broadcast || user_ids)) {
          return json({ success: false, error: "Forbidden" }, 403);
        }
      }
    }
    // If using service role key directly, allow all
    if (callerToken === SERVICE_ROLE) isAdmin = true;

    let query = admin.from("push_subscriptions").select("*");
    if (broadcast && isAdmin) {
      // all
    } else if (user_ids && isAdmin) {
      query = query.in("user_id", user_ids);
    } else if (user_id) {
      query = query.eq("user_id", user_id);
    } else {
      return json({ success: false, error: "Specify user_id, user_ids, or broadcast" }, 400);
    }

    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body: msgBody, url, tag, icon: "/icon-192.png" });
    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      (subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (e: any) {
          failed++;
          if (e?.statusCode === 404 || e?.statusCode === 410) expiredIds.push(s.id);
        }
      })
    );

    if (expiredIds.length) {
      await admin.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return json({ success: true, sent, failed, expired: expiredIds.length });
  } catch (e: any) {
    return json({ success: false, error: e?.message || "error" }, 200);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
