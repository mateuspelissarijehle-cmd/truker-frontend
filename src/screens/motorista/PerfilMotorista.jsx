import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney, formatKm } from "../../utils/format";
import { TIPOS_VEICULO } from "../../data/catalogos";
import { Loading } from "../../components/Loading";
import { BottomNavMotorista } from "../../components/BottomNavMotorista";
import { DespesasTab } from "./DespesasTab";

// ─────────────────────────────────────────────
// PERFIL MOTORISTA — ✅ ganhos reais da API
// ─────────────────────────────────────────────
export function PerfilMotorista({ onNavigate }) {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState("resumo");
  const [metaKmVazio, setMetaKmVazio] = useState(800);
  const [editMeta, setEditMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState("800");
  const [ganhos, setGanhos] = useState(null);
  const [loadingGanhos, setLoadingGanhos] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [testePushMsg, setTestePushMsg] = useState(null);

  const testarPush = async () => {
    setTestePushMsg("Enviando...");
    try {
      const res = await api("POST", "/api/push/testar", {}, token);
      const ok = res.resultados?.some(r => r.ok);
      if (ok) {
        setTestePushMsg("✅ Push enviado! Verifique a notificação.");
      } else {
        const erros = res.resultados?.map(r => `${r.status}: ${r.erro}`).join(", ");
        setTestePushMsg("❌ Falhou: " + (erros || "sem subscription"));
      }
    } catch (e) {
      setTestePushMsg("❌ Erro: " + e.message);
    }
    setTimeout(() => setTestePushMsg(null), 8000);
  };
  // Km vazio real do mês, vindo do mesmo endpoint que a MotoristaHome usa
  // (não há, hoje, um detalhamento por tipo de carga no backend — ver aba
  // "KM Vazio por tipo de carga" abaixo).
  const kmVazio = Number(ganhos?.km_vazio_total || 0);
  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  // Carrega perfil completo ao montar
  useEffect(() => {
    api("GET", "/api/motoristas/perfil", null, token)
      .then(setPerfil)
      .catch(() => {});
  }, []);

  // Busca ganhos reais ao entrar na aba
  useEffect(() => {
    if ((tab === "ganhos" || tab === "resumo" || tab === "km-vazio") && !ganhos && !loadingGanhos) {
      setLoadingGanhos(true);
      api("GET", "/api/motoristas/ganhos", null, token)
        .then(setGanhos)
        .catch(() => setGanhos(null))
        .finally(() => setLoadingGanhos(false));
    }
  }, [tab]);

  return (
    <div className="screen">
      <div className="header"><h1>Perfil</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "14px 0 20px" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 28 }}>🚛</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>{user?.email}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
            <span className="badge badge-active">Motorista</span>
            <span className="badge" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }}>⭐ {ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</span>
          </div>
        </div>

        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["resumo", "Resumo"], ["ganhos", "Ganhos"], ["km-vazio", "KM Vazio"], ["despesas", "Despesas"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === "resumo" && (
          <>
            {loadingGanhos ? <Loading /> : (
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="stat-card"><div className="stat-value">{ganhos?.total_fretes ?? "—"}</div><div className="stat-label">Fretes feitos</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</div><div className="stat-label">Avaliação</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_carregado) : "—"}</div><div className="stat-label">Km carregado</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_vazio_total || 0) : "—"}</div><div className="stat-label">Km vazio total</div></div>
              </div>
            )}
            <div className="card">
              <div className="card-title">Dados do veículo</div>
              <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">{(() => { const t = TIPOS_VEICULO.find(v => v.id === (perfil?.tipo_veiculo || user?.tipo_veiculo)); return t ? `${t.icon} ${t.label}` : (perfil?.tipo_veiculo || "—"); })()}</span></div>
              <div className="info-row"><span className="info-label">Marca/Modelo</span><span className="info-value">{[perfil?.marca_veiculo, perfil?.modelo_veiculo].filter(Boolean).join(" ") || "—"}</span></div>
              <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{perfil?.placa_veiculo || "—"}</span></div>
              <div className="info-row"><span className="info-label">Ano</span><span className="info-value">{perfil?.ano_veiculo || "—"}</span></div>
              <div className="info-row"><span className="info-label">RNTRC</span><span className="info-value">{perfil?.rntrc || "—"}</span></div>
              <div className="info-row"><span className="info-label">CNH</span><span className="info-value">{perfil?.cnh_numero || "—"}</span></div>
            </div>
            {[["📦", "Meus Fretes", "meus-fretes-motorista"], ["💬", "Chat", "chat"], ["⭐", "Avaliações", "avaliacoes"]].map(([icon, label, screen]) => (
              <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(screen)}>
                <span style={{ fontSize: 20 }}>{icon}</span><span style={{ fontWeight: 600 }}>{label}</span><span style={{ marginLeft: "auto", color: "var(--text2)" }}>›</span>
              </div>
            ))}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>Minha Conta</div>
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
              {[
                { icon: "👤", label: "Dados Pessoais", sub: "Nome, foto, CPF, CNH, endereço", screen: "dados-pessoais-motorista" },
                { icon: "🚛", label: "Meu Caminhão", sub: "Tipo, carreta, placa, documentos", screen: "dados-caminhao" },
                { icon: "🛡️", label: "Seguro", sub: "Obrigatório pra aceitar fretes", screen: "seguro-motorista" },
                { icon: "💰", label: "Minhas Finanças", sub: "Despesas, receitas e controle", screen: "financas-motorista" },
                { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: "notificacoes" },
                { icon: "🔒", label: "Privacidade", sub: "Senha, dados pessoais", screen: "privacidade" },
                { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
              ].map((item, i) => (
                <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < 6 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: i < 3 ? "var(--gold-light)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
            <button className="btn btn-danger" style={{ marginTop: 4 }} onClick={logout}>Sair da Conta</button>
            <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={testarPush}>🔔 Testar Push Notification</button>
            {testePushMsg && <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, fontSize: 13, color: "#f97316", textAlign: "center" }}>{testePushMsg}</div>}
          </>
        )}

        {tab === "ganhos" && (
          <>
            {loadingGanhos ? <Loading /> : ganhos ? (
              <>
                <div className="card" style={{ textAlign: "center", borderColor: "rgba(201,168,76,0.3)" }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Ganhos este mês</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(ganhos.ganhos_mes_atual)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                    {ganhos.fretes_mes_atual} fretes · média {formatMoney(ganhos.media_por_frete)}/frete
                  </div>
                </div>
                {ganhos.historico_mensal?.length > 0 && (
                  <div className="card">
                    <div className="card-title">Histórico mensal</div>
                    {ganhos.historico_mensal.map(m => (
                      <div key={m.mes} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                          <span style={{ fontWeight: 700 }}>{m.mes}/{m.ano}</span>
                          <span style={{ color: "var(--green)", fontWeight: 700 }}>{formatMoney(m.valor)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill green" style={{ width: `${Math.round((Number(m.valor) / Math.max(...ganhos.historico_mensal.map(x => Number(x.valor)), 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="card">
                  <div className="card-title">Resumo total</div>
                  <div className="info-row"><span className="info-label">Total de fretes</span><span className="info-value">{ganhos.total_fretes}</span></div>
                  <div className="info-row"><span className="info-label">Km carregado total</span><span className="info-value">{formatKm(ganhos.km_carregado)}</span></div>
                  <div className="info-row"><span className="info-label">Ganhos totais</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(ganhos.ganhos_total)}</span></div>
                </div>
              </>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                <p style={{ fontWeight: 600 }}>Nenhum dado disponível</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Complete seu primeiro frete para ver os ganhos</p>
              </div>
            )}
          </>
        )}

        {tab === "km-vazio" && (
          loadingGanhos && !ganhos ? <Loading /> : (
          <>
            <div className="card">
              <div className="card-title">Meta de KM Vazio (mensal)</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: pctMeta > 100 ? "var(--red)" : pctMeta > 75 ? "var(--orange)" : "var(--green)" }}>{formatKm(kmVazio)}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>rodado vazio este mês</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {!editMeta ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Meta: {formatKm(metaKmVazio)}</div>
                      <span style={{ fontSize: 12, color: "var(--orange)", cursor: "pointer" }} onClick={() => setEditMeta(true)}>✏️ Editar</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="number" value={novaMeta} onChange={e => setNovaMeta(e.target.value)} style={{ width: 80, background: "var(--dark3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--white)", fontSize: 14, fontFamily: "Inter, sans-serif" }} />
                      <button className="btn btn-primary btn-sm" onClick={() => { setMetaKmVazio(Number(novaMeta)); setEditMeta(false); }}>OK</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className={`progress-fill ${pctMeta > 100 ? "red" : pctMeta > 75 ? "" : "green"}`} style={{ width: `${Math.min(pctMeta, 100)}%` }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                {pctMeta >= 100 ? "⚠️ Meta ultrapassada! Aceite fretes de retorno." : pctMeta > 75 ? "⚡ Atenção: próximo da meta." : `✅ ${formatKm(metaKmVazio - kmVazio)} restantes até a meta`}
              </div>
            </div>
            <div className="card">
              <div className="card-title">KM Vazio por tipo de carga</div>
              <div style={{ textAlign: "center", padding: "16px 8px", color: "var(--text3)" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
                <p style={{ fontSize: 13 }}>Ainda não temos esse detalhamento por tipo de carga.</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Em breve você poderá ver aqui em quais tipos de carga está rodando mais vazio.</p>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Eficiência geral</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--green)" }}>✅ Carregado: {ganhos ? formatKm(ganhos.km_carregado) : "—"}</span>
                <span style={{ fontSize: 13, color: "var(--red)" }}>⬜ Vazio: {formatKm(kmVazio)}</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill green" style={{ width: `${ganhos ? Math.round((Number(ganhos.km_carregado) / Math.max(Number(ganhos.km_carregado) + kmVazio, 1)) * 100) : 0}%` }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: "var(--green)" }}>
                {ganhos ? `${Math.round((Number(ganhos.km_carregado) / Math.max(Number(ganhos.km_carregado) + kmVazio, 1)) * 100)}% de eficiência` : "—"}
              </div>
            </div>
          </>
          )
        )}

        {tab === "despesas" && <DespesasTab />}
      </div>
      <BottomNavMotorista active="conta" onNavigate={onNavigate} />
    </div>
  );
}
