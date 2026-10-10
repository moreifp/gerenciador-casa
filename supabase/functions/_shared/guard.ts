// Quem pode chamar as funções: usuário logado, admin logado ou os lembretes automáticos (pg_cron).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** true quando a chamada vem do pg_cron com o segredo certo. */
export function isCron(req: Request): boolean {
  const s = Deno.env.get("CRON_SECRET");
  return !!s && req.headers.get("x-cron-secret") === s;
}

/** id do usuário logado (JWT de sessão), ou null para chave pública/anônima. */
export async function callerId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await client.auth.getClaims(auth.slice(7));
  const sub = data?.claims?.sub;
  return error || !sub ? null : (sub as string);
}

async function isAdmin(id: string): Promise<boolean> {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await db.rpc("has_role", { _user_id: id, _role: "admin" });
  return !!data;
}

function deny() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
}

/** Exige usuário logado. Devolve uma Response de erro, ou null se pode seguir. */
export async function requireUser(req: Request): Promise<Response | null> {
  return (await callerId(req)) ? null : deny();
}

/** Exige pg_cron (x-cron-secret) ou admin logado. */
export async function requireCronOrAdmin(req: Request): Promise<Response | null> {
  if (isCron(req)) return null;
  const id = await callerId(req);
  return id && (await isAdmin(id)) ? null : deny();
}
