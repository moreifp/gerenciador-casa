import { requireUser } from "../_shared/guard.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  { const denied = await requireUser(req); if (denied) return denied; }

  try {
    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    // Aceita "data:image/png;base64,..." ou só o base64 (assume JPEG).
    const m = image_base64.match(/^data:([^;]+);base64,(.*)$/s);
    const mediaType = m ? m[1] : "image/jpeg";
    const data64 = m ? m[2] : image_base64;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OCR_MODEL") ?? "claude-haiku-4-5",
        max_tokens: 2048,
        system:
          "Você é um assistente especializado em extrair dados de recibos e notas fiscais brasileiras. Analise a imagem e extraia as informações usando a ferramenta fornecida. Se não conseguir identificar algum campo, deixe-o vazio ou null. Valores monetários devem ser números decimais (ex: 45.90). Datas no formato YYYY-MM-DD.",
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: data64 } },
              { type: "text", text: "Extraia os dados deste recibo/nota fiscal." },
            ],
          },
        ],
        tools: [
          {
            name: "extract_receipt",
            description: "Extrair dados estruturados de um recibo ou nota fiscal",
            input_schema: {
              type: "object",
              properties: {
                vendor_name: { type: "string", description: "Nome do estabelecimento" },
                receipt_date: { type: "string", description: "Data do recibo no formato YYYY-MM-DD" },
                total_amount: { type: "number", description: "Valor total em reais" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      amount: { type: "number" },
                    },
                    required: ["description"],
                  },
                  description: "Itens listados no recibo",
                },
                raw_text: { type: "string", description: "Transcrição completa do texto visível no recibo" },
              },
              required: ["vendor_name", "total_amount", "raw_text"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_receipt" },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("Anthropic error:", status, text);

      if (status === 429 || status === 529) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402 || (status === 400 && text.includes("credit"))) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const toolUse = (data.content ?? []).find((c: { type: string }) => c.type === "tool_use");

    if (!toolUse) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair dados do recibo." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = toolUse.input;

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ocr-receipt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
