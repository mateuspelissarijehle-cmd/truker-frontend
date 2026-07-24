import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { BottomNavContratante } from "../../components/BottomNavContratante";

// ─────────────────────────────────────────────
// CONTRATANTE HOME
// ─────────────────────────────────────────────
export function ContratanteHome({ onNavigate }) {
  const { user, token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const stats = {
    pendentes: fretes.filter(f => f.status === "aguardando").length,
    emTransito: fretes.filter(f => ["aceito", "em_rota", "coletando"].includes(f.status)).length,
    entregues: fretes.filter(f => f.status === "entregue").length,
  };

  return (
    <div className="screen">
      <div className="header">
        <div><div style={{ fontSize: 11, color: "var(--text2)" }}>Olá,</div><h1>{user?.nome?.split(" ")[0] || "Contratante"}</h1></div>
        <div style={{ marginLeft: "auto", fontSize: 24, cursor: "pointer" }} onClick={() => onNavigate("perfil")}>👤</div>
      </div>
      <div className="content">
        <div className="grid-3" style={{ marginBottom: 16 }}>
          {[["⏳", stats.pendentes, "Pendentes"], ["🚛", stats.emTransito, "Em Rota"], ["✅", stats.entregues, "Entregues"]].map(([icon, val, label]) => (
            <div key={label} className="stat-card"><div style={{ fontSize: 18 }}>{icon}</div><div className="stat-value" style={{ fontSize: 22 }}>{val}</div><div className="stat-label">{label}</div></div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => onNavigate("solicitar-frete")}>+ Solicitar Frete</button>
        <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => onNavigate("buscar-motoristas")}>🔍 Buscar Motoristas Disponíveis</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Meus Fretes</span>
          <span style={{ fontSize: 12, color: "var(--orange)", cursor: "pointer" }} onClick={() => onNavigate("meus-fretes")}>Ver todos</span>
        </div>
        {loading ? <Loading /> : fretes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
            <p style={{ fontWeight: 600 }}>Nenhum frete ainda</p>
            <p style={{ fontSize: 13, marginTop: 4, color: "#444" }}>Solicite seu primeiro frete!</p>
          </div>
        ) : fretes.slice(0, 3).map(f => (
          <div key={f.id} className="frete-card" onClick={() => onNavigate("detalhe-frete", f)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <StatusBadge status={f.status} />
              <div className="price">{formatMoney(f.valor_final || f.valor_antt || f.valor_motorista || 0)}</div>
            </div>
            <div className="route">{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
            <div className="meta"><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>⚖️ {f.peso_tons}t</span></div>
          </div>
        ))}
      </div>
      <BottomNavContratante active="inicio" onNavigate={onNavigate} />
    </div>
  );
}
