import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const APP_NAME = "Gerenciador Casa";
export const APP_URL = Deno.env.get("WA_APP_URL") || "https://casaorganizada10.lovable.app";
export const TZ = "America/Sao_Paulo";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/** YYYY-MM-DD in America/Sao_Paulo */
export function spToday(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function taskLink(taskId?: string | null) {
  return taskId ? `${APP_URL}/tasks?open=${taskId}` : `${APP_URL}/tasks`;
}

export interface SendArgs {
  phone: string | null | undefined;
  message: string;
  user_id: string;
  task_id?: string | null;
  kind?: string | null;
  ref_id?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  /** Skip the 07:00–19:00 quiet-hours check (daily digests already run inside the window). */
  ignoreQuietHours?: boolean;
}

export const QUIET_START = 7;  // first allowed hour (SP)
export const QUIET_END = 19;   // first blocked hour (SP)

export function spHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(now));
}

/** Next 07:00 in São Paulo (UTC-3, no DST) as ISO string. */
export function nextWindowStart(now = new Date()): string {
  const day = spHour(now) < QUIET_START ? spToday(0) : spToday(1);
  return `${day}T${String(QUIET_START + 3).padStart(2, "0")}:00:00Z`;
}

export function isQuietNow(now = new Date()) {
  const h = spHour(now);
  return h < QUIET_START || h >= QUIET_END;
}

/** Raw Z-API call. Never throws. */
export async function deliver(phone: string, message: string): Promise<{ ok: boolean; id?: string | null; error?: string }> {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const zapiToken = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!instanceId || !zapiToken || !clientToken) return { ok: false, error: "Z-API não configurada" };
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": clientToken },
      body: JSON.stringify({ phone, message }),
    });
    const result = await res.json().catch(() => ({}));
    if (res.ok && !result.error) return { ok: true, id: result.messageId || result.zapiMessageId || null };
    return { ok: false, error: JSON.stringify(result) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** A public audio URL is sent as a separate message after the text. */
export async function deliverAudio(phone: string, audio: string): Promise<{ ok: boolean; error?: string }> {
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');
  if (!instanceId || !token || !clientToken) return { ok: false, error: 'Z-API não configurada' };
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-audio`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
      body: JSON.stringify({ phone, audio }),
    });
    const result = await res.json().catch(() => ({}));
    return res.ok && !result.error ? { ok: true } : { ok: false, error: JSON.stringify(result) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Erro no áudio' }; }
}

/** A public image URL is sent as a separate message after the text. */
export async function deliverImage(phone: string, image: string): Promise<{ ok: boolean; error?: string }> {
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');
  if (!instanceId || !token || !clientToken) return { ok: false, error: 'Z-API não configurada' };
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
      body: JSON.stringify({ phone, image }),
    });
    const result = await res.json().catch(() => ({}));
    return res.ok && !result.error ? { ok: true } : { ok: false, error: JSON.stringify(result) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Erro na foto' }; }
}

/** Sends via Z-API (or queues during quiet hours) and logs to whatsapp_messages. Never throws.
 *  Returns true when sent or queued. */
export async function sendWhatsApp(db: SupabaseClient, a: SendArgs): Promise<boolean> {
  const cleanPhone = (a.phone || "").replace(/\D/g, "");
  const log = async (status: string, extra: Record<string, unknown> = {}) => {
    try {
      await db.from("whatsapp_messages").insert({
        task_id: a.task_id ?? null,
        user_id: a.user_id,
        phone: cleanPhone || "N/A",
        message: a.message,
        status,
        kind: a.kind ?? null,
        ref_id: a.ref_id ?? null,
        audio_url: a.audio_url ?? null,
        image_url: a.image_url ?? null,
        ...extra,
      });
    } catch (e) {
      console.error("whatsapp log failed", e);
    }
  };
  if (!cleanPhone) { await log("failed", { error: "Telefone não cadastrado" }); return false; }
  if (a.kind && a.ref_id && await alreadySent(db, a.kind, a.ref_id, a.user_id)) return true;
  if (!a.ignoreQuietHours && isQuietNow()) {
    await log("queued", { scheduled_for: nextWindowStart() });
    return true;
  }
  const r = await deliver(cleanPhone, a.message);
  if (r.ok) {
    await log("sent", { zapi_message_id: r.id ?? null });
    if (a.image_url) {
      const img = await deliverImage(cleanPhone, a.image_url);
      if (!img.ok) console.error('WhatsApp image failed:', img.error);
    }
    if (a.audio_url) {
      const audio = await deliverAudio(cleanPhone, a.audio_url);
      if (!audio.ok) console.error('WhatsApp audio failed:', audio.error);
    }
    return true;
  }
  await log("failed", { error: r.error });
  return false;
}

/** True if this (kind, ref_id[, user]) was already sent or is queued. */
export async function alreadySent(db: SupabaseClient, kind: string, ref_id: string, user_id?: string) {
  let q = db.from("whatsapp_messages").select("id", { count: "exact", head: true })
    .eq("kind", kind).eq("ref_id", ref_id).in("status", ["sent", "queued"]);
  if (user_id) q = q.eq("user_id", user_id);
  const { count } = await q;
  return (count ?? 0) > 0;
}

export async function getAdmins(db: SupabaseClient) {
  const { data: roles } = await db.from("user_roles").select("user_id").eq("role", "admin");
  const ids = (roles || []).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data } = await db.from("profiles").select("id, full_name, phone").in("id", ids);
  return (data || []).filter((p) => p.phone);
}
