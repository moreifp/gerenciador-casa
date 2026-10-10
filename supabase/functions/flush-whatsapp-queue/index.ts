import { isCron, requireCronOrAdmin } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient, corsHeaders, deliver, deliverAudio, deliverImage, isQuietNow, json } from "../_shared/whatsapp.ts";

/** force=true is allowed only for the service role or a signed-in admin. */
async function canForce(req: Request, db: ReturnType<typeof adminClient>): Promise<boolean> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await client.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (!sub) return false;
  const { data: isAdmin } = await db.rpc("has_role", { _user_id: sub, _role: "admin" });
  return !!isAdmin;
}

// Sends every queued WhatsApp message whose scheduled_for has passed.
// Body { force: true, id? } (admin/service only) ignores the window and scheduled_for.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const db = adminClient();
    const force = body?.force === true;
    if (force && !isCron(req) && !(await canForce(req, db))) return json({ error: "Forbidden" }, 403);
    if (!force) { const denied = await requireCronOrAdmin(req); if (denied) return denied; }
    if (!force && isQuietNow()) return json({ sent: 0, message: "Fora da janela 07h–19h" });
    let q = db.from("whatsapp_messages")
      .select("id, phone, message, audio_url, image_url").eq("status", "queued");
    if (!force) q = q.lte("scheduled_for", new Date().toISOString());
    if (force && typeof body.id === "string") q = q.eq("id", body.id);
    const { data: rows, error } = await q.order("created_at", { ascending: true }).limit(200);
    if (error) throw error;
    let sent = 0, failed = 0;
    const results: unknown[] = [];
    for (const m of rows || []) {
      const r = await deliver(m.phone, m.message);
      const { data: updated } = await db.from("whatsapp_messages").update(
        r.ok ? { status: "sent", zapi_message_id: r.id ?? null } : { status: "failed", error: r.error },
      ).eq("id", m.id).eq("status", "queued").select('id').maybeSingle();
      if (r.ok && updated && m.image_url) {
        const img = await deliverImage(m.phone, m.image_url);
        if (!img.ok) console.error('Queued WhatsApp image failed:', img.error);
      }
      if (r.ok && updated && m.audio_url) {
        const audio = await deliverAudio(m.phone, m.audio_url);
        if (!audio.ok) console.error('Queued WhatsApp audio failed:', audio.error);
      }
      results.push({ id: m.id, ok: r.ok, messageId: r.id ?? null, error: r.error });
      r.ok ? sent++ : failed++;
    }
    console.log(`flush-whatsapp-queue${force ? " (force)" : ""}: ${sent} enviadas, ${failed} falhas`);
    return json({ sent, failed, results });
  } catch (e) {
    console.error("flush-whatsapp-queue error", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
