// Paleta compartilhada entre linhas de rota (MapaLeaflet rotas[]) e
// marcadores ao vivo (MapaLeaflet marcadoresAoVivo[]) -- pareados pelo mesmo
// índice/id pra cada caminhão ter a mesma cor da sua própria linha, tanto no
// mapa multi-frete do motorista quanto no painel multi-caminhão do
// solicitante (item 4, 27/08/2026). Extraído num arquivo à parte (em vez de
// exportado de MapaLeaflet.jsx) porque um arquivo de componente só pode
// exportar componentes sem quebrar o Fast Refresh (react-refresh/only-export-components).
export const CORES_ROTAS_MULTI = ["#C9A84C", "#2D7A3A", "#2563EB", "#9333EA", "#EF4444", "#EA580C", "#0891B2", "#DB2777"];
