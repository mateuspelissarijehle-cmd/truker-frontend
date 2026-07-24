import { initMercadoPago } from "@mercadopago/sdk-react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
export const API_BASE = "https://truker-app-production.up.railway.app";

// Chave pública do Mercado Pago (SDK react) — necessária para tokenizar cartão
// no navegador (Card Payment Brick). Vem de variável de ambiente (Vite).
export const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || "";
if (MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
} else {
  console.warn("[TRUKER] VITE_MP_PUBLIC_KEY não configurada — pagamento com cartão ficará indisponível.");
}

// Timeout de rede pro fetch — sem isso, uma conexão que trava no meio do
// caminho (comum em rede de celular/estrada) deixa a promise pendurada pra
// sempre: nunca resolve, nunca rejeita, e qualquer loading state (ex: botão
// "Aceitando...") fica preso indefinidamente sem erro nenhum pro usuário ver.
export const API_TIMEOUT_MS = 20000;
