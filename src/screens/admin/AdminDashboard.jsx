import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney, formatKm } from "../../utils/format";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────
export function AdminDashboard({ onNavigate }) {
  const { token, logout } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [motoristas, setMotoristas] = useState([]);
  const [fretes, setFretes] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    Promise.all([
      api("GET", "/api/admin/stats", null, token),
      api("GET", "/api/admin/motoristas", null, token),
      api("GET", "/api/admin/fretes", null, token),
    ]).then(([s, m, f]) => { setStats(s); setMotoristas(m); setFretes(f); })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  const totalKmCarregado = motoristas.reduce((a, m) => a + Number(m.km_carregado || 0), 0);
  const eficiencia = stats ? Math.round((stats.fretes_entregues / Math.max(stats.total_fretes, 1)) * 100) : 0;

  const StatusFreteTag = ({ status }) => {
    const map = { aguardando: ["badge-pending","Aguardando"], aceito: ["badge-active","Aceito"], em_rota: ["badge-active","Em Rota"], entregue: ["badge-done","Entregue"], cancelado: ["badge-cancel","Cancelado"] };
    const [cls, label] = map[status] || ["badge-pending", status];
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  return (
    <div className="screen">
      <div className="header">
        <h1>Dashboard Master</h1>
        <div className="badge badge-admin" style={{ marginLeft: "auto" }}>ADMIN</div>
      </div>
      <div className="content">
        <div className="tab-bar">
          {[["overview","Visão Geral"],["motoristas","Motoristas"],["fretes","Fretes"],["relatorios","Relatórios"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => onNavigate("admin-usuarios")}>
          🔧 Gerenciar Usuários (Master)
        </button>
        <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={() => onNavigate("admin-motorista-teste")}>
          🚛 Criar Motorista de Teste
        </button>
        <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={() => onNavigate("admin-seguradoras")}>
          🛡️ Gerenciar Seguradoras
        </button>
        <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={() => onNavigate("admin-trocar-senha")}>
          🔑 Trocar Senha
        </button>

        {loadingStats && <Loading />}

        {!loadingStats && tab === "overview" && stats && (
          <>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="stat-card"><div className="stat-value">{stats.total_motoristas}</div><div className="stat-label">Motoristas</div></div>
              <div className="stat-card"><div className="stat-value">{stats.total_fretes}</div><div className="stat-label">Fretes Totais</div></div>
              <div className="stat-card"><div className="stat-value">{stats.fretes_entregues}</div><div className="stat-label">Entregues</div></div>
              <div className="stat-card"><div className="stat-value">{stats.motoristas_online}</div><div className="stat-label">Online Agora</div></div>
            </div>
            <div className="card">
              <div className="card-title">Receita da Plataforma</div>
              <div className="info-row"><span className="info-label">Volume total movimentado</span><span className="info-value" style={{ color: "var(--orange)" }}>{formatMoney(stats.valor_total_movimentado)}</span></div>
              <div className="info-row"><span className="info-label">Pago aos motoristas</span><span className="info-value" style={{ color: "var(--green)" }}>{formatMoney(stats.valor_pago_motoristas)}</span></div>
              <div className="info-row"><span className="info-label">Receita TRUKER</span><span className="info-value" style={{ color: "var(--orange)" }}>{formatMoney(stats.receita_truker)}</span></div>
            </div>
            <div className="card">
              <div className="card-title">Status dos Fretes</div>
              {[["Aguardando", stats.fretes_aguardando, "var(--orange)"], ["Aceitos / Em Rota", stats.fretes_aceito + stats.fretes_em_rota, "var(--blue)"], ["Entregues", stats.fretes_entregues, "var(--green)"], ["Cancelados", stats.fretes_cancelados, "var(--red)"]].map(([label, val, cor]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{label}</span><span style={{ color: cor, fontWeight: 700 }}>{val}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.round((val / Math.max(stats.total_fretes, 1)) * 100)}%`, background: cor }} /></div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Motoristas Online</div>
              {motoristas.filter(m => m.online).length === 0 && <p style={{ fontSize: 13, color: "var(--text2)" }}>Nenhum motorista online agora</p>}
              {motoristas.filter(m => m.online).map(m => (
                <div key={m.id} className="admin-row">
                  <div><span className="online-dot" /><strong>{m.nome}</strong><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{m.tipo_veiculo} · {m.total_fretes} fretes · ⭐ {Number(m.avaliacao_media).toFixed(1)}</div></div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    <div style={{ color: "var(--green)" }}>{formatKm(m.km_carregado)}</div>
                    <div style={{ color: "var(--orange)", fontSize: 11 }}>{formatMoney(m.ganhos_total)} ganhos</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loadingStats && tab === "overview" && !stats && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            <p style={{ fontWeight: 600 }}>Erro ao carregar dados</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Verifique a conexão com o banco de dados</p>
          </div>
        )}

        {!loadingStats && tab === "motoristas" && (
          <>
            {motoristas.length === 0 && <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>Nenhum motorista cadastrado</div>}
            {motoristas.map(m => (
              <div key={m.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.online ? <span className="online-dot" /> : <span className="offline-dot" />}{m.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{m.tipo_veiculo || "—"} · {m.total_fretes} fretes · ⭐ {Number(m.avaliacao_media).toFixed(1)}</div>
                  </div>
                  <span className={`badge ${m.online ? "badge-active" : ""}`} style={!m.online ? { background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)" } : {}}>{m.online ? "Online" : "Offline"}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: "var(--green)" }}>✅ {formatKm(m.km_carregado)} carregado</span>
                  <span style={{ color: "var(--orange)" }}>💰 {formatMoney(m.ganhos_total)}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {!loadingStats && tab === "fretes" && (
          <>
            {fretes.length === 0 && <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>Nenhum frete na plataforma</div>}
            {fretes.map(f => (
              <div key={f.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <StatusFreteTag status={f.status} />
                  <span className="price" style={{ fontSize: 16 }}>{formatMoney(f.valor_final || f.valor_antt)}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.origem_cidade} → {f.dest_cidade}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  📦 {f.tipo_carga} · 📏 {f.distancia_km} km · ⚖️ {f.peso_tons}t
                </div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6 }}>
                  Contratante: {f.contratante_nome} {f.motorista_nome ? `· Motorista: ${f.motorista_nome}` : ""}
                </div>
              </div>
            ))}
          </>
        )}

        {!loadingStats && tab === "relatorios" && (
          <>
            <div className="card">
              <div className="card-title">Eficiência por Motorista</div>
              {motoristas.length === 0 && <p style={{ fontSize: 13, color: "var(--text2)" }}>Sem dados ainda</p>}
              {motoristas.map(m => (
                <div key={m.id} className="admin-row">
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.nome}</span>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{m.total_fretes} fretes · {formatKm(m.km_carregado)}</div>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>{formatMoney(m.ganhos_total)}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Resumo Financeiro</div>
              {stats && (
                <>
                  <div className="info-row"><span className="info-label">Contratantes</span><span className="info-value">{stats.total_contratantes}</span></div>
                  <div className="info-row"><span className="info-label">Fretes aguardando</span><span className="info-value" style={{ color: "var(--orange)" }}>{stats.fretes_aguardando}</span></div>
                  <div className="info-row"><span className="info-label">Taxa de entrega</span><span className="info-value" style={{ color: "var(--green)" }}>{eficiencia}%</span></div>
                  <div className="info-row"><span className="info-label">Volume total</span><span className="info-value">{formatMoney(stats.valor_total_movimentado)}</span></div>
                </>
              )}
            </div>
          </>
        )}

        <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={logout}>Sair do Admin</button>
      </div>
    </div>
  );
}
