import { adminClient, getAdmins, sendWhatsApp, taskLink, json } from "../_shared/whatsapp.ts";
import { phoneVariants, suggestReplyStatus } from "../_shared/reply-status.ts";

// deno-lint-ignore no-explicit-any
type Payload = any;

async function store(db: ReturnType<typeof adminClient>, bucket: string, path: string, url: string, type: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const blob = await res.blob();
  const { error } = await db.storage.from(bucket).upload(path, blob, { contentType: blob.type || type, upsert: true });
  if (error) throw error;
  return { blob, publicUrl: db.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

async function transcribe(blob: Blob): Promise<string | null> {
  const form = new FormData();
  form.append("file", blob, "reply.ogg");
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/transcribe-audio`, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
    body: form,
  });
  if (!res.ok) { console.error("transcribe failed", res.status, await res.text()); return null; }
  return (await res.json()).transcription || null;
}

async function handle(p: Payload) {
  const db = adminClient();
  const phone = String(p.phone || "").replace(/\D/g, "");
  const variants = phoneVariants(phone);
  const { data: profiles } = await db.from("profiles").select("id, full_name, phone").not("phone", "is", null);
  // The same number can belong to several profiles (e.g. admin + test account).
  const matches = (profiles || []).filter((pr) => variants.includes(String(pr.phone).replace(/\D/g, "")));
  if (!matches.length) { await db.from("whatsapp_unmatched").insert({ phone, payload: p }); return; }
  const ids = matches.map((m) => m.id);

  const id = crypto.randomUUID();
  let text: string | null = p.text?.message ?? null;
  let audio_url: string | null = null, audio_transcription: string | null = null, image_url: string | null = null;
  try {
    if (p.audio?.audioUrl) {
      const s = await store(db, "task-audio", `replies/${id}.ogg`, p.audio.audioUrl, "audio/ogg");
      audio_url = s.publicUrl;
      audio_transcription = await transcribe(s.blob);
    }
    if (p.image?.imageUrl) {
      image_url = (await store(db, "task-images", `replies/${id}.jpg`, p.image.imageUrl, "image/jpeg")).publicUrl;
      text = p.image.caption || text;
    }
  } catch (e) { console.error("media failed", e); }

  // Match task: quoted message → most recent open task sent to any profile with this number.
  let task_id: string | null = null;
  let authorId: string | null = null;
  const quoted = p.referenceMessageId || p.quotedMsgId || p.quotedMessageId;
  if (quoted) {
    const { data } = await db.from("whatsapp_messages").select("task_id, user_id").eq("zapi_message_id", quoted)
      .in("user_id", ids).not("task_id", "is", null).limit(1).maybeSingle();
    task_id = data?.task_id ?? null;
    authorId = data?.user_id ?? null;
  }
  if (!task_id) {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await db.from("whatsapp_messages").select("task_id, user_id, tasks!inner(status)")
      .in("user_id", ids).eq("kind", "task_assigned").gte("created_at", since)
      .neq("tasks.status", "completed").order("created_at", { ascending: false }).limit(1);
    task_id = data?.[0]?.task_id ?? null;
    authorId = data?.[0]?.user_id ?? null;
  }
  if (!authorId) {
    const { data: adminRows } = await db.from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids);
    const adminIds = new Set((adminRows || []).map((r) => r.user_id));
    authorId = (matches.find((m) => !adminIds.has(m.id)) ?? matches[0]).id;
  }
  const person = matches.find((m) => m.id === authorId)!;

  const content = text || audio_transcription || "";
  const suggested_status = suggestReplyStatus(content);
  const { error } = await db.from("task_replies").insert({
    id, task_id, user_id: person.id, phone, text, audio_url, audio_transcription, image_url,
    zapi_message_id: p.messageId ?? null, suggested_status,
  });
  if (error) { console.error("insert reply failed", error); return; }

  // "feito" reply completes the task. A completion proof is inserted first so the
  // on_task_completed trigger credits the employee in task_completions.
  let autoDone = false;
  if (task_id && suggested_status === "done") {
    const { data: t } = await db.from("tasks").select("status").eq("id", task_id).maybeSingle();
    if (t && t.status !== "completed") {
      await db.from("task_proofs").insert({ task_id, submitted_by: person.id, kind: "completion", comment: content || null, audio_url, audio_transcription, photo_urls: image_url ? [image_url] : [] });
      const { error: upErr } = await db.from("tasks").update({ status: "completed" }).eq("id", task_id);
      if (upErr) console.error("auto-complete failed", upErr); else autoDone = true;
    }
  }

  const { data: task } = task_id ? await db.from("tasks").select("title").eq("id", task_id).maybeSingle() : { data: null };
  const first = (person.full_name || "Funcionário").split(" ")[0];
  const msg = `💬 *${first}* sobre *${task?.title || "(sem tarefa aberta)"}*:\n"${content || (image_url ? "📷 foto" : "…")}"\n${autoDone ? "✅ Marcada como concluída" : suggested_status === "done" ? "✅ Parece concluída" : "⏳ Parece pendente"}\n👉 ${taskLink(task_id)}`;
  for (const a of await getAdmins(db)) {
    await sendWhatsApp(db, { phone: a.phone, message: msg, user_id: a.id, task_id, kind: "task_reply", ref_id: id, audio_url });
  }
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("ZAPI_WEBHOOK_SECRET");
    const given = req.headers.get("x-webhook-secret") || new URL(req.url).searchParams.get("secret");
    if (!secret || given !== secret) { console.warn("whatsapp-inbound: bad secret"); return json({ ok: false }, 401); }
    const raw = await req.text();
    let p: Payload = {};
    try { p = JSON.parse(raw); } catch { /* ignore */ }
    // Diagnostic: log the type of every request (no phone numbers).
    console.log(`whatsapp-inbound: type=${p.type ?? "?"} instanceId=${p.instanceId ?? "?"} fromMe=${!!p.fromMe} isGroup=${!!p.isGroup}`);
    if (p.type !== "ReceivedCallback") {
      const anyP = p as Record<string, unknown>;
      if (p.type === "MessageStatusCallback") {
        console.log(`whatsapp-inbound: status=${anyP.status ?? "?"} ids=${JSON.stringify(anyP.ids ?? [])} momment=${anyP.momment ?? "?"}`);
      } else if (p.type === "DeliveryCallback") {
        console.log(`whatsapp-inbound: delivery messageId=${anyP.messageId ?? "?"} zaapId=${anyP.zaapId ?? "?"} error=${anyP.error ? JSON.stringify(anyP.error) : "none"}`);
      }
      if (p.type === "DisconnectedCallback") {
        const db = adminClient();
        const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
        for (const a of admins || []) {
          await db.from("notifications").insert({ user_id: a.user_id, title: "⚠️ WhatsApp do Gerenciador Casa desconectou — leia o QR code no painel Z-API", body: "WhatsApp desconectado", url: "/" });
        }
      }
      console.log(`whatsapp-inbound: ignored non-message type=${p.type ?? "?"} instanceId=${p.instanceId ?? "?"}`);
      return json({ ok: true, ignored: true });
    }
    if (p.fromMe || p.isGroup || p.isStatusReply || p.broadcast) return json({ ok: true, ignored: true });
    await handle(p);
  } catch (e) { console.error("whatsapp-inbound error", e); }
  return json({ ok: true });
});
