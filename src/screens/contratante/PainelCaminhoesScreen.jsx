import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { MapaLeaflet } from "../../components/MapaLeaflet";
import { Avatar } from "../../components/Avatar";
import { CORES_ROTAS_MULTI } from "../../utils/mapColors";

// ─────────────────────────────────────────────
// PAINEL MULTI-CAMINHÃO — Item 4 (27/08/2026)
//
// Dashboard só pro perfil solicitante/cerealista: todos os caminhões em rota
// AGORA, num mapa só, pensado pra segunda tela/desktop (ver .screen-wide em
// styles/css.js — a única tela do app que quebra o limite de 430px do resto
// do app, que continua mobile). Poll de 10s no back (GET
// /api/fretes/painel-multi-caminhao) — mesmo padrão de polling já usado em
// DetalheFrete.jsx pro acompanhamento de 1 frete só, só que aqui N de uma vez.
const INTERVALO_POLL_MS = 10000;

const sLinkHeader = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 13, fontWeight: 600, color: "var(--text2)", padding: 0,
  fontFamily: "inherit",
};

export function PainelCaminhoesScreen({ onNavigate }) {
  const { token } = useAuth();
  const [caminhoes, setCaminhoes] = useState(null); // null = ainda carregando
  const [error, setError] = useState("");
  const [selecionado, setSelecionado] = useState(null); // freteId em destaque na lista

  const consultar = useCallback(() => {
    api("GET", "/api/fretes/painel-multi-caminhao", null, token)
      .then(d => { setCaminhoes(d.caminhoes || []); setError(""); })
      .catch(e => setError(e.message || "Não foi possível carregar o painel."));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    consultar();
    const interval = setInterval(consultar, INTERVALO_POLL_MS);
    return () => clearInterval(interval);
  }, [token, consultar]);

  // Rotas (linhas estáticas origem→destino) e marcadores ao vivo (posição de
  // cada caminhão) pareados pelo mesmo índice -- MapaLeaflet usa o mesmo
  // índice pra colorir a linha da rota e a bolinha do caminhão com a mesma cor.
  const rotas = useMemo(() => (caminhoes || []).map(c => ({ origem: c.origem, destino: c.destino })), [caminhoes]);
  const marcadoresAoVivo = useMemo(() => (caminhoes || [])
    .filter(c => c.posicaoAtual)
    .map(c => ({ id: c.freteId, lat: c.posicaoAtual.lat, lng: c.posicaoAtual.lng, label: c.motorista.nome })),
    [caminhoes]);

  const totalSemPosicao = (caminhoes || []).filter(c => !c.posicaoAtual).length;

  return (
    <div className="screen-wide">
      <div className="header">
        {/* onNavigate(-1) -- não fixo em "opcoes-contratante": pra quem abre de
            um PC essa tela agora é a própria home (item 3/6, App.jsx
            homeDoUsuario), então "voltar" resolve sozinho pro lugar certo em
            cada caso (mobile: home-contratante; desktop: ela mesma). */}
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>🚛 Painel de Caminhões</h1>
        {/* Essa tela virou a home de quem abre de um PC (item 3/6) -- sem a
            bottom-nav mobile aqui (fica presa numa faixa de 430px, quebrada
            numa tela larga), precisa desses atalhos pra não deixar o
            solicitante sem rota nenhuma pro resto do app. */}
        <nav style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          <button className="link-btn" style={sLinkHeader} onClick={() => onNavigate("solicitar-frete")}>+ Solicitar Frete</button>
          <button className="link-btn" style={sLinkHeader} onClick={() => onNavigate("meus-fretes")}>Meus Fretes</button>
          <button className="link-btn" style={sLinkHeader} onClick={() => onNavigate("opcoes-contratante")}>Opções</button>
          <button className="link-btn" style={sLinkHeader} onClick={() => onNavigate("perfil")}>Conta</button>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Atualiza a cada {INTERVALO_POLL_MS / 1000}s</span>
        </nav>
      </div>
      <div className="content" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "3 1 640px", minWidth: 320 }}>
          {error && <div className="alert alert-error">{error}</div>}
          {caminhoes === null ? (
            <Loading />
          ) : (
            // O mapa real aparece SEMPRE, com ou sem caminhão -- achado real do
            // Mateus (02/09/2026): quando não havia frete ativo, esse espaço
            // virava um card só com um emoji de mapa (🗺️) gigante sobre um
            // fundo claro, e foi confundido com "o mapa não carrega" (o app
            // realmente tinha um bug de mapa antes disso, na mesma tela -- daí
            // a confusão fazer sentido). Mostrando o Leaflet de verdade nos
            // dois casos, essa ambiguidade não existe mais.
            <div style={{ position: "relative" }}>
              <MapaLeaflet height={window.innerHeight > 700 ? 560 : 380} rotas={rotas} marcadoresAoVivo={marcadoresAoVivo} />
              {caminhoes.length === 0 && (
                <div style={{
                  position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
                  padding: "10px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.15)", textAlign: "center",
                  fontSize: 13, zIndex: 500, maxWidth: "90%",
                }}>
                  <strong>🗺️ Nenhum caminhão em rota agora</strong>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                    Assim que um motorista aceitar um frete seu, ele aparece aqui em tempo real.
                  </div>
                </div>
              )}
            </div>
          )}
          {totalSemPosicao > 0 && caminhoes && caminhoes.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
              📡 {totalSemPosicao} caminhão(ões) ainda sem posição de GPS recebida.
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 300px", minWidth: 280, maxHeight: 640, overflowY: "auto" }}>
          <div className="card-title" style={{ marginBottom: 8 }}>
            {caminhoes ? `${caminhoes.length} caminhão(ões) em rota` : "Carregando..."}
          </div>
          {(caminhoes || []).map((c, idx) => {
            const cor = CORES_ROTAS_MULTI[idx % CORES_ROTAS_MULTI.length];
            // Date.now() durante o render é tecnicamente impuro (React purity rule),
            // mas é só um rótulo informativo que já re-renderiza a cada poll de 10s
            // (INTERVALO_POLL_MS) -- mesmo padrão aceito em BuscarMotoristasScreen.jsx.
            let atualizadoHaPouco = null;
            if (c.posicaoAtual?.atualizadoEm) {
              // eslint-disable-next-line react-hooks/purity
              atualizadoHaPouco = Math.round((Date.now() - new Date(c.posicaoAtual.atualizadoEm).getTime()) / 60000);
            }
            return (
              <div
                key={c.freteId}
                className="card"
                onClick={() => setSelecionado(s => s === c.freteId ? null : c.freteId)}
                style={{ cursor: "pointer", borderLeft: `4px solid ${cor}`, outline: selecionado === c.freteId ? `2px solid ${cor}` : "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Avatar nome={c.motorista.nome} fotoUrl={c.motorista.fotoUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.motorista.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      {c.motorista.placa || "—"} {c.motorista.tipoVeiculo ? `· ${c.motorista.tipoVeiculo}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>
                  📍 {c.origem.label} → 🏁 {c.destino.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  {c.alvo === "origem" ? "Indo coletar" : "A caminho da entrega"}
                  {atualizadoHaPouco !== null && ` · posição de ${atualizadoHaPouco <= 1 ? "agora" : `${atualizadoHaPouco} min atrás`}`}
                  {!c.posicaoAtual && " · sem posição de GPS ainda"}
                </div>
                {c.motorista.telefone && (
                  <a
                    href={`https://wa.me/55${c.motorista.telefone.replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "var(--green)", fontWeight: 600 }}
                  >
                    💬 Falar com o motorista
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
