// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
export const API_BASE = "https://truker-app-production.up.railway.app";

// Timeout de rede pro fetch — sem isso, uma conexão que trava no meio do
// caminho (comum em rede de celular/estrada) deixa a promise pendurada pra
// sempre: nunca resolve, nunca rejeita, e qualquer loading state (ex: botão
// "Aceitando...") fica preso indefinidamente sem erro nenhum pro usuário ver.
export const API_TIMEOUT_MS = 20000;
