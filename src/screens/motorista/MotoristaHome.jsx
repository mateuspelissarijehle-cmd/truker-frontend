import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney, formatKm } from "../../utils/format";
import { TIPOS_CARGA } from "../../data/catalogos";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { MapaLeaflet } from "../../components/MapaLeaflet";
import { CampoCidadeAutocomplete } from "../../components/CampoCidadeAutocomplete";
import { BottomNavMotorista } from "../../components/BottomNavMotorista";
import { watchPosition, clearWatch } from "../../services/geolocation";

// ─────────────────────────────────────────────
// MOTORISTA HOME — ✅ toggle online chama API
// ─────────────────────────────────────────────
export function MotoristaHome({ onNavigate }) {
  const { user, token } = useAuth();
  const [disponiveis, setDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => { try { return localStorage.getItem("truker_online") === "true"; } catch { return false; } });
  const [erroOnline, setErroOnline] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPeso, setFiltroPeso] = useState("todos");
  const [buscaCidade, setBuscaCidade] = useState("");
  const [buscaCidadeDebounced, setBuscaCidadeDebounced] = useState("");
  const [kmVazio, setKmVazio] = useState(0);
  const [metaKmVazio, setMetaKmVazio] = useState(800);

  // Busca km vazio real do dia
  useEffect(() => {
    api("GET", "/api/motoristas/ganhos", null, token)
      .then(d => {
        setKmVazio(parseFloat(d.km_vazio_hoje || 0));
      })
      .catch(() => {});
  }, [token]);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [fretesAtivos, setFretesAtivos] = useState([]);
  const [propostasPendentes, setPropostasPendentes] = useState(0);
  const [convitesPendentes, setConvitesPendentes] = useState(0);
  const [temDisponibilidadeAtiva, setTemDisponibilidadeAtiva] = useState(false);
  const [seguroValido, setSeguroValido] = useState(true);
  const posicaoRef = useRef(null);

  // Verifica se há contrapropostas do contratante aguardando resposta do motorista
  useEffect(() => {
    api("GET", "/api/fretes/propostas/minhas", null, token)
      .then(lista => setPropostasPendentes(lista.filter(p => p.status === "pendente" && p.rodada === 2).length))
      .catch(() => {});
  }, [token]);

  // Verifica se há convites diretos de contratantes aguardando resposta
  useEffect(() => {
    api("GET", "/api/fretes/convidados", null, token)
      .then(lista => setConvitesPendentes(lista.length))
      .catch(() => {});
  }, [token]);

  // Verifica se já existe um anúncio de disponibilidade ativo (pra decidir se mostra o convite pra publicar)
  useEffect(() => {
    api("GET", "/api/motoristas/disponibilidade", null, token)
      .then(() => setTemDisponibilidadeAtiva(true))
      .catch(() => setTemDisponibilidadeAtiva(false));
  }, [token]);

  // Seguro é obrigatório pra aceitar fretes — avisa na Home se estiver faltando/vencido
  useEffect(() => {
    api("GET", "/api/motoristas/seguro", null, token)
      .then(s => setSeguroValido(!!s.valido))
      .catch(() => {});
  }, [token]);

  // GPS para mostrar no mapa
  useEffect(() => {
    let handle = null;
    let cancelado = false;
    watchPosition(
      coords => { setPosicaoAtual(coords); posicaoRef.current = coords; },
      err => console.error("GPS home:", err)
    ).then(h => { if (cancelado) clearWatch(h); else handle = h; })
      .catch(err => console.error("GPS home (start):", err.message));
    return () => { cancelado = true; if (handle) clearWatch(handle); };
  }, []);

  // Envia posição para o backend a cada 30s para todos os fretes ativos
  useEffect(() => {
    if (fretesAtivos.length === 0 || !token) return;
    const interval = setInterval(async () => {
      if (!posicaoRef.current) return;
      try {
        for (const f of fretesAtivos) {
          await api("PATCH", "/api/motoristas/localizacao", {
            lat: posicaoRef.current.lat,
            lng: posicaoRef.current.lng,
            freteId: f.id,
          }, token);
        }
      } catch (e) { console.error("GPS send home:", e.message); }
    }, 30000);
    return () => clearInterval(interval);
  }, [fretesAtivos.length, token]);

  // Debounce da busca por cidade antes de consultar o backend
  useEffect(() => {
    const t = setTimeout(() => setBuscaCidadeDebounced(buscaCidade.trim()), 400);
    return () => clearTimeout(t);
  }, [buscaCidade]);

  // Carrega fretes disponíveis quando fica online ou quando a busca por cidade muda
  useEffect(() => {
    if (!online) { setDisponiveis([]); setLoading(false); return; }
    setLoading(true);
    const qs = buscaCidadeDebounced ? `?busca_origem_cidade=${encodeURIComponent(buscaCidadeDebounced)}` : "";
    api("GET", `/api/fretes/disponiveis${qs}`, null, token)
      .then(setDisponiveis).catch(() => setDisponiveis([])).finally(() => setLoading(false));
  }, [online, buscaCidadeDebounced]);

  // Carrega fretes ativos do motorista (aceito/coletando/em_rota)
  useEffect(() => {
    api("GET", "/api/fretes", null, token)
      .then(todos => setFretesAtivos(todos.filter(f => ["aceito", "coletando", "em_rota"].includes(f.status))))
      .catch(() => setFretesAtivos([]));
  }, [token]);

  // ✅ Toggle online/offline — atualiza no banco, com rollback se falhar
  const toggleOnline = async (val) => {
    const anterior = online;
    setOnline(val);
    localStorage.setItem("truker_online", val ? "true" : "false");
    setErroOnline("");
    try {
      await api("PATCH", "/api/motoristas/online", { online: val }, token);
    } catch (e) {
      setOnline(anterior);
      localStorage.setItem("truker_online", anterior ? "true" : "false");
      setErroOnline("Não foi possível atualizar seu status. Tente novamente.");
      console.error("Erro ao atualizar status online:", e.message);
    }
  };

  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  const filtrados = disponiveis.filter(f => {
    if (filtroTipo !== "todos" && f.tipo_frete !== filtroTipo) return false;
    const peso = f.peso_tons || 0;
    if (filtroPeso === "leve" && peso > 3) return false;
    if (filtroPeso === "medio" && (peso < 3 || peso > 14)) return false;
    if (filtroPeso === "pesado" && peso < 14) return false;
    return true;
  });

  const marcadoresFretes = disponiveis
    .filter(f => f.origem_lat && f.origem_lng)
    .map(f => ({ lat: parseFloat(f.origem_lat), lng: parseFloat(f.origem_lng), label: f.origem_cidade || "Frete" }));

  // Rotas otimizadas: ordenar por proximidade do motorista (greedy)
  const rotasAtivas = [...fretesAtivos]
    .filter(f => f.origem_lat && (f.dest_lat || f.destino_lat))
    .sort((a, b) => {
      if (!posicaoAtual) return 0;
      const dA = Math.pow(parseFloat(a.origem_lat) - posicaoAtual.lat, 2) + Math.pow(parseFloat(a.origem_lng) - posicaoAtual.lng, 2);
      const dB = Math.pow(parseFloat(b.origem_lat) - posicaoAtual.lat, 2) + Math.pow(parseFloat(b.origem_lng) - posicaoAtual.lng, 2);
      return dA - dB;
    })
    .map(f => ({
      origem: { lat: parseFloat(f.origem_lat), lng: parseFloat(f.origem_lng), label: f.origem_cidade || "Coleta" },
      destino: { lat: parseFloat(f.dest_lat || f.destino_lat), lng: parseFloat(f.dest_lng || f.destino_lng), label: f.dest_cidade || f.destino_cidade || "Entrega" },
    }));

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div style={{ fontSize: 11, color: "var(--text2)", display: "flex", alignItems: "center" }}>
            <span className={online ? "online-dot" : "offline-dot"} />
            {online ? "Online — aceitando fretes" : "Offline"}
          </div>
          <h1>{user?.nome?.split(" ")[0] || "Motorista"}</h1>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <label className="toggle">
            <input type="checkbox" checked={online} onChange={e => toggleOnline(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
          <span style={{ fontSize: 22, cursor: "pointer" }} onClick={() => onNavigate("perfil-motorista")}>👤</span>
        </div>
      </div>
      <div className="content">
        {erroOnline && <div className="alert alert-error" style={{ marginBottom: 14 }}>{erroOnline}</div>}
        {!seguroValido && (
          <div className="card" style={{ borderColor: "var(--red)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("seguro-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Registre seu seguro pra poder aceitar fretes</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Toque para regularizar</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {propostasPendentes > 0 && (
          <div className="card" style={{ borderColor: "var(--gold)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("minhas-propostas")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>📨</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Você tem {propostasPendentes} contraproposta{propostasPendentes > 1 ? "s" : ""} para responder</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Toque para ver e decidir</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {convitesPendentes > 0 && (
          <div className="card" style={{ borderColor: "var(--gold)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("convites-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎯</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Você tem {convitesPendentes} convite{convitesPendentes > 1 ? "s" : ""} direto{convitesPendentes > 1 ? "s" : ""} de contratante{convitesPendentes > 1 ? "s" : ""}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Toque para ver e decidir</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {fretesAtivos.length === 0 && !temDisponibilidadeAtiva && (
          <div className="card" style={{ cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("disponibilidade-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>📢</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Sem frete agora? Anuncie sua disponibilidade</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Contratantes da sua região podem te convidar direto</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        <div className="km-vazio-bar">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>📊 KM VAZIO HOJE</span>
            <span style={{ fontSize: 11, color: "var(--text2)" }}>Meta: {formatKm(metaKmVazio)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: pctMeta > 100 ? "var(--red)" : pctMeta > 75 ? "var(--orange)" : "var(--green)" }}>{formatKm(kmVazio)}</span>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>({pctMeta}% da meta)</span>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill ${pctMeta > 100 ? "red" : pctMeta > 75 ? "" : "green"}`} style={{ width: `${Math.min(pctMeta, 100)}%` }} />
          </div>
        </div>

        <MapaLeaflet
          key={`home-map-${rotasAtivas.length}-${posicaoAtual ? 1 : 0}`}
          lat={posicaoAtual?.lat}
          lng={posicaoAtual?.lng}
          height={rotasAtivas.length > 0 ? 220 : 180}
          marcadores={rotasAtivas.length === 0 ? marcadoresFretes : []}
          rotas={rotasAtivas}
        />

        {fretesAtivos.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              🚛 Fretes em andamento ({fretesAtivos.length})
            </div>
            {fretesAtivos.map((f, idx) => {
              const cores = ["#C9A84C", "#2D7A3A", "#2563EB", "#9333EA", "#EF4444"];
              const cor = cores[idx % cores.length];
              return (
                <div key={f.id} style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `2px solid ${cor}`, cursor: "pointer" }}
                  onClick={() => onNavigate("em-transito", f)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: cor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{idx + 1}</div>
                      <StatusBadge status={f.status} />
                    </div>
                    <span style={{ color: "var(--green)", fontWeight: 800, fontSize: 14 }}>{formatMoney(f.valor_motorista || 0)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>📏 {f.distancia_km} km · 📦 {f.tipo_carga}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <CampoCidadeAutocomplete
            label={null}
            value={buscaCidade}
            onChange={setBuscaCidade}
            onSelecionar={({ cidade }) => setBuscaCidade(cidade)}
            placeholder="🔍 Buscar por cidade de origem"
            inputStyle={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif" }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Tipo de frete</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {[["todos", "Todos"], ["urbano", "🏙️ Urbano"], ["intermunicipal", "🛣️ Intermunic."], ["interestadual", "🗺️ Interestadual"]].map(([id, label]) => (
              <button key={id} onClick={() => setFiltroTipo(id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filtroTipo === id ? "var(--orange)" : "var(--border)", background: filtroTipo === id ? "var(--orange)" : "var(--dark3)", color: filtroTipo === id ? "#fff" : "var(--text3)", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Peso da carga</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["todos", "Todos"], ["leve", "Até 3t"], ["medio", "3–14t"], ["pesado", "+14t"]].map(([id, label]) => (
              <button key={id} onClick={() => setFiltroPeso(id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filtroPeso === id ? "var(--orange)" : "var(--border)", background: filtroPeso === id ? "var(--orange)" : "var(--dark3)", color: filtroPeso === id ? "#fff" : "var(--text3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
          {online ? `${filtrados.length || disponiveis.length} Fretes Disponíveis` : "Você está offline"}
        </div>

        {!online && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>😴</div>
            <p style={{ fontWeight: 600 }}>Você está offline</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ative o toggle para receber fretes</p>
          </div>
        )}

        {online && loading && <Loading />}

        {online && !loading && (disponiveis.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <p style={{ fontWeight: 600 }}>Nenhum frete disponível</p>
            <p style={{ fontSize: 13, marginTop: 4, color: "#444" }}>Novos fretes aparecem aqui automaticamente</p>
          </div>
        ) : (filtrados.length > 0 ? filtrados : disponiveis).map(f => {
          const cargaObj = TIPOS_CARGA.find(c => c.id === f.tipo_carga);
          return (
            <div key={f.id} className="uber-card" onClick={() => onNavigate("aceitar-frete", f)} style={f.prioridade_rota ? { borderColor: "var(--gold)" } : undefined}>
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag-chip">{cargaObj?.icon || "📦"} {cargaObj?.label || f.tipo_carga}</span>
                    <span className="tag-chip">📏 {f.distancia_km} km</span>
                    {f.prioridade_rota && <span className="tag-chip">📍 Perto da sua última entrega</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>⚖️ {f.peso_tons}t · 🚛 {f.tipo_veiculo}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>motorista</div>
                  {f.valorLiquidoEstimado != null && (
                    <div style={{ fontSize: 11, color: f.valorLiquidoEstimado >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700, marginTop: 2 }}>
                      ≈ {formatMoney(f.valorLiquidoEstimado)} líquido
                    </div>
                  )}
                </div>
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "var(--text2)" }}>📍 {f.distancia_motorista_km || "?"} km de você</span>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onNavigate("aceitar-frete", f); }}>Ver frete</button>
              </div>
            </div>
          );
        }))}
      </div>
      <BottomNavMotorista active="inicio" onNavigate={onNavigate} />
    </div>
  );
}
