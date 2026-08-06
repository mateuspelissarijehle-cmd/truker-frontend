import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { formatMoney, formatKm } from "../../utils/format";
import { TIPOS_DESPESA } from "../../data/catalogos";
import { useDespesasMotorista } from "../../hooks/useDespesasMotorista";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// MINHAS FINANÇAS — MOTORISTA
// ─────────────────────────────────────────────
export function FinancasMotorista({ onNavigate }) {
  const { token } = useAuth();
  const [tab, setTab] = useState("despesas");
  const [ganhos, setGanhos] = useState(null);
  const [extrato, setExtrato] = useState(null);
  const [loadingExtrato, setLoadingExtrato] = useState(true);
  const [loadingGanhos, setLoadingGanhos] = useState(true);
  const [metaKmVazio, setMetaKmVazio] = useState(800);
  const [editMeta, setEditMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState("800");
  const tiposDespesa = TIPOS_DESPESA;

  const kmVazio = Number(ganhos?.km_vazio_total || 0);
  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  // Mesma fonte de verdade da aba Despesas do Perfil — antes esta tela somava
  // só o valor bruto das despesas registradas manualmente, sem o resumo ANTT
  // (combustível + desgaste estimados), batendo um total diferente pro mesmo mês.
  const {
    despesas, resumoCustos, total: totalDespesas, showAdd, setShowAdd, loading: loadingAdd,
    nova, setN, comprovanteUrl, lendoNf, nfAviso,
    add, remover, handleNF,
  } = useDespesasMotorista();

  // Carrega ganhos e extrato de transações do banco já ao montar a tela (não só ao clicar na aba)
  useEffect(() => {
    queueMicrotask(() => { setLoadingGanhos(true); setLoadingExtrato(true); });
    api("GET", "/api/motoristas/ganhos", null, token)
      .then(setGanhos).catch(() => setGanhos(null)).finally(() => setLoadingGanhos(false));
    api("GET", "/api/motoristas/extrato", null, token)
      .then(d => setExtrato(d.transacoes || []))
      .catch(() => setExtrato([]))
      .finally(() => setLoadingExtrato(false));
  }, [token]);

  const totalReceitas = Number(ganhos?.ganhos_total || 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Minhas Finanças</h1></div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 10 }}>
          <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Receitas</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--green)" }}>{formatMoney(totalReceitas)}</div></div>
          <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Despesas</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>{formatMoney(totalDespesas)}</div></div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 14, marginBottom: 14, borderColor: saldo >= 0 ? "rgba(45,122,58,0.3)" : "rgba(192,57,43,0.3)" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Saldo</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: saldo >= 0 ? "var(--green)" : "var(--red)" }}>{formatMoney(saldo)}</div>
        </div>
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["despesas","💸 Despesas"],["receitas","💰 Receitas"],["km-vazio","🛣️ KM Vazio"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        {tab === "despesas" && (
          <>
            {resumoCustos && (
              <div className="grid-2" style={{ marginBottom: 6 }}>
                <div className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>⛽</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Combustível</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{formatMoney(resumoCustos.combustivelTotal)}</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🔧</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Desgaste</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{formatMoney(resumoCustos.desgasteTotal)}</div>
                </div>
              </div>
            )}
            {resumoCustos && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: -8, marginBottom: 14, textAlign: "center" }}>
                O total de despesas inclui combustível e desgaste estimados com base nos coeficientes oficiais da ANTT, somando todos os {resumoCustos.totalFretesConsiderados} fretes aceitos — além do que você registra manualmente abaixo.
              </p>
            )}
            <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>+ Adicionar Despesa</button>
            {showAdd && (
              <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 14 }}>
                <div className="card-title">Nova Despesa</div>
                <div className="field"><label>Tipo</label>
                  <select value={nova.tipo} onChange={e => setN("tipo", e.target.value)}>
                    {tiposDespesa.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div className="field"><label>Descrição</label><input value={nova.descricao} onChange={e => setN("descricao", e.target.value)} placeholder="Ex: Abastecimento posto BR" /></div>
                <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={nova.valor} onChange={e => setN("valor", e.target.value)} placeholder="0,00" /></div>
                <div className="field"><label>Data</label><input type="date" value={nova.data} onChange={e => setN("data", e.target.value)} /></div>
                <label className="upload-area" style={{ display: "block", marginBottom: 8, cursor: lendoNf ? "default" : "pointer", opacity: lendoNf ? 0.6 : 1 }}>
                  {lendoNf ? "Lendo NF..." : comprovanteUrl ? "📄 NF anexada — trocar arquivo" : "📄 Anexar NF — tipo e valor detectados automaticamente (PDF)"}
                  <input type="file" accept="image/*,application/pdf,.heic,.heif" style={{ display: "none" }} onChange={handleNF} disabled={lendoNf} />
                </label>
                {nfAviso && <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>{nfAviso}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={add} disabled={loadingAdd}>{loadingAdd ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
            )}
            {despesas.length === 0 && !showAdd && (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                <p style={{ fontWeight: 600 }}>Nenhuma despesa registrada</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Registre combustível, pedágio, manutenção e mais.</p>
              </div>
            )}
            {despesas.map(d => {
              const t = tiposDespesa.find(x => x.id === d.tipo) || { icon: "📦", label: d.tipo };
              return (
                <div key={d.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(192,57,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{t.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{d.descricao || "—"} · {d.data?.slice(0,10)}</div></div>
                  <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>-{formatMoney(d.valor)}</div>
                  {!d.automatica && (
                    <button onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                  )}
                </div>
              );
            })}
          </>
        )}
        {tab === "receitas" && (
          <>
            {loadingGanhos ? <Loading /> : !ganhos || Number(ganhos.total_fretes || 0) === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                <p style={{ fontWeight: 600 }}>Nenhuma receita ainda</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Fretes concluídos entram aqui automaticamente.</p>
              </div>
            ) : (
              <>
                <div className="card" style={{ textAlign: "center", borderColor: "rgba(45,122,58,0.3)", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Ganhos este mês</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--green)" }}>{formatMoney(ganhos.ganhos_mes_atual)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                    {ganhos.fretes_mes_atual} frete{ganhos.fretes_mes_atual === 1 ? "" : "s"} · média {formatMoney(ganhos.media_por_frete)}/frete
                  </div>
                </div>
                {ganhos.historico_mensal?.length > 0 && (
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-title">Histórico mensal</div>
                    {ganhos.historico_mensal.map((m, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
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
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-title">Resumo total</div>
                  <div className="info-row"><span className="info-label">Total de fretes</span><span className="info-value">{ganhos.total_fretes}</span></div>
                  <div className="info-row"><span className="info-label">Km carregado total</span><span className="info-value">{formatKm(ganhos.km_carregado)}</span></div>
                  <div className="info-row"><span className="info-label">Ganhos com entregas</span><span className="info-value" style={{ color: "var(--green)" }}>{formatMoney(ganhos.ganhos_entregas)}</span></div>
                  {Number(ganhos.ganhos_compensacoes || 0) > 0 && (
                    <div className="info-row"><span className="info-label">🔄 Compensações por cancelamento</span><span className="info-value" style={{ color: "var(--gold)" }}>{formatMoney(ganhos.ganhos_compensacoes)}</span></div>
                  )}
                  <div className="divider" />
                  <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Ganhos totais</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(ganhos.ganhos_total)}</span></div>
                </div>
                <div className="card-title" style={{ marginBottom: 8 }}>Transações</div>
                {loadingExtrato ? <Loading /> : extrato?.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 24, color: "var(--text3)" }}>Nenhuma transação registrada ainda</div>
                ) : (extrato || []).map(t => {
                  const ehCompensacao = t.tipo === "compensacao_cancelamento";
                  const data = t.data_evento ? new Date(t.data_evento).toLocaleDateString("pt-BR") : "—";
                  return (
                    <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", borderColor: ehCompensacao ? "rgba(201,168,76,0.4)" : "var(--border)" }}
                      onClick={() => onNavigate("extrato-frete-motorista", { id: t.id })}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: ehCompensacao ? "rgba(201,168,76,0.15)" : "rgba(45,122,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {ehCompensacao ? "🔄" : "🚛"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{ehCompensacao ? "Compensação por cancelamento" : "Entrega"}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.dest_cidade ? `→ ${t.dest_cidade}/${t.dest_estado}` : "—"} · {data}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: ehCompensacao ? "var(--gold)" : "var(--green)", fontSize: 15 }}>{formatMoney(t.valor)}</div>
                    </div>
                  );
                })}
              </>
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
      </div>
    </div>
  );
}
