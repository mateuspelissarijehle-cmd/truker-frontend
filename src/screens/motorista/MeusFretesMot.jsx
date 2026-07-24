import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, abrirArquivoAutenticado } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { BottomNavMotorista } from "../../components/BottomNavMotorista";

// ─────────────────────────────────────────────
// MEUS FRETES MOTORISTA
// ─────────────────────────────────────────────
export function MeusFretesMot({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [contratoLoadingId, setContratoLoadingId] = useState(null);
  const [contratoError, setContratoError] = useState("");

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const verContrato = async (freteId) => {
    setContratoLoadingId(freteId); setContratoError("");
    try { await abrirArquivoAutenticado(`/api/fretes/${freteId}/contrato`, token); }
    catch (e) { setContratoError(e.message); }
    finally { setContratoLoadingId(null); }
  };

  const filtrados = filtro === "todos" ? fretes : fretes.filter(f => {
    if (filtro === "andamento") return ["aceito", "em_rota", "coletando"].includes(f.status);
    if (filtro === "concluido") return f.status === "entregue";
    return true;
  });

  const totalGanho = fretes.filter(f => f.status === "entregue").reduce((a, f) => a + Number(f.valor_motorista || 0), 0);

  return (
    <div className="screen">
      <div className="header"><h1>Meus Fretes</h1></div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total fretes</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{fretes.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total ganho</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--green)" }}>{formatMoney(totalGanho)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["todos","Todos"],["andamento","Em andamento"],["concluido","Concluídos"]].map(([s, l]) => (
            <button key={s} onClick={() => setFiltro(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filtro === s ? "var(--gold)" : "var(--border)", background: filtro === s ? "var(--gold)" : "var(--surface)", color: filtro === s ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{l}</button>
          ))}
        </div>
        {contratoError && <div className="alert alert-error">{contratoError}</div>}
        {loading ? <Loading /> : filtrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>Nenhum frete nessa categoria</div>
        ) : filtrados.map(f => {
          const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—";
          const emAndamento = ["aceito", "em_rota", "coletando"].includes(f.status);
          return (
            <div key={f.id} className="frete-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <StatusBadge status={f.status} />
                <div style={{ fontWeight: 800, color: "var(--green)", fontSize: 18 }}>{formatMoney(f.valor_motorista || f.valor_antt || 0)}</div>
              </div>
              <div className="route" style={{ fontSize: 14 }}>{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
              <div className="meta" style={{ marginTop: 6 }}><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>📅 {data}</span></div>
              {emAndamento && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("em-transito", f)}>📍 Ver em trânsito</button>
              )}
              {f.status === "entregue" && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => verContrato(f.id)} disabled={contratoLoadingId === f.id}>
                  {contratoLoadingId === f.id ? "Abrindo contrato..." : "📄 Ver Contrato"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNavMotorista active="atividade" onNavigate={onNavigate} />
    </div>
  );
}
