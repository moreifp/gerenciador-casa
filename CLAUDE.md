# Regras para trabalhar neste repositório

- Escreva sempre em português do Brasil (código, textos da tela, commits e explicações).
- Não mude o visual sem o Fausto pedir. Ao criar ou mudar telas: poucos cliques, pouco texto, ícones grandes, navegação intuitiva (botões ≥56px, fonte ≥18px, preto sobre branco).
- Nunca grave chave, senha ou token no código nem no git. Segredos ficam no `.env.local` (local), no Cloudflare (front) e nos secrets do Supabase (edge functions).
- Toda mudança numa branch nova; a `main` só recebe merge depois de testar.
- Funcionárias usam só WhatsApp. App sem e-mail (desligado em 07/10/2026). Login do admin pelo Google (Supabase Auth nativo).
- Leia também `AGENTS.md` (regras de dados, WhatsApp e fuso America/Sao_Paulo).

## Onde roda
- Front: Cloudflare Workers (`wrangler.jsonc`, SPA estática de `dist/`). `npm run deploy`.
- Banco, auth, storage, edge functions e pg_cron: Supabase próprio do Fausto.
- WhatsApp: Z-API (webhook → `whatsapp-inbound`); áudio: ElevenLabs; OCR: Gemini (`GEMINI_API_KEY`).
