import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  adminClient, alreadySent, corsHeaders, getAdmins, json, sendWhatsApp, spToday, taskLink,
} from "../_shared/whatsapp.ts";
import { assignmentMessage } from '../_shared/assignment-message.ts';

async function getCaller(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getClaims(authHeader.replace("Bearer ", ""));
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return sub as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const db = adminClient();

    // ---- Events fired by database triggers (validated against DB, idempotent) ----
    if (body.event === "task_completed" && typeof body.completion_id === "string") {
      const completionId = body.completion_id as string;
      // Wait out the 5s "Desfazer" window before notifying the admin.
      const work = (async () => {
        await new Promise((r) => setTimeout(r, 8000));
        const { data: c } = await db.from("task_completions")
          .select("id, task_id, completed_by, undone_at").eq("id", completionId).maybeSingle();
        if (!c || !c.completed_by || c.undone_at) return;
        if (await alreadySent(db, "task_completed", c.id)) return;
        const [{ data: task }, { data: who }] = await Promise.all([
          db.from("tasks").select("title").eq("id", c.task_id).maybeSingle(),
          db.from("profiles").select("full_name").eq("id", c.completed_by).maybeSingle(),
        ]);
        const msg = `✅ *${who?.full_name || "Funcionário"}* concluiu: *${task?.title || "Tarefa"}*\n\n👉 ${taskLink(c.task_id)}`;
        for (const a of await getAdmins(db)) {
          await sendWhatsApp(db, { phone: a.phone, message: msg, user_id: a.id, task_id: c.task_id, kind: "task_completed", ref_id: c.id });
        }
      })();
      // deno-lint-ignore no-explicit-any
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(work); else await work;
      return json({ success: true, scheduled: true });
    }

    if (body.event === "task_question" && typeof body.proof_id === "string") {
      const { data: p } = await db.from("task_proofs")
        .select("id, task_id, submitted_by, comment, audio_transcription, kind").eq("id", body.proof_id).maybeSingle();
      if (!p || p.kind !== "question") return json({ success: false, error: "not found" }, 404);
      if (await alreadySent(db, "task_question", p.id)) return json({ success: true, skipped: true });
      const [{ data: task }, { data: who }] = await Promise.all([
        db.from("tasks").select("title").eq("id", p.task_id).maybeSingle(),
        p.submitted_by ? db.from("profiles").select("full_name").eq("id", p.submitted_by).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const text = p.comment || p.audio_transcription || "(áudio)";
      const msg = `❓ *${who?.full_name || "Funcionário"}* tem uma dúvida em *${task?.title || "Tarefa"}*: ${text}\n\n👉 ${taskLink(p.task_id)}`;
      let sent = 0;
      for (const a of await getAdmins(db)) {
        if (await sendWhatsApp(db, { phone: a.phone, message: msg, user_id: a.id, task_id: p.task_id, kind: "task_question", ref_id: p.id })) sent++;
      }
      return json({ success: true, sent });
    }

    // ---- Calls from the app: require a signed-in user ----
    const callerId = await getCaller(req);
    if (!callerId) return json({ error: "Unauthorized" }, 401);

    // Generic send (admin only): { phone, message, user_id, task_id? }
    if (typeof body.message === "string" && typeof body.phone === "string") {
      const { data: isAdmin } = await db.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      if (!body.message.trim() || body.message.length > 4000 || typeof body.user_id !== "string") {
        return json({ error: "Dados inválidos" }, 400);
      }
      const ok = await sendWhatsApp(db, {
        phone: body.phone, message: body.message, user_id: body.user_id,
        task_id: typeof body.task_id === "string" ? body.task_id : null, kind: "manual",
      });
      return json({ success: ok, sent: ok ? 1 : 0, failed: ok ? 0 : 1 });
    }

    // New task notification: { task_id }
    const task_id = body.task_id;
    if (typeof task_id !== "string") return json({ error: "task_id is required" }, 400);

    // Assignment and resend are admin actions.
    const { data: isAdmin } = await db.rpc('has_role', { _user_id: callerId, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Forbidden' }, 403);
    if (body.resend !== undefined && body.resend !== true) return json({ error: 'Invalid resend' }, 400);
    // Editing can target only a subset. Confirm current assignment server-side.
    const recipientIds = body.recipient_ids;
    if (recipientIds !== undefined) {
      if (!Array.isArray(recipientIds) || recipientIds.length > 100 || recipientIds.some((id: unknown) => typeof id !== "string")) {
        return json({ error: "Forbidden" }, 403);
      }
    }

    const { data: task } = await db.from("tasks").select("title, due_date, audio_url, image_urls, created_by").eq("id", task_id).single();
    if (!task) return json({ error: "Task not found" }, 404);

    const { data: assignees } = await db.from("task_assignees").select("user_id").eq("task_id", task_id);
    const targets = recipientIds === undefined ? assignees : (assignees ?? []).filter(a => recipientIds.includes(a.user_id));
    if (!targets?.length) return json({ success: true, sent: 0, failed: 0, message: "No assignees" });

    const [{ data: profiles }, { data: sender }] = await Promise.all([
      db.from('profiles').select('id, phone').in('id', targets.map(a => a.user_id)),
      db.from('profiles').select('full_name').eq('id', task.created_by ?? callerId).maybeSingle(),
    ]);
    const msg = assignmentMessage(task.title, task.due_date, sender?.full_name ?? 'Admin', spToday());
    const ref = `${task_id}:${task.due_date ?? 'sem-data'}`;

    let sent = 0, failed = 0;
    for (const p of profiles || []) {
      (await sendWhatsApp(db, { phone: p.phone, message: msg, user_id: p.id, task_id, kind: "task_assigned", ref_id: body.resend ? `${ref}:reenviar:${crypto.randomUUID()}` : ref, audio_url: task.audio_url, image_url: task.image_urls?.[0] ?? null })) ? sent++ : failed++;
    }
    return json({ success: true, sent, failed });
  } catch (error) {
    console.error("send-whatsapp error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
