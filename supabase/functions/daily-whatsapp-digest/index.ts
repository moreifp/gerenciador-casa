import {
  adminClient, alreadySent, corsHeaders, getAdmins, json, sendWhatsApp, spToday, taskLink,
} from "../_shared/whatsapp.ts";

// body: { kind: "admin_overdue" | "employee_today" }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { kind } = await req.json().catch(() => ({}));
    const db = adminClient();
    const today = spToday();
    const ref = today; // one message per user per day

    if (kind === "admin_overdue") {
      const { data: tasks } = await db.from("tasks")
        .select("id, title, due_date").eq("status", "pending").eq("is_archived", false).lt("due_date", today);
      if (!tasks?.length) return json({ sent: 0, message: "Sem atrasos" });

      const { data: assigns } = await db.from("task_assignees").select("task_id, user_id").in("task_id", tasks.map((t) => t.id));
      const userIds = [...new Set((assigns || []).map((a) => a.user_id))];
      const { data: profiles } = userIds.length
        ? await db.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
      const nameOf = (id: string) => (profiles || []).find((p) => p.id === id)?.full_name?.split(" ")[0] || "Funcionário";
      const todayMs = Date.parse(today + "T00:00:00Z");

      const lines: { name: string; text: string }[] = [];
      for (const t of tasks) {
        const days = Math.round((todayMs - Date.parse(t.due_date + "T00:00:00Z")) / 86400000);
        const label = `${t.title} (${days} ${days === 1 ? "dia" : "dias"})`;
        const who = (assigns || []).filter((a) => a.task_id === t.id).map((a) => nameOf(a.user_id));
        (who.length ? who : ["Sem responsável"]).forEach((name) => lines.push({ name, text: label }));
      }
      lines.sort((a, b) => a.name.localeCompare(b.name));
      const msg = `⚠️ *Atrasadas hoje*\n${lines.map((l) => `• ${l.name}: ${l.text}`).join("\n")}\n\n👉 ${taskLink()}`;

      let sent = 0;
      for (const a of await getAdmins(db)) {
        if (await alreadySent(db, "admin_overdue", ref, a.id)) continue;
        if (await sendWhatsApp(db, { phone: a.phone, message: msg, user_id: a.id, kind: "admin_overdue", ref_id: ref, ignoreQuietHours: true })) sent++;
      }
      console.log(`admin_overdue ${today}: ${tasks.length} atrasadas, ${sent} enviados`);
      return json({ sent, overdue: tasks.length });
    }

    if (kind === "employee_today") {
      const { data: tasks } = await db.from("tasks")
        .select("id, title").eq("due_date", today).eq("is_archived", false).neq("status", "completed");
      if (!tasks?.length) return json({ sent: 0 });
      const { data: assigns } = await db.from("task_assignees").select("task_id, user_id").in("task_id", tasks.map((t) => t.id));
      const byUser = new Map<string, string[]>();
      for (const a of assigns || []) {
        const t = tasks.find((x) => x.id === a.task_id);
        if (t) byUser.set(a.user_id, [...(byUser.get(a.user_id) || []), t.title]);
      }
      if (!byUser.size) return json({ sent: 0 });
      const { data: profiles } = await db.from("profiles").select("id, phone").in("id", [...byUser.keys()]);
      let sent = 0;
      for (const p of profiles || []) {
        if (!p.phone || await alreadySent(db, "employee_today", ref, p.id)) continue;
        const msg = `👷📋 *Suas tarefas de hoje*\n${byUser.get(p.id)!.map((t) => `• ${t}`).join("\n")}\n\n👉 ${taskLink()}`;
        if (await sendWhatsApp(db, { phone: p.phone, message: msg, user_id: p.id, kind: "employee_today", ref_id: ref, ignoreQuietHours: true })) sent++;
      }
      console.log(`employee_today ${today}: ${sent} enviados`);
      return json({ sent });
    }

    return json({ error: "kind inválido" }, 400);
  } catch (e) {
    console.error("daily-whatsapp-digest error", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
