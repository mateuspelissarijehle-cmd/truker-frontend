import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, abrirArquivoAutenticado } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { MapaLeaflet } from "../../components/MapaLeaflet";

// ─────────────────────────────────────────────
// DETALHE FRETE
// ─────────────────────────────────────────────
export function DetalheFrete({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contratoLoading, setContratoLoading] = useState(false);
  const [posicaoMotorista, setPosicaoMotorista] = useState(null);
  const [alvoAoVivo, setAlvoAoVivo] = useState(null);
  const [etaInfo, setEtaInfo] = useState(null);

  // Acompanhamento em tempo real do motorista (tipo Uber/iFood) — só faz
  // sentido enquanto o frete está com motorista designado e em trânsito
  // (indo coletar ou já a caminho da entrega). Faz polling porque o
  // contratante não tem GPS do motorista pra "empurrar" — precisa perguntar
  // periodicamente pro backend qual é a última posição conhecida.
  const emTransito = frete && frete.motorista_nome && ["aceito", "coletando", "em_rota"].includes(frete.status);
  useEffect(() => {
    if (!emTransito || !token) return;
    let cancelado = false;
    const consultar = () => {
      api("GET", `/api/fretes/${frete.id}/rastreamento-vivo`, null, token)
        .then(d => {
          if (cancelado) return;
          setPosicaoMotorista(d.posicaoAtual || null);
          setAlvoAoVivo(d.alvo || null);
        })
        .catch(() => {});
    };
    consultar();
    const interval = setInterval(consultar, 20000);
    return () => { cancelado = true; clearInterval(interval); };
  }, [emTransito, frete?.id, token]);

  if (!frete) return <Loading />;

  const temContrato = ["aceito", "coletando", "em_rota", "entregue"].includes(frete.status);

  const cancelar = async () => {
    if (!confirm("Cancelar este frete?")) return;
    setLoading(true);
    try { await api("PATCH", `/api/fretes/${frete.id}/status`, { status: "cancelado" }, token); onNavigate("meus-fretes"); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verContrato = async () => {
    setContratoLoading(true); setError("");
    try { await abrirArquivoAutenticado(`/api/fretes/${frete.id}/contrato`, token); }
    catch (e) { setError(e.message); }
    finally { setContratoLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Detalhe do Frete</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <StatusBadge status={frete.status} />
          <div className="price">{formatMoney(frete.valor_final || frete.valor_antt || 0)}</div>
        </div>
        <div className="card">
          <div className="card-title">
            Rota {emTransito && <span style={{ color: "var(--gold)", fontWeight: 600 }}>· acompanhando motorista ao vivo</span>}
          </div>
          {frete.origem_lat && frete.dest_lat ? (
            <MapaLeaflet
              height={220}
              lat={posicaoMotorista?.lat}
              lng={posicaoMotorista?.lng}
              origem={{ lat: parseFloat(frete.origem_lat), lng: parseFloat(frete.origem_lng), label: frete.origem_cidade }}
              destino={{ lat: parseFloat(frete.dest_lat), lng: parseFloat(frete.dest_lng), label: frete.dest_cidade }}
              metaAoVivo={alvoAoVivo}
              onRotaInfo={setEtaInfo}
              modoNavegacao={emTransito}
              zoomNavegacao={14}
              seguirPorPadrao={false}
            />
          ) : (
            <div className="map-placeholder"><div style={{ fontSize: 28 }}>🗺️</div><span>{frete.origem_cidade || "—"} → {frete.dest_cidade || "—"}</span></div>
          )}
          {emTransito && (
            <div style={{ fontSize: 13, color: "var(--text2)", margin: "10px 0" }}>
              {!posicaoMotorista ? "📡 Aguardando posição do motorista..." : etaInfo
                ? <><strong style={{ color: "var(--text)" }}>⏱️ {etaInfo.duracaoMin} min</strong> · {etaInfo.distanciaKm} km até {alvoAoVivo?.tipo === "origem" ? "a coleta" : "a entrega"}</>
                : "Calculando rota..."}
            </div>
          )}
          <div className="info-row"><span className="info-label">Origem</span><span className="info-value">{frete.origem_endereco || frete.origem_cidade || "—"}</span></div>
          <div className="info-row"><span className="info-label">Destino</span><span className="info-value">{frete.dest_endereco || frete.dest_cidade || "—"}</span></div>
          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
        </div>
        <div className="card">
          <div className="card-title">Carga</div>
          <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">{frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
          <div className="info-row"><span className="info-label">Veículo</span><span className="info-value">{frete.tipo_veiculo}</span></div>
        </div>
        {frete.motorista_nome && (
          <div className="card">
            <div className="card-title">Motorista</div>
            <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{frete.motorista_nome}</span></div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => onNavigate("chat", { frete })}>💬 Chat</button>
          </div>
        )}
        {temContrato && (
          <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={verContrato} disabled={contratoLoading}>
            {contratoLoading ? "Abrindo contrato..." : "📄 Ver Contrato"}
          </button>
        )}
        {frete.status === "entregue" && !frete.ja_avaliou && <button className="btn btn-outline" style={{ marginBottom: 10 }} onClick={() => onNavigate("avaliar", { frete })}>⭐ Avaliar Motorista</button>}
        {frete.status === "entregue" && frete.ja_avaliou && <div className="alert alert-success" style={{ marginBottom: 10 }}>✅ Você já avaliou este frete.</div>}
        {frete.status === "aguardando" && (
          <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => onNavigate("propostas-recebidas", frete)}>📨 Ver Propostas Recebidas</button>
        )}
        {(frete.status === "aguardando" || (frete.status === "aceito" && frete.status_pagamento !== "approved")) && (
          <button className="btn btn-primary" style={{ marginBottom: 10, background: "linear-gradient(135deg, #00b37e, #00a572)" }} onClick={() => onNavigate("pagamento", { freteId: frete.id, valor: frete.valor_final || frete.valor_antt || 0 })}>
            📱 Pagar via Pix — {formatMoney(frete.valor_final || frete.valor_antt || 0)}
          </button>
        )}
        {frete.status === "aceito" && frete.status_pagamento === "approved" && (
          <div className="alert alert-success" style={{ marginBottom: 10 }}>✅ Pagamento confirmado — aguardando início da coleta</div>
        )}
        {["aguardando", "aceito"].includes(frete.status) && <button className="btn btn-danger" onClick={cancelar} disabled={loading}>{loading ? "Cancelando..." : "Cancelar Frete"}</button>}
      </div>
    </div>
  );
}
