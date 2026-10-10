import { requireCronOrAdmin } from "../_shared/guard.ts";
import {
  adminClient, alreadySent, corsHeaders, json, sendWhatsApp, spToday, taskLink,
} from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  { const denied = await requireCronOrAdmin(req); if (denied) return denied; }

  try {
    const db = adminClient();
    const tomorrowStr = spToday(1);

    const { data: tasks, error: tasksError } = await db
      .from("tasks").select("id, title")
      .eq("due_date", tomorrowStr).eq("is_archived", false).neq("status", "completed");
    if (tasksError) throw tasksError;
    if (!tasks?.length) return json({ message: "No tasks due tomorrow" });

    const { data: assigns } = await db.from("task_assignees").select("task_id, user_id").in("task_id", tasks.map((t) => t.id));
    const byUser = new Map<string, { id: string; title: string }[]>();
    let notificationsInserted = 0;

    for (const a of assigns || []) {
      const t = tasks.find((x) => x.id === a.task_id)!;
      byUser.set(a.user_id, [...(byUser.get(a.user_id) || []), t]);
      const { error } = await db.from("notifications").insert({
        user_id: a.user_id, title: "Tarefa vence amanhã", body: t.title, url: "/tasks",
      });
      if (!error) notificationsInserted++;
    }

    // WhatsApp: one message per employee
    let whatsappSent = 0;
    if (byUser.size) {
      const { data: profiles } = await db.from("profiles").select("id, phone").in("id", [...byUser.keys()]);
      for (const p of profiles || []) {
        if (!p.phone || await alreadySent(db, "due_tomorrow", tomorrowStr, p.id)) continue;
        const list = byUser.get(p.id)!;
        const msg = `⏰ *Vence amanhã*\n${list.map((t) => `• ${t.title}`).join("\n")}\n\n👉 ${taskLink(list.length === 1 ? list[0].id : null)}`;
        if (await sendWhatsApp(db, { phone: p.phone, message: msg, user_id: p.id, kind: "due_tomorrow", ref_id: tomorrowStr })) whatsappSent++;
      }
    }

    return json({ message: `Sent ${notificationsInserted} reminders, ${whatsappSent} WhatsApp for ${tasks.length} tasks` });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "error" }, 500);
  }
});
