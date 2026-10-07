import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!LOVABLE_API_KEY && !ELEVENLABS_API_KEY) {
      throw new Error("Nenhuma chave de transcrição configurada");
    }

    const contentType = req.headers.get("content-type") || "";
    let file: File | Blob | null = null;
    let filename = "recording.webm";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (f instanceof File) {
        file = f;
        filename = f.name || filename;
      } else if (f instanceof Blob) {
        file = f;
      }
    } else {
      // Backward-compat: JSON { audioBase64, mimeType? }
      const { audioBase64, mimeType } = await req.json().catch(() => ({}));
      if (audioBase64) {
        const binary = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
        const mt = mimeType || "audio/webm";
        const ext = mt.includes("mp4") ? "mp4" : mt.includes("wav") ? "wav" : mt.includes("mpeg") ? "mp3" : "webm";
        file = new Blob([binary], { type: mt });
        filename = `recording.${ext}`;
      }
    }

    if (!file) {
      return new Response(JSON.stringify({ error: "Nenhum áudio fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size < 2048) {
      return new Response(JSON.stringify({ error: "Gravação vazia — tente novamente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Áudio muito grande (máx 25 MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Preferência: ElevenLabs Scribe (melhor em PT-BR / áudio de celular)
    if (ELEVENLABS_API_KEY) {
      try {
        const elForm = new FormData();
        elForm.append("file", file, filename);
        elForm.append("model_id", "scribe_v2");
        elForm.append("language_code", "por");
        elForm.append("diarize", "false");
        elForm.append("tag_audio_events", "false");

        const elRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
          body: elForm,
        });

        if (elRes.ok) {
          const elData = await elRes.json();
          const text = (elData.text || "").trim();
          if (text) {
            return new Response(JSON.stringify({ transcription: text, provider: "elevenlabs" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          console.warn("ElevenLabs retornou transcrição vazia, usando fallback");
        } else {
          const elErr = await elRes.text().catch(() => "");
          console.error("ElevenLabs STT error:", elRes.status, elErr);
          if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ error: "Erro na transcrição", details: elErr }), {
              status: elRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (elCatch) {
        console.error("ElevenLabs STT exception:", elCatch);
        if (!LOVABLE_API_KEY) throw elCatch;
      }
    }

    // Sem gateway do Lovable fora dele: se a ElevenLabs falhar, devolve erro.
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Transcrição indisponível agora. Tente de novo." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Fallback: Lovable AI Gateway (só se LOVABLE_API_KEY existir)
    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    upstream.append("language", "pt");
    upstream.append("file", file, filename);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });


    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("STT gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro na transcrição", details: errorText }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const transcription = (data.text || "").trim();

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
