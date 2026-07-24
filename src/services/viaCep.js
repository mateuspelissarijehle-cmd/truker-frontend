// Busca endereço por CEP na ViaCEP. Retorna null se o CEP for inválido,
// não existir ou a requisição falhar.
export async function buscarEnderecoPorCep(cep) {
  const clean = (cep || "").replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const d = await r.json();
    if (d.erro) return null;
    return { logradouro: d.logradouro || "", bairro: d.bairro || "", cidade: d.localidade || "", uf: d.uf || "" };
  } catch { return null; }
}
