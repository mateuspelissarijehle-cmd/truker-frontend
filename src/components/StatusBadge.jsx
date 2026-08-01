export function StatusBadge({ status }) {
  const map = { aguardando: ["badge-pending", "Aguardando"], aceito: ["badge-active", "Aceito"], coletando: ["badge-active", "Coletando"], em_rota: ["badge-active", "Em Rota"], entregue: ["badge-done", "Entregue"], cancelado: ["badge-cancel", "Cancelado"], problema_entrega: ["badge-cancel", "Problema na entrega"] };
  const [cls, label] = map[status] || ["badge-pending", status];
  return <span className={`badge ${cls}`}>{label}</span>;
}
