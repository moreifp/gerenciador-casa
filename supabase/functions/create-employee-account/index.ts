import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Creates a WhatsApp-only employee: synthetic email, random password, no email sent.
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function variants(raw: string): string[] {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  const out = new Set<string>([d]);
  if (d.length === 11 && d[2] === "9") out.add(d.slice(0, 2) + d.slice(3));
  if (d.length === 10) out.add(d.slice(0, 2) + "9" + d.slice(2));
  for (const v of [...out]) out.add("55" + v);
  return [...out];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await anon.auth.getClaims(authHeader.slice(7));
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await anon.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const full_name = String(body.full_name ?? "").trim().slice(0, 120);
    const role_title = String(body.role_title ?? "").trim().slice(0, 80) || null;
    const initials = String(body.initials ?? "").trim().toUpperCase();
    let phone = String(body.phone ?? "").replace(/\D/g, "");
    if (phone && !phone.startsWith("55")) phone = "55" + phone;
    if (!full_name) return json({ error: "Nome obrigatório" }, 400);
    if (!/^55\d{10,11}$/.test(phone)) return json({ error: "WhatsApp inválido" }, 400);
    if (initials && !/^\p{L}{2}$/u.test(initials)) return json({ error: "Iniciais: duas letras" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin.from("profiles").select("id, phone").not("phone", "is", null);
    const v = variants(phone);
    if ((existing || []).some((p) => v.includes(String(p.phone).replace(/\D/g, "")))) {
      return json({ ok: false, error: "duplicate_phone" }, 200);
    }

    const password = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `wa+${phone}@gerenciadorcasa.local`, password, email_confirm: true, user_metadata: { full_name },
    });
    if (error || !created?.user) {
      if ((error?.message || "").toLowerCase().includes("already")) return json({ ok: false, error: "duplicate_phone" }, 200);
      return json({ error: error?.message || "create failed" }, 400);
    }
    const uid = created.user.id;
    await admin.from("profiles").update({ full_name, role_title, phone }).eq("id", uid);
    // Separate update: the initials trigger recalculates when full_name changes.
    if (initials) await admin.from("profiles").update({ initials }).eq("id", uid);
    const { error: roleErr } = await admin.from("user_roles").upsert({ user_id: uid, role: "employee" }, { onConflict: "user_id,role" });
    if (roleErr) {
      console.error("role insert failed", roleErr);
      await admin.auth.admin.deleteUser(uid);
      return json({ ok: false, error: "Não foi possível salvar" }, 200);
    }
    return json({ ok: true, user_id: uid });
  } catch (e) {
    console.error("create-employee-account", e);
    return json({ error: String(e) }, 500);
  }
});
