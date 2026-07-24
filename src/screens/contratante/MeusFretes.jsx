import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { BottomNavContratante } from "../../components/BottomNavContratante";

// ─────────────────────────────────────────────
// MEUS FRETES CONTRATANTE
// ─────────────────────────────────────────────
export function MeusFretes({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const filtrados = filtro === "todos" ? fretes : fretes.filter(f => {
    if (filtro === "andamento") return ["aceito", "em_rota", "coletando"].includes(f.status);
    if (filtro === "aguardando") return f.status === "aguardando";
    if (filtro === "concluido") return f.status === "entregue";
    if (filtro === "cancelado") return f.status === "cancelado";
    return true;
  });

  const totalGasto = fretes.filter(f => f.status === "entregue").reduce((a, f) => a + Number(f.valor_final || f.valor_antt || 0), 0);

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-contratante")}>←</button>
        <h1>Meus Fretes</h1>
      </div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total fretes</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{fretes.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total gasto</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(totalGasto)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          {[["todos","Todos"],["andamento","Em andamento"],["aguardando","Aguardando"],["concluido","Concluídos"],["cancelado","Cancelados"]].map(([s, l]) => (
            <button key={s} onClick={() => setFiltro(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filtro === s ? "var(--gold)" : "var(--border)", background: filtro === s ? "var(--gold)" : "var(--surface)", color: filtro === s ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>{l}</button>
          ))}
        </div>
        {loading ? <Loading /> : filtrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>Nenhum frete nessa categoria</div>
        ) : filtrados.map(f => {
          const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—";
          return (
            <div key={f.id} className="frete-card" onClick={() => onNavigate("detalhe-frete", f)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <StatusBadge status={f.status} />
                <div style={{ textAlign: "right" }}>
                  <div className="price" style={{ fontSize: 18 }}>{formatMoney(f.valor_final || f.valor_antt || 0)}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>valor do frete</div>
                </div>
              </div>
              <div className="route" style={{ fontSize: 14 }}>{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
              <div className="meta" style={{ marginTop: 6 }}><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>⚖️ {f.peso_tons}t</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text3)" }}>
                <span>📅 {data}</span>
                <span>🚛 {f.motorista_nome || "Aguardando"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNavContratante active="atividade" onNavigate={onNavigate} />
    </div>
  );
}
