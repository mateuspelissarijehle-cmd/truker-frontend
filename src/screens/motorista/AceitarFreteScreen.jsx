import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { TIPOS_CARGA, TIPOS_VEICULO, ICONE_CARROCERIA } from "../../data/catalogos";
import { Loading } from "../../components/Loading";
import { HistoricoPrecoRota } from "../../components/HistoricoPrecoRota";

// ─────────────────────────────────────────────
// ACEITAR FRETE
// ─────────────────────────────────────────────
export function AceitarFreteScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [propondoValor, setPropondoValor] = useState(false);
  const [valorProposta, setValorProposta] = useState("");
  const [propostaEnviada, setPropostaEnviada] = useState(false);
  if (!frete) return <Loading />;
  const cargaObj = TIPOS_CARGA.find(c => c.id === frete.tipo_carga);

  const capturarGPS = async () => {
    let lat = null, lng = null;
    if (navigator.geolocation) {
      try {
        // A opção `timeout` do getCurrentPosition é só um pedido pro navegador —
        // em alguns WebViews/Android com localização do aparelho desligada, nem
        // sucesso nem erro nunca chega, e a promise fica pendurada pra sempre.
        // Por isso um timeout nosso por fora, redundante mas garantido.
        const pos = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("GPS timeout")), 6000);
          navigator.geolocation.getCurrentPosition(
            (p) => { clearTimeout(timer); resolve(p); },
            (err) => { clearTimeout(timer); reject(err); },
            { timeout: 5000, enableHighAccuracy: true }
          );
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {} // GPS indisponível — segue sem lat/lng
    }
    return { lat, lng };
  };

  const aceitar = async () => {
    setLoading(true); setError("");
    try {
      const { lat, lng } = await capturarGPS();
      await api("PATCH", `/api/fretes/${frete.id}/aceitar`, { lat, lng }, token);
      onNavigate("home-motorista");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const enviarProposta = async () => {
    const valor = parseFloat(String(valorProposta).replace(",", "."));
    if (!valor || valor <= 0) return setError("Informe um valor válido");
    setLoading(true); setError("");
    try {
      const { lat, lng } = await capturarGPS();
      await api("POST", `/api/fretes/${frete.id}/propor`, { valorProposto: valor, lat, lng }, token);
      setPropostaEnviada(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (propostaEnviada) {
    return (
      <div className="screen">
        <div className="header"><button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button><h1>Proposta Enviada</h1></div>
        <div className="content">
          <div className="alert alert-success">✅ Sua proposta de {formatMoney(parseFloat(String(valorProposta).replace(",", ".")))} foi enviada ao contratante.</div>
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
            Acompanhe a resposta em <strong>Minhas Propostas</strong>. O contratante pode aceitar, recusar ou enviar uma contraproposta.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate("minhas-propostas")}>Ver Minhas Propostas</button>
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => onNavigate("home-motorista")}>Voltar ao início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button><h1>Aceitar Frete</h1></div>
      <div className="content">
        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes("seguro de frete registrado") && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("seguro-motorista")}>🛡️ Registrar Seguro</button>
            )}
          </div>
        )}
        <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
          <div className="price" style={{ fontSize: 42 }}>{formatMoney(frete.valor_motorista || 0)}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>Seu valor como motorista (valor publicado)</div>
        </div>
        <div className="card">
          <div className="map-placeholder">
            <div style={{ fontSize: 28 }}>🗺️</div>
            <span style={{ fontWeight: 700 }}>{frete.origem_cidade || "—"} → {frete.dest_cidade || "—"}</span>
          </div>
          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Tipo de carga</span><span className="info-value">{cargaObj?.icon} {cargaObj?.label || frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
          <div className="info-row"><span className="info-label">Veículo necessário</span><span className="info-value">{TIPOS_VEICULO.find(v => v.id === frete.tipo_veiculo)?.label || frete.tipo_veiculo}{frete.numero_eixos ? ` · ${frete.numero_eixos} eixos` : ""}</span></div>
          {frete.carroceria && <div className="info-row"><span className="info-label">Carroceria desejada</span><span className="info-value">{ICONE_CARROCERIA[frete.carroceria] || ""} {frete.carroceria}</span></div>}
        </div>

        <HistoricoPrecoRota
          origemCidade={frete.origem_cidade} origemUf={frete.origem_estado}
          destCidade={frete.dest_cidade} destUf={frete.dest_estado}
          tipoVeiculo={frete.tipo_veiculo} tipoCarga={frete.tipo_carga} numeroEixos={frete.numero_eixos}
          mostrarPiso={false}
        />

        {(() => {
          const d = frete.detalhes_carga;
          if (!d || (typeof d === "object" && Object.keys(d).length === 0)) return null;
          const det = typeof d === "string" ? (() => { try { return JSON.parse(d); } catch { return {}; } })() : d;
          const temDim = det.dimensoes && (det.dimensoes.comprimentoM || det.dimensoes.larguraM || det.dimensoes.alturaM);
          const temAlgo = det.descricao || temDim || det.animal || det.material || (det.itens && det.itens.length);
          if (!temAlgo) return null;
          return (
            <div className="card">
              <div className="card-title">📋 Detalhes da Carga</div>
              {det.animal && (
                <div className="info-row"><span className="info-label">🐄 Animal</span><span className="info-value">{det.animal.tipo}{det.animal.quantidade ? ` · ${det.animal.quantidade} cabeças` : ""}</span></div>
              )}
              {det.material && (
                <div className="info-row"><span className="info-label">🧱 Material</span><span className="info-value">{det.material}</span></div>
              )}
              {temDim && (
                <div className="info-row"><span className="info-label">📏 Dimensões</span><span className="info-value">{[det.dimensoes.comprimentoM && `${det.dimensoes.comprimentoM}m C`, det.dimensoes.larguraM && `${det.dimensoes.larguraM}m L`, det.dimensoes.alturaM && `${det.dimensoes.alturaM}m A`].filter(Boolean).join(" × ")}</span></div>
              )}
              {det.itens && det.itens.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div className="info-label" style={{ marginBottom: 6 }}>📦 Itens da mudança</div>
                  {det.itens.map((it, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", padding: "2px 0" }}>• {it.nome}{it.qtd ? ` (${it.qtd})` : ""}</div>
                  ))}
                </div>
              )}
              {det.descricao && (
                <div style={{ marginTop: 8 }}>
                  <div className="info-label" style={{ marginBottom: 4 }}>Observações</div>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>{det.descricao}</div>
                </div>
              )}
            </div>
          );
        })()}

        {frete.custosEstimados && (
          <div className="card">
            <div className="card-title">💰 Estimativa antes de decidir</div>
            <div className="info-row"><span className="info-label">⛽ Combustível estimado</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(frete.custosEstimados.combustivel)}</span></div>
            <div className="info-row"><span className="info-label">🔧 Desgaste estimado</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(frete.custosEstimados.desgaste)}</span></div>
            <div className="divider" />
            <div className="info-row">
              <span className="info-label" style={{ fontWeight: 700 }}>Líquido estimado (valor publicado)</span>
              <span className="info-value" style={{ color: frete.valorLiquidoEstimado >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>
                {formatMoney(frete.valorLiquidoEstimado)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
              Combustível e desgaste calculados com base nos coeficientes oficiais da ANTT para o veículo do seu perfil. Pedágio, alimentação e pernoite não estão incluídos aqui — você lança o valor real durante a viagem.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {frete.precisa_munck && <span className="tag-chip">🏗️ Precisa Munck</span>}
          {frete.precisa_empilhadeira && <span className="tag-chip">🏭 Empilhadeira no pátio</span>}
        </div>

        {!propondoValor && (
          <>
            <button className="btn btn-primary" onClick={aceitar} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Aceitando..." : "✅ Aceitar pelo valor publicado"}</button>
            <button className="btn btn-secondary" onClick={() => setPropondoValor(true)} style={{ marginBottom: 10 }}>💬 Propor outro valor</button>
            <button className="btn btn-secondary" onClick={() => onNavigate("home-motorista")}>Voltar</button>
          </>
        )}

        {propondoValor && (
          <div className="card">
            <div className="card-title">Sua proposta de valor</div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
              O valor publicado para você é {formatMoney(frete.valor_motorista || 0)}. Proponha o valor que você gostaria de receber (sujeito ao piso mínimo ANTT).
            </p>
            <div className="field">
              <label>Valor proposto (o que você vai receber, R$)</label>
              <input type="number" step="0.01" placeholder={String(frete.valor_motorista || "")} value={valorProposta} onChange={e => setValorProposta(e.target.value)} />
            </div>
            {frete.totalCustosEstimados != null && valorProposta && !isNaN(parseFloat(String(valorProposta).replace(",", "."))) && (() => {
              const seuTake = parseFloat(String(valorProposta).replace(",", "."));
              const liquidoProposta = seuTake - frete.totalCustosEstimados;
              return (
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  Se aceito: você recebe {formatMoney(seuTake)} − {formatMoney(frete.totalCustosEstimados)} (combustível+desgaste) = <strong>{formatMoney(liquidoProposta)} líquido estimado</strong>
                </div>
              );
            })()}
            <button className="btn btn-primary" onClick={enviarProposta} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Enviando..." : "📨 Enviar Proposta"}</button>
            <button className="btn btn-secondary" onClick={() => setPropondoValor(false)}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}
