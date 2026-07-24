import { API_BASE, API_TIMEOUT_MS } from "../config";

export async function api(method, path, body, token) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
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
    if (err.name === "AbortError") throw new Error("Sem resposta do servidor. Verifique sua conexão e tente novamente.");
    throw new Error("Falha de conexão. Verifique sua internet e tente novamente.");
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Erro na requisição");
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
    if (err.name === "AbortError") throw new Error("Sem resposta do servidor. Verifique sua conexão e tente novamente.");
    throw new Error("Falha de conexão. Verifique sua internet e tente novamente.");
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Erro na requisição");
  return data;
}

// Baixa um arquivo binário autenticado (ex: PDF de contrato) e abre em nova aba.
// O endpoint só aceita token via header Authorization, então não dá pra usar
// window.open(url) direto — buscamos como blob e abrimos uma URL local.
// A aba é aberta ANTES do fetch (síncrono, dentro do clique do usuário) e só
// redirecionada depois — abrir só no final, após o await, é bloqueado como
// pop-up pela maioria dos navegadores por perder o gesto do usuário.
export async function abrirArquivoAutenticado(path, token) {
  const novaJanela = window.open("", "_blank");
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      let msg = "Não foi possível abrir o arquivo";
      try { const data = await res.json(); msg = data.error || msg; } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (novaJanela) novaJanela.location.href = url;
    else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (novaJanela) novaJanela.close();
    throw e;
  }
}
