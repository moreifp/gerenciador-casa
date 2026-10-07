import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findProfileByPhone, normalizeBrPhone } from "../_shared/phone-lookup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = normalizeBrPhone(phone);
    if (cleanPhone.length < 10) {
      return new Response(JSON.stringify({ error: "Número de telefone inválido" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const profile = await findProfileByPhone(adminClient, cleanPhone);
    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Nenhum funcionário encontrado com este telefone" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Invalidate previous unused codes for this phone
    await adminClient
      .from("otp_codes")
      .update({ used: true })
      .eq("phone", cleanPhone)
      .eq("used", false);

    // Store new code
    const { error: insertError } = await adminClient
      .from("otp_codes")
      .insert({ phone: cleanPhone, code });

    if (insertError) {
      throw new Error("Failed to store OTP: " + insertError.message);
    }

    // Send via Z-API
    const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
    const zapiToken = Deno.env.get("ZAPI_TOKEN");
    const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

    if (!instanceId || !zapiToken || !clientToken) {
      throw new Error("Z-API credentials not configured");
    }

    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`;

    const message = `🌸 *Gerenciador Casa*\n\nSeu código de acesso é: *${code}*\n\nVálido por 5 minutos.`;

    const response = await fetch(zapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify({ phone: cleanPhone, message }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error("Failed to send WhatsApp: " + JSON.stringify(result));
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado via WhatsApp" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-otp-whatsapp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
