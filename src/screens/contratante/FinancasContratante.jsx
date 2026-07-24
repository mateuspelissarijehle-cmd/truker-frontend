import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney, formatKm } from "../../utils/format";
import { TIPOS_CARGA } from "../../data/catalogos";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";

// ─────────────────────────────────────────────
// PAINEL FINANCEIRO — CONTRATANTE
// ─────────────────────────────────────────────
export function FinancasContratante({ onNavigate }) {
  const { token } = useAuth();
  const [periodo, setPeriodo] = useState("12m");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [aba, setAba] = useState("mes");

  useEffect(() => {
    setLoading(true);
    setErro(false);
    api("GET", `/api/contratantes/financeiro?periodo=${periodo}`, null, token)
      .then(setDados)
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, [periodo, token]);

  const iconCarga = (tipo) => TIPOS_CARGA.find(t => t.id === tipo)?.icon || "📦";
  const labelCarga = (tipo) => TIPOS_CARGA.find(t => t.id === tipo)?.label || tipo || "—";

  const resumo = dados?.resumo || dados || {};
  const porMes = dados?.por_mes || [];
  const porRota = dados?.por_rota || [];
  const porTipo = dados?.por_tipo_carga || [];
  const extrato = dados?.extrato || [];

  const maxMes = Math.max(1, ...porMes.map(m => Number(m.valor || 0)));
  const maxRota = Math.max(1, ...porRota.map(r => Number(r.valor || 0)));
  const maxTipo = Math.max(1, ...porTipo.map(t => Number(t.valor || 0)));

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Painel Financeiro</h1></div>
      <div className="content">
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["12m", "Últimos 12 meses"], ["desde_inicio", "Desde o início"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${periodo === id ? "active" : ""}`} onClick={() => setPeriodo(id)}>{label}</button>
          ))}
        </div>

        {loading ? <Loading /> : erro ? (
          <div className="alert alert-error">Não foi possível carregar os dados financeiros. Tente novamente mais tarde.</div>
        ) : (
          <>
            <div className="grid-2" style={{ marginBottom: 10 }}>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total Gasto</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(resumo.total_gasto)}</div></div>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Ticket Médio</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{formatMoney(resumo.ticket_medio)}</div></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total de Fretes</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{resumo.total_fretes ?? 0}</div></div>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Km Total</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{formatKm(resumo.km_total)}</div></div>
            </div>

            <div className="tab-bar" style={{ marginBottom: 14 }}>
              {[["mes", "Por Mês"], ["rota", "Por Rota"], ["tipo", "Por Tipo"], ["extrato", "Extrato"]].map(([id, label]) => (
                <button key={id} className={`tab-btn ${aba === id ? "active" : ""}`} onClick={() => setAba(id)}>{label}</button>
              ))}
            </div>

            {aba === "mes" && (
              porMes.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                  <p style={{ fontWeight: 600 }}>Nenhum gasto no período</p>
                </div>
              ) : porMes.map((m, i) => (
                <div key={i} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{String(m.mes).slice(0, 3)}/{String(m.ano).slice(-2)}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{m.fretes} frete{m.fretes === 1 ? "" : "s"}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)" }}>{formatMoney(m.valor)}</div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(m.valor || 0) / maxMes) * 100}%` }} /></div>
                </div>
              ))
            )}

            {aba === "rota" && (
              porRota.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
                  <p style={{ fontWeight: 600 }}>Nenhuma rota no período</p>
                </div>
              ) : porRota.map((r, i) => (
                <div key={i} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.origem || "—"} → {r.destino || "—"}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)", whiteSpace: "nowrap" }}>{formatMoney(r.valor)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>{r.fretes} frete{r.fretes === 1 ? "" : "s"}</div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(r.valor || 0) / maxRota) * 100}%` }} /></div>
                </div>
              ))
            )}

            {aba === "tipo" && (
              porTipo.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                  <p style={{ fontWeight: 600 }}>Nenhuma carga no período</p>
                </div>
              ) : porTipo.map((t, i) => (
                <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{iconCarga(t.tipo_carga)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{labelCarga(t.tipo_carga)}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>{t.fretes} frete{t.fretes === 1 ? "" : "s"}</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(t.valor || 0) / maxTipo) * 100}%` }} /></div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)", whiteSpace: "nowrap" }}>{formatMoney(t.valor)}</div>
                </div>
              ))
            )}

            {aba === "extrato" && (
              extrato.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                  <p style={{ fontWeight: 600 }}>Nenhum frete no período</p>
                </div>
              ) : extrato.map((f) => {
                const cancelado = f.status === "cancelado";
                return (
                  <div key={f.id} className="card" style={cancelado ? { background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.3)" } : {}}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{f.origem || "—"} → {f.destino || "—"}</div>
                      <StatusBadge status={f.status} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                      {iconCarga(f.tipo_carga)} {labelCarga(f.tipo_carga)} · {f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—"}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: cancelado ? "var(--red)" : "var(--gold)" }}>{formatMoney(f.valor)}</div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
