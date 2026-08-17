import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import { api, apiUpload, baixarArquivoAutenticado } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { TIPOS_CARGA } from "../../data/catalogos";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { MapaLeaflet } from "../../components/MapaLeaflet";
import { watchPosition, clearWatch } from "../../services/geolocation";

// ─────────────────────────────────────────────
// EM TRÂNSITO — sem mapa próprio (mapa fica na aba Início)
// ─────────────────────────────────────────────
export function EmTransitoScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [freteStatus, setFreteStatus] = useState(frete?.status);
  const [confirmStep, setConfirmStep] = useState(null);
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [codigoTeste, setCodigoTeste] = useState(null);
  const [entregueOk, setEntregueOk] = useState(false);
  const [extrato, setExtrato] = useState(null);
  const [loadingExtrato, setLoadingExtrato] = useState(true);
  const [showAddDespesa, setShowAddDespesa] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ tipo: "pedagio", descricao: "", valor: "" });
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);
  const [contratoLoading, setContratoLoading] = useState(false);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [etaInfo, setEtaInfo] = useState(null);
  const [fretesRetorno, setFretesRetorno] = useState([]);
  const [loadingFretesRetorno, setLoadingFretesRetorno] = useState(false);
  const [showProblema, setShowProblema] = useState(false);
  const [problema, setProblema] = useState({ motivo: "acidente", descricao: "", arquivo: null });
  const [enviandoProblema, setEnviandoProblema] = useState(false);
  const [erroProblema, setErroProblema] = useState("");
  const posicaoRef = useRef(null);

  // GPS ao vivo desta tela — a Home também tem o próprio watch+envio, mas
  // essa tela SUBSTITUI a Home quando o motorista navega pra cá (renderer é
  // switch-case, só um componente montado por vez), então sem isso aqui o
  // envio de posição parava assim que o motorista saísse da Home — bem no
  // momento em que ele mais fica nesta tela durante uma entrega de verdade.
  useEffect(() => {
    let handle = null;
    let cancelado = false;
    watchPosition(
      coords => { setPosicaoAtual(coords); posicaoRef.current = coords; },
      err => console.error("GPS em-transito:", err)
    ).then(h => { if (cancelado) clearWatch(h); else handle = h; })
      .catch(err => console.error("GPS em-transito (start):", err.message));
    return () => { cancelado = true; if (handle) clearWatch(handle); };
  }, []);

  useEffect(() => {
    if (!frete?.id || !token) return;
    const enviar = () => {
      if (!posicaoRef.current) return;
      api("PATCH", "/api/motoristas/localizacao", {
        lat: posicaoRef.current.lat, lng: posicaoRef.current.lng, freteId: frete.id,
      }, token).catch(e => console.error("GPS send em-transito:", e.message));
    };
    enviar();
    const interval = setInterval(enviar, 30000);
    return () => clearInterval(interval);
  }, [frete?.id, token]);

  // Alvo da rota: ainda não coletou (aceito) -> vai até a origem; já coletou
  // (coletando/em_rota) -> vai até o destino. Calculado localmente (o
  // motorista já tem tudo isso no próprio objeto `frete`, sem precisar
  // consultar o backend só pra saber pra onde ele mesmo está indo).
  const alvo = freteStatus === "aceito"
    ? { lat: parseFloat(frete.origem_lat), lng: parseFloat(frete.origem_lng), label: frete.origem_cidade || "Coleta" }
    : ["coletando", "em_rota"].includes(freteStatus)
      ? { lat: parseFloat(frete.dest_lat), lng: parseFloat(frete.dest_lng), label: frete.dest_cidade || "Entrega" }
      : null;

  // Abre o Waze com navegação já carregada pro alvo atual (coleta ou
  // entrega). Tenta o app nativo primeiro (waze://); se o app não estiver
  // instalado, nada acontece e a aba não perde o foco — depois de um tempo
  // curto sem "blur" (sinal de que o app abriu), cai pro link web, que
  // funciona tanto em mobile (abre o app ou App/Play Store) quanto desktop.
  const abrirWaze = () => {
    if (!alvo?.lat || !alvo?.lng) return;
    const appUrl = `waze://?ll=${alvo.lat},${alvo.lng}&navigate=yes`;
    const webUrl = `https://waze.com/ul?ll=${alvo.lat},${alvo.lng}&navigate=yes`;
    const timer = setTimeout(() => { window.location.href = webUrl; }, 1500);
    window.addEventListener("blur", () => clearTimeout(timer), { once: true });
    window.location.href = appUrl;
  };

  const verContrato = async () => {
    setContratoLoading(true); setError("");
    try { await baixarArquivoAutenticado(`/api/fretes/${frete.id}/contrato`, token, `contrato-frete-${frete.id}.pdf`); }
    catch (e) { setError(e.message); }
    finally { setContratoLoading(false); }
  };

  const tiposDespesaFrete = [
    { id: "pedagio", icon: "🛣️", label: "Pedágio" },
    { id: "alimentacao", icon: "🍽️", label: "Alimentação" },
    { id: "hospedagem", icon: "🏨", label: "Pernoite" },
    { id: "outro", icon: "📦", label: "Outro" },
  ];

  const carregarExtrato = useCallback(() => {
    if (!frete?.id) return;
    setLoadingExtrato(true);
    api("GET", `/api/fretes/${frete.id}/extrato`, null, token)
      .then(setExtrato)
      .catch(() => setExtrato(null))
      .finally(() => setLoadingExtrato(false));
  }, [frete, token]);

  useEffect(() => { queueMicrotask(carregarExtrato); }, [carregarExtrato]);

  // Sugestões de frete de retorno: fretes reais disponíveis com origem na
  // cidade de destino desta entrega — mesma busca por cidade que a Home usa
  // pra listar fretes disponíveis (GET /api/fretes/disponiveis), não dado
  // inventado.
  useEffect(() => {
    if (!entregueOk || !frete?.dest_cidade || !token) return;
    queueMicrotask(() => setLoadingFretesRetorno(true));
    api("GET", `/api/fretes/disponiveis?busca_origem_cidade=${encodeURIComponent(frete.dest_cidade)}`, null, token)
      .then(lista => setFretesRetorno(lista.filter(f => f.id !== frete.id)))
      .catch(() => setFretesRetorno([]))
      .finally(() => setLoadingFretesRetorno(false));
  }, [entregueOk, frete?.dest_cidade, frete?.id, token]);

  const adicionarDespesa = async () => {
    if (!novaDespesa.valor) return;
    setSalvandoDespesa(true);
    try {
      await api("POST", "/api/motoristas/despesas", {
        ...novaDespesa,
        data: new Date().toISOString().slice(0, 10),
        freteId: frete.id,
      }, token);
      setNovaDespesa({ tipo: "pedagio", descricao: "", valor: "" });
      setShowAddDespesa(false);
      carregarExtrato();
    } catch (e) { setError(e.message); }
    finally { setSalvandoDespesa(false); }
  };

  const removerDespesa = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/despesas/${id}`, null, token);
      carregarExtrato();
    } catch (e) { setError(e.message); }
  };

  if (!frete) return <Loading />;

  const atualizarStatus = async (status) => {
    setLoading(true);
    try {
      await api("PATCH", `/api/fretes/${frete.id}/status`, { status }, token);
      setFreteStatus(status);
      if (status !== "entregue") onNavigate("home-motorista");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const solicitarCodigo = async () => {
    setLoading(true); setError("");
    try {
      const resp = await api("POST", `/api/fretes/${frete.id}/solicitar-codigo-entrega`, {}, token);
      setConfirmStep("aguardando");
      if (resp.codigo_teste) setCodigoTeste(resp.codigo_teste);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const confirmarComCodigo = async () => {
    if (codigoDigitado.length !== 6) return setError("Digite o código de 6 dígitos");
    setLoading(true); setError("");
    try {
      await api("POST", `/api/fretes/${frete.id}/confirmar-entrega`, { codigo: codigoDigitado }, token);
      setEntregueOk(true);
      setFreteStatus("entregue");
      setTimeout(() => onNavigate("home-motorista"), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const reportarProblema = async () => {
    setEnviandoProblema(true); setErroProblema("");
    try {
      const formData = new FormData();
      formData.append("motivo", problema.motivo);
      if (problema.descricao) formData.append("descricao", problema.descricao);
      if (problema.arquivo) formData.append("foto", problema.arquivo);
      await apiUpload("POST", `/api/fretes/${frete.id}/reportar-problema`, formData, token);
      setFreteStatus("problema_entrega");
      setShowProblema(false);
    } catch (e) { setErroProblema(e.message); }
    finally { setEnviandoProblema(false); }
  };

  if (freteStatus === "problema_entrega") return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Frete Ativo</h1>
      </div>
      <div className="content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--red)", marginBottom: 8 }}>Problema reportado</div>
        <p style={{ color: "var(--text3)", marginBottom: 24, lineHeight: 1.6 }}>
          O suporte TRUKER e o contratante já foram avisados. Este frete ficou travado até o time entrar em contato com você.
        </p>
        <button className="btn btn-secondary" onClick={() => onNavigate("chat", { frete })}>💬 Falar com o Contratante</button>
      </div>
    </div>
  );

  if (entregueOk) return (
    <div className="screen">
      <div className="header"><h1>Frete Ativo</h1></div>
      <div className="content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--green)", marginBottom: 8 }}>Entrega confirmada!</div>
        <div style={{ color: "var(--text3)", textAlign: "center", marginBottom: 24 }}>Frete concluído com sucesso.<br/>Redirecionando...</div>
        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>🎯 Fretes de retorno disponíveis:</div>
          {loadingFretesRetorno && <Loading />}
          {!loadingFretesRetorno && fretesRetorno.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 24, color: "var(--text2)" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: 13 }}>Nenhuma sugestão de retorno no momento</p>
            </div>
          )}
          {!loadingFretesRetorno && fretesRetorno.map(fr => {
            const cargaObj = TIPOS_CARGA.find(c => c.id === fr.tipo_carga);
            return (
              <div key={fr.id} className="frete-card" onClick={() => onNavigate("aceitar-frete", fr)}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fr.origem_cidade || "—"} → {fr.dest_cidade || "—"}</span>
                  <span style={{ color: "var(--gold)", fontWeight: 800 }}>{formatMoney(fr.valor_motorista || 0)}</span>
                </div>
                <div className="meta" style={{ marginTop: 4 }}><span>{cargaObj?.icon || "📦"} {cargaObj?.label || fr.tipo_carga}</span><span>📏 {fr.distancia_km} km</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Frete Ativo</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <StatusBadge status={freteStatus} />
          <span style={{ fontWeight: 800, fontSize: 20, color: "var(--green)" }}>{formatMoney(frete.valor_motorista || 0)}</span>
        </div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Rota {alvo && <span style={{ color: "var(--gold)" }}>· indo para {freteStatus === "aceito" ? "coleta" : "entrega"}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", border: "2px solid white", boxShadow: "0 0 0 2px var(--green)" }} />
                  <div style={{ width: 2, height: 24, background: "var(--border)" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--red)", border: "2px solid white", boxShadow: "0 0 0 2px var(--red)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{frete.origem_cidade || frete.origem_endereco || "—"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{frete.dest_cidade || frete.dest_endereco || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {alvo && (
            <>
              <MapaLeaflet
                height="52vh"
                lat={posicaoAtual?.lat}
                lng={posicaoAtual?.lng}
                metaAoVivo={alvo}
                onRotaInfo={setEtaInfo}
                modoNavegacao
                zoomNavegacao={17}
                seguirPorPadrao
                mostrarOrientacao
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0" }}>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>
                  {!posicaoAtual ? "📡 Obtendo localização..." : etaInfo
                    ? <><strong style={{ color: "var(--text)" }}>⏱️ {etaInfo.duracaoMin} min</strong> · {etaInfo.distanciaKm} km até {freteStatus === "aceito" ? "a coleta" : "a entrega"}</>
                    : "Calculando rota..."}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ width: "100%", marginBottom: 10, background: "#33CCFF" }} onClick={abrirWaze}>
                🧭 Abrir no Waze
              </button>
            </>
          )}

          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Tipo de carga</span><span className="info-value">{frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={verContrato} disabled={contratoLoading}>
            {contratoLoading ? "Baixando contrato..." : "📄 Baixar Contrato"}
          </button>
        </div>

        <div className="card">
          <div className="card-title">💰 Extrato Financeiro do Frete</div>
          {loadingExtrato && <Loading />}
          {!loadingExtrato && !extrato && (
            <p style={{ fontSize: 13, color: "var(--text3)" }}>Não foi possível carregar o extrato agora.</p>
          )}
          {!loadingExtrato && extrato && (
            <>
              <div className="info-row"><span className="info-label">Valor a receber</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(extrato.valorReceber)}</span></div>
              <div className="divider" />
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Custos estimados (dados oficiais ANTT)</div>
              <div className="info-row"><span className="info-label">⛽ Combustível</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
              <div className="info-row"><span className="info-label">🔧 Desgaste do veículo</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>

              {extrato.despesasManuais.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>Despesas lançadas por você</div>
                  {extrato.despesasManuais.map(d => {
                    const tipoObj = tiposDespesaFrete.find(t => t.id === d.tipo) || { icon: "📦", label: d.tipo };
                    return (
                      <div key={d.id} className="info-row">
                        <span className="info-label">{tipoObj.icon} {tipoObj.label}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(d.valor)}</span>
                          <span onClick={() => removerDespesa(d.id)} style={{ cursor: "pointer", color: "var(--text3)", fontSize: 13 }}>✕</span>
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              <div className="divider" />
              <div className="info-row"><span className="info-label">Total de custos</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.totalCustos)}</span></div>
              <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Valor líquido estimado</span><span className="info-value" style={{ color: extrato.valorLiquido >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorLiquido)}</span></div>

              {!showAddDespesa ? (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddDespesa(true)}>+ Lançar despesa deste frete</button>
              ) : (
                <div style={{ marginTop: 12, padding: 12, background: "var(--surface2)", borderRadius: 10 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {tiposDespesaFrete.map(t => (
                      <button key={t.id} onClick={() => setNovaDespesa(d => ({ ...d, tipo: t.id }))}
                        style={{ padding: "6px 10px", borderRadius: 16, border: "1px solid", borderColor: novaDespesa.tipo === t.id ? "var(--gold)" : "var(--border)", background: novaDespesa.tipo === t.id ? "var(--gold)" : "var(--surface)", color: novaDespesa.tipo === t.id ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="field">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" value={novaDespesa.valor} onChange={e => setNovaDespesa(d => ({ ...d, valor: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div className="field">
                    <label>Descrição (opcional)</label>
                    <input value={novaDespesa.descricao} onChange={e => setNovaDespesa(d => ({ ...d, descricao: e.target.value }))} placeholder="Ex: Posto BR km 120" />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={adicionarDespesa} disabled={salvandoDespesa}>{salvandoDespesa ? "Salvando..." : "Salvar"}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDespesa(false)}>Cancelar</button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10 }}>
                Combustível e desgaste são estimativas com base nos coeficientes oficiais da ANTT por eixo do veículo. Pedágio, alimentação e pernoite refletem exatamente o que você lançar aqui.
              </p>
            </>
          )}
        </div>
        <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => onNavigate("chat", { frete })}>💬 Chat com Contratante</button>

        {["coletando", "em_rota"].includes(freteStatus) && !showProblema && (
          <button className="btn btn-danger" style={{ marginBottom: 10 }} onClick={() => setShowProblema(true)}>⚠️ Reportar problema na entrega</button>
        )}
        {["coletando", "em_rota"].includes(freteStatus) && showProblema && (
          <div className="card" style={{ borderLeft: "4px solid var(--red)", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ Reportar problema</div>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12, lineHeight: 1.6 }}>
              Use isso só em caso de acidente, roubo/furto ou impossibilidade real de entregar a carga. O frete vai travar imediatamente e o suporte TRUKER e o contratante serão avisados.
            </p>
            {erroProblema && <div className="alert alert-error">{erroProblema}</div>}
            <div className="field">
              <label>Motivo</label>
              <select value={problema.motivo} onChange={e => setProblema(p => ({ ...p, motivo: e.target.value }))}>
                <option value="acidente">Acidente</option>
                <option value="roubo">Roubo/furto</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="field">
              <label>Descrição (opcional)</label>
              <textarea rows={3} value={problema.descricao} onChange={e => setProblema(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o que aconteceu" />
            </div>
            <label className="upload-area" style={{ display: "block", marginBottom: 12, cursor: "pointer" }}>
              {problema.arquivo ? `📎 ${problema.arquivo.name}` : "📤 Anexar foto (opcional)"}
              <input type="file" accept="image/*,.heic,.heif" style={{ display: "none" }}
                onChange={e => setProblema(p => ({ ...p, arquivo: e.target.files[0] || null }))} />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-danger" onClick={reportarProblema} disabled={enviandoProblema}>
                {enviandoProblema ? "Enviando..." : "Confirmar problema"}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowProblema(false)} disabled={enviandoProblema}>Cancelar</button>
            </div>
          </div>
        )}

        {freteStatus === "aceito" && frete.status_pagamento === "approved" && (
          <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("coletando")} disabled={loading}>🚛 Iniciar Coleta</button>
        )}
        {freteStatus === "aceito" && frete.status_pagamento !== "approved" && (
          <div className="alert alert-info" style={{ textAlign: "center", marginBottom: 10 }}>⏳ Aguardando pagamento do contratante para liberar a coleta</div>
        )}
        {freteStatus === "coletando" && (
          <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("em_rota")} disabled={loading}>🛣️ Em Rota</button>
        )}
        {freteStatus === "em_rota" && !confirmStep && (
          <button className="btn btn-success" onClick={() => setConfirmStep("solicitando")} disabled={loading}>✅ Confirmar Entrega</button>
        )}
        {freteStatus === "em_rota" && confirmStep === "solicitando" && (
          <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirmação de entrega</div>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>
              Um código de 6 dígitos será enviado por email ao contratante. Peça o código a ele para confirmar o recebimento da carga.
            </p>
            <button className="btn btn-primary" onClick={solicitarCodigo} disabled={loading} style={{ marginBottom: 8 }}>
              {loading ? "Enviando..." : "📧 Enviar código para o contratante"}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmStep(null)}>Cancelar</button>
          </div>
        )}
        {freteStatus === "em_rota" && confirmStep === "aguardando" && (
          <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>✉️ Código gerado!</div>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
              {codigoTeste ? "Email indisponível no modo teste. Use o código abaixo:" : "O contratante recebeu o código por email. Digite abaixo:"}
            </p>
            {codigoTeste && (
              <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — mostre ao contratante</div>
                <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{codigoTeste}</div>
              </div>
            )}
            <div className="field">
              <label>Código de confirmação</label>
              <input type="text" inputMode="numeric" maxLength={6}
                value={codigoDigitado}
                onChange={e => setCodigoDigitado(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                style={{ fontSize: 32, letterSpacing: 14, textAlign: "center", fontFamily: "monospace" }}
              />
            </div>
            <button className="btn btn-success" onClick={confirmarComCodigo} disabled={loading || codigoDigitado.length !== 6} style={{ marginBottom: 8 }}>
              {loading ? "Confirmando..." : "✅ Confirmar Entrega"}
            </button>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={solicitarCodigo} disabled={loading}>🔄 Reenviar código</button>
          </div>
        )}
      </div>
    </div>
  );
}
