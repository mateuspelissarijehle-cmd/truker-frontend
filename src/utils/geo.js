// Nome do estado → sigla. O Google Places às vezes retorna o nome completo do
// estado (ex: "Paraná") em vez da sigla nos terms do autocomplete de cidades —
// essa tabela garante que a UF preenchida automaticamente sempre vira 2 letras,
// igual ao padrão já usado no preenchimento por CEP.
const UF_POR_NOME = {
  "acre": "AC", "alagoas": "AL", "amapá": "AP", "amapa": "AP", "amazonas": "AM",
  "bahia": "BA", "ceará": "CE", "ceara": "CE", "distrito federal": "DF",
  "espírito santo": "ES", "espirito santo": "ES", "goiás": "GO", "goias": "GO",
  "maranhão": "MA", "maranhao": "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", "pará": "PA", "para": "PA", "paraíba": "PB", "paraiba": "PB",
  "paraná": "PR", "parana": "PR", "pernambuco": "PE", "piauí": "PI", "piaui": "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
  "rondônia": "RO", "rondonia": "RO", "roraima": "RR", "santa catarina": "SC",
  "são paulo": "SP", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO",
};
// Resolve um termo de estado (sigla já pronta ou nome completo) pra sigla de 2 letras.
export function resolverUF(termo) {
  if (!termo) return "";
  const limpo = termo.trim();
  if (limpo.length === 2) return limpo.toUpperCase();
  return UF_POR_NOME[limpo.toLowerCase()] || "";
}

// Distância (metros) e rumo (graus, 0-360 a partir do Norte) entre 2 pontos —
// usados pro modo de navegação: decidir se moveu o suficiente pra recalcular
// a direção (evita jitter do GPS parado) e pra rotacionar a seta do motorista.
export function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function calcularRumo(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180, toDeg = r => r * 180 / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
