// ─────────────────────────────────────────────
// TIPOS DE CARGA
// ─────────────────────────────────────────────
// Limpeza geral pré-Play Store (13/09/2026, pedido do Mateus): removidas as
// ~20 categorias de carga geral (carga seca, mudança, carga viva, líquidos,
// construção etc.) que sobraram da versão anterior ao pivô V1-agro --
// inalcançáveis desde que o formulário de criar frete só oferece
// graneleiro/fertilizante (ver TIPOS_CARGA_VISIVEIS abaixo). O flag
// MODO_AGRO_V1 que preservava esse catálogo completo "pra poder reverter"
// também saiu -- reverter agora é restaurar do histórico do git (o Mateus já
// tem backup da versão anterior ao pivô), não mais trocar 1 constante.
//
// "granel_solido" e "neogranel" abaixo NÃO são opções do formulário -- são os
// IDs de categoria ANTT que o backend de fato grava em fretes.tipo_carga (ver
// CARGA_BACKEND_MAP mais abaixo: graneleiro→granel_solido,
// fertilizante→neogranel). As telas do motorista (Home, Convites, Em
// Trânsito, Aceitar Frete) resolvem o ícone/label de um frete já criado
// contra ESSES ids, não contra "graneleiro"/"fertilizante" -- por isso
// continuam aqui, com o mesmo ícone/label da opção equivalente do formulário
// (bug preexistente corrigido de passagem: "granel_solido" não tinha entrada
// nenhuma antes, então todo frete de grão mostrava o ícone genérico 📦 nas
// telas do motorista).
export const TIPOS_CARGA = [
  { id: "graneleiro", label: "Graneleiro", icon: "🌾", desc: "Grãos, cereais, farinha" },
  { id: "fertilizante", label: "Fertilizante", icon: "🧪", desc: "Fertilizante sólido ensacado/paletizado — mesma categoria ANTT do Neogranel" },
  { id: "granel_solido", label: "Graneleiro", icon: "🌾", desc: "Grãos, cereais, farinha" },
  { id: "neogranel", label: "Fertilizante", icon: "🧪", desc: "Fertilizante sólido ensacado/paletizado — mesma categoria ANTT do Neogranel" },
];

// Ids que aparecem de verdade no seletor de "Tipo de Carga" do formulário de
// criar frete -- exclui "granel_solido"/"neogranel" acima (esses só existem
// pra exibição de fretes já criados, nunca são escolhíveis).
const IDS_CARGA_VISIVEIS = ["graneleiro", "fertilizante"];
export const TIPOS_CARGA_VISIVEIS = TIPOS_CARGA.filter(c => IDS_CARGA_VISIVEIS.includes(c.id));

// Grãos primários (escopo da V1) -- sub-seleção só de descrição, não vira
// categoria ANTT nova nenhuma (todos caem em granel_solido/graneleiro).
// Some incluído em "descricao_carga" no formulário, o cálculo de piso não
// usa este valor em nenhum momento.
export const TIPOS_GRAO = [
  { id: "soja", label: "Soja" },
  { id: "milho", label: "Milho" },
  { id: "trigo", label: "Trigo" },
  { id: "arroz", label: "Arroz" },
  { id: "feijao", label: "Feijão" },
  { id: "cevada", label: "Cevada" },
  { id: "sorgo", label: "Sorgo" },
  { id: "outro_grao", label: "Outro grão" },
];

// Regras de formulário dinâmico por tipo de carga: dimensoes = mostrar campos
// comprimento/largura/altura? (só usado pelas 2 opções escolhíveis do
// formulário -- graneleiro/fertilizante -- não pelas entradas de exibição
// granel_solido/neogranel.) Peso é SEMPRE obrigatório (não entra aqui).
export const REGRAS_CARGA = {
  graneleiro:   { dimensoes: false },
  fertilizante: { dimensoes: true },
};
export const regrasCarga = (id) => REGRAS_CARGA[id] || { dimensoes: true };

// TIPOS_VEICULO = CHASSI real (o que determina o número de eixos, base do
// piso mínimo ANTT — services/antt.js VEICULOS é a mesma lista, mesmos ids).
// NÃO confundir com carroceria (o que vai montado em cima: graneleiro, tanque,
// prancha, munck, frigorífico — isso é escolhido separadamente, ver
// CARROCERIAS_ESPECIAIS abaixo e o campo "carroceria" nos formulários).
// Corrigido em 14/07/2026: antes esta lista misturava os dois conceitos.
export const TIPOS_VEICULO = [
  { id: "furgao", label: "Furgão", icon: "🚐", cap: "1,5t", eixosPadrao: 2 },
  { id: "vuc", label: "VUC", icon: "🚚", cap: "3t", eixosPadrao: 2 },
  { id: "toco", label: "Toco", icon: "🚛", cap: "6t", eixosPadrao: 2 },
  { id: "truck", label: "Truck", icon: "🚛", cap: "14t", eixosPadrao: 3 },
  { id: "carreta", label: "Carreta", icon: "🚛", cap: "25t", eixosPadrao: 4 },
  { id: "bitrem", label: "Bitrem", icon: "🚛", cap: "45t", eixosPadrao: 6 },
  { id: "rodotrem", label: "Rodotrem", icon: "🚛", cap: "57t", eixosPadrao: 9 },
];
export function eixosPadraoDoChassi(tipoVeiculoId) {
  return TIPOS_VEICULO.find(v => v.id === tipoVeiculoId)?.eixosPadrao ?? 4;
}

// CARROCERIA — o que vai montado no chassi, determina só compatibilidade de
// carga (não o piso). O catálogo completo com labels vem de
// GET /api/motoristas/carrocerias-disponiveis (services/matching.js
// CARROCERIAS é a fonte única de verdade); esta lista curta é só pros ícones.
export const ICONE_CARROCERIA = {
  bau: "📦", bau_frigorifico: "❄️", bau_refrigerado: "🧊", sider: "📦",
  graneleiro: "🌾", grade_baixa: "📐", cacamba: "🪨", plataforma: "🛠️",
  prancha: "🚧", tanque: "⛽", porta_container: "🚢", cegonha: "🚗",
  gaiola: "🐄", munck: "🏗️",
};

// Mapeamento frontend → categoria oficial ANTT (Tabela A, Resolução 5.867/2020,
// atualizada pela 6.084/2026 -- ver services/antt.js no backend). Só as 2
// opções escolhíveis do formulário precisam de entrada aqui.
export const CARGA_BACKEND_MAP = {
  graneleiro: "granel_solido",
  fertilizante: "neogranel",
};

export const TIPOS_DESPESA = [
  { id: "combustivel", icon: "⛽", label: "Combustível" }, { id: "manutencao", icon: "🔧", label: "Manutenção" },
  { id: "pedagio", icon: "🛣️", label: "Pedágio" }, { id: "pneu", icon: "🔄", label: "Pneus" },
  { id: "seguro", icon: "🛡️", label: "Seguro" }, { id: "multa", icon: "🚨", label: "Multa" },
  { id: "alimentacao", icon: "🍽️", label: "Alimentação" }, { id: "hospedagem", icon: "🏨", label: "Hospedagem" },
  { id: "outro", icon: "📦", label: "Outro" },
];
