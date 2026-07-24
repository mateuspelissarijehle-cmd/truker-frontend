export function formatMoney(v) { return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
export function formatKm(v) { return Number(v || 0).toLocaleString("pt-BR") + " km"; }
