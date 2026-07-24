// ─────────────────────────────────────────────
// TIPOS DE CARGA
// ─────────────────────────────────────────────
export const TIPOS_CARGA = [
  { id: "carga_seca", label: "Carga Seca", icon: "📦", desc: "Paletes, caixas, embalagens gerais" },
  { id: "graneleiro", label: "Graneleiro", icon: "🌾", desc: "Grãos, cereais, farinha" },
  { id: "refrigerada", label: "Refrigerada", icon: "❄️", desc: "Alimentos perecíveis, laticínios" },
  { id: "frigorifico", label: "Frigorífico", icon: "🥩", desc: "Carnes, aves, embutidos" },
  { id: "mudanca", label: "Mudança", icon: "🏠", desc: "Móveis, eletrodomésticos" },
  { id: "carga_viva", label: "Carga Viva", icon: "🐄", desc: "Animais vivos" },
  { id: "liquidos", label: "Líquidos", icon: "💧", desc: "Água, sucos, bebidas" },
  { id: "inflamavel", label: "Inflamável", icon: "🔥", desc: "Combustíveis, solventes" },
  { id: "perigosa", label: "Perigosa/IMOS", icon: "⚠️", desc: "Produtos químicos, explosivos" },
  { id: "farmaceutico", label: "Farmacêutico", icon: "💊", desc: "Medicamentos, insumos" },
  { id: "eletronicos", label: "Eletrônicos", icon: "💻", desc: "Computadores, celulares, TVs" },
  { id: "alimentos", label: "Alimentos Secos", icon: "🥫", desc: "Enlatados, grãos embalados" },
  { id: "bebidas", label: "Bebidas", icon: "🍺", desc: "Cerveja, refrigerante, água" },
  { id: "construcao", label: "Construção", icon: "🧱", desc: "Cimento, areia, tijolos" },
  { id: "maquinario", label: "Maquinário", icon: "⚙️", desc: "Máquinas agrícolas, equipamentos" },
  { id: "superdimensionado", label: "Superdimensionado", icon: "🏗️", desc: "Cargas indivisíveis, oversized" },
  { id: "residuos", label: "Resíduos/Sucata", icon: "♻️", desc: "Recicláveis, resíduos industriais" },
  { id: "veiculos", label: "Veículos", icon: "🚗", desc: "Carros, motos, caminhões" },
  { id: "classificados", label: "Classificados", icon: "🔒", desc: "Valores, documentos, escolta" },
  { id: "madeira", label: "Madeira", icon: "🪵", desc: "Toras, compensados, móveis" },
];

// Regras de formulário dinâmico por tipo de carga:
//  - dimensoes: mostrar campos comprimento/largura/altura?
//  - especial:  campo extra específico ("animal" | "itens" | "material" | null)
// Peso é SEMPRE obrigatório (não entra aqui). Espelha a lógica do backend.
export const REGRAS_CARGA = {
  carga_seca:        { dimensoes: true,  especial: null },
  graneleiro:        { dimensoes: false, especial: null },
  refrigerada:       { dimensoes: true,  especial: null },
  frigorifico:       { dimensoes: true,  especial: null },
  mudanca:           { dimensoes: false, especial: "itens" },
  carga_viva:        { dimensoes: false, especial: "animal" },
  liquidos:          { dimensoes: false, especial: null },
  inflamavel:        { dimensoes: false, especial: null },
  perigosa:          { dimensoes: true,  especial: null },
  farmaceutico:      { dimensoes: true,  especial: null },
  eletronicos:       { dimensoes: true,  especial: null },
  alimentos:         { dimensoes: true,  especial: null },
  bebidas:           { dimensoes: true,  especial: null },
  construcao:        { dimensoes: false, especial: "material" },
  maquinario:        { dimensoes: true,  especial: null },
  superdimensionado: { dimensoes: true,  especial: null },
  residuos:          { dimensoes: false, especial: null },
  veiculos:          { dimensoes: true,  especial: null },
  classificados:     { dimensoes: true,  especial: null },
  madeira:           { dimensoes: true,  especial: null },
};
export const regrasCarga = (id) => REGRAS_CARGA[id] || { dimensoes: true, especial: null };

export const TIPOS_ANIMAL = ["Bovino", "Suíno", "Aves", "Equino", "Ovino/Caprino", "Outros"];
export const TIPOS_MATERIAL = ["Cimento", "Areia", "Brita", "Tijolo/Bloco", "Vergalhão/Aço", "Madeira", "Telhas", "Outros"];

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

export const TIPOS_FRETE = [
  { id: "urbano", label: "Urbano", icon: "🏙️", desc: "Até 50km, dentro da cidade" },
  { id: "intermunicipal", label: "Intermunicipal", icon: "🛣️", desc: "50 a 300km, entre cidades" },
  { id: "interestadual", label: "Interestadual", icon: "🗺️", desc: "Acima de 300km, entre estados" },
  { id: "internacional", label: "Internacional", icon: "🌎", desc: "Cruzando fronteiras" },
];

// Mapeamento frontend → categoria oficial ANTT (Tabela A, Resolução 5.867/2020 + Portaria SUROC 4/2026)
// Categorias disponíveis: geral, frigorificado, perigoso, granel_liquido, granel_solido, neogranel, conteinerizado, granel_pressurizado
export const CARGA_BACKEND_MAP = {
  carga_seca: "geral", graneleiro: "granel_solido", refrigerada: "frigorificado",
  frigorifico: "frigorificado", mudanca: "geral", carga_viva: "geral",
  liquidos: "granel_liquido", inflamavel: "perigoso", perigosa: "perigoso",
  farmaceutico: "geral", eletronicos: "geral", alimentos: "geral",
  bebidas: "geral", construcao: "granel_solido", maquinario: "geral",
  superdimensionado: "geral", residuos: "granel_solido", veiculos: "geral",
  classificados: "geral", madeira: "geral",
};

export const TIPOS_DESPESA = [
  { id: "combustivel", icon: "⛽", label: "Combustível" }, { id: "manutencao", icon: "🔧", label: "Manutenção" },
  { id: "pedagio", icon: "🛣️", label: "Pedágio" }, { id: "pneu", icon: "🔄", label: "Pneus" },
  { id: "seguro", icon: "🛡️", label: "Seguro" }, { id: "multa", icon: "🚨", label: "Multa" },
  { id: "alimentacao", icon: "🍽️", label: "Alimentação" }, { id: "hospedagem", icon: "🏨", label: "Hospedagem" },
  { id: "outro", icon: "📦", label: "Outro" },
];
