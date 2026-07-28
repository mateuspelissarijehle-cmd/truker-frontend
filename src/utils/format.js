export function formatMoney(v) { return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
export function formatKm(v) { return Number(v || 0).toLocaleString("pt-BR") + " km"; }
export function formatDateTime(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
