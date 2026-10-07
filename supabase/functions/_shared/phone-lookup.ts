// deno-lint-ignore-file no-explicit-any
/** Digits with Brazil country code (55 + DDD + number). */
export function normalizeBrPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

/**
 * Find the profile for a phone, tolerating different stored formats and
 * several profiles sharing one number (prefers an admin, then any with a role).
 */
export async function findProfileByPhone(db: any, raw: string): Promise<{ id: string } | null> {
  const d = normalizeBrPhone(raw);
  if (d.length < 10) return null;
  const tail = d.slice(-8);
  const { data: rows } = await db.from("profiles").select("id, phone").ilike("phone", `%${tail}%`);
  const matches = (rows || []).filter((r: any) => normalizeBrPhone(r.phone || "").slice(-8) === tail);
  if (!matches.length) return null;
  if (matches.length === 1) return { id: matches[0].id };
  const ids = matches.map((m: any) => m.id);
  const { data: roles } = await db.from("user_roles").select("user_id, role").in("user_id", ids);
  const admin = (roles || []).find((r: any) => r.role === "admin");
  const anyRole = (roles || [])[0];
  return { id: (admin || anyRole)?.user_id ?? ids[0] };
}
