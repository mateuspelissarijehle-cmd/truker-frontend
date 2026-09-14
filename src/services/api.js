import { API_BASE, API_TIMEOUT_MS } from "../config";

// Handler chamado quando o backend confirma que o token da sessão não é mais
// válido (registrado pelo AuthProvider) -- deixa este módulo desacoplado de
// React/contexto, já que `api()` é uma função solta, não um hook. Detecção é
// por MENSAGEM exata do authMiddleware.js (não por status 401 puro): outras
// rotas também usam 401 pra coisas que não são token inválido (ex: "E-mail ou
// senha incorretos" no login, "Senha atual incorreta" em trocar senha) -- um
// 401 genérico ia deslogar o usuário no meio de um login que só errou a senha.
let handlerTokenInvalido = null;
export function definirHandlerTokenInvalido(fn) { handlerTokenInvalido = fn; }
const MENSAGENS_TOKEN_INVALIDO = new Set(["Token inválido ou expirado", "Token não fornecido"]);

function tratarRespostaComErro(res, data) {
  if (res.status === 401 && MENSAGENS_TOKEN_INVALIDO.has(data.error)) {
    handlerTokenInvalido?.();
  }
  throw new Error(data.error || data.message || "Erro na requisição");
}

export async function api(method, path, body, token, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Sem resposta do servidor. Verifique sua conexão e tente novamente.", { cause: err });
    throw new Error("Falha de conexão. Verifique sua internet e tente novamente.", { cause: err });
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json();
  if (!res.ok) tratarRespostaComErro(res, data);
  return data;
}

// Envia arquivo(s) via multipart/form-data (upload de documento/comprovante). Não
// define Content-Type manualmente -- o browser precisa gerar o boundary do
// multipart sozinho; `api()` acima força application/json, por isso não serve
// pra upload de arquivo (era parte do motivo do botão de CNH não funcionar: não
// existia nem um jeito de mandar o arquivo pro backend).
export async function apiUpload(method, path, formData, token) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Sem resposta do servidor. Verifique sua conexão e tente novamente.", { cause: err });
    throw new Error("Falha de conexão. Verifique sua internet e tente novamente.", { cause: err });
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json();
  if (!res.ok) tratarRespostaComErro(res, data);
  return data;
}

// Baixa um arquivo binário autenticado (PDF de contrato, planilha .xlsx etc)
// forçando o download direto pro dispositivo. O endpoint só aceita token via
// header Authorization, então não dá pra usar window.open(url) direto -- e
// window.open("", "_blank") + redirecionar depois (o jeito clássico de
// "abrir numa aba nova" contornando bloqueio de pop-up) não funciona no
// WebView nativo do Capacitor, que não tem noção de aba nova nenhuma (ver
// histórico do commit que removeu abrirArquivoAutenticado, 18/08/2026, bug
// do botão "Ver Contrato" que não abria nada no app Android). Por isso o
// padrão usado aqui, em vez de abrir, é: buscar como blob e disparar um
// download via elemento <a download> -- funciona tanto na web quanto no
// app nativo. Extrai o nome sugerido do header Content-Disposition quando
// disponível, com nomePadrao como retaguarda.
export async function baixarArquivoAutenticado(path, token, nomePadrao) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let msg = "Não foi possível baixar o arquivo";
    try {
      const data = await res.json();
      msg = data.error || msg;
      if (res.status === 401 && MENSAGENS_TOKEN_INVALIDO.has(data.error)) handlerTokenInvalido?.();
    } catch { /* resposta de erro sem JSON válido, mantém msg padrão */ }
    throw new Error(msg);
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const nomeArquivo = match ? match[1] : nomePadrao;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
