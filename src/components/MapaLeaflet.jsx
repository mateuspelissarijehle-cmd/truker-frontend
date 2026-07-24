import { useState, useEffect, useRef } from "react";
import { buscarRotaOSRM } from "../services/osrm";
import { distanciaMetros, calcularRumo } from "../utils/geo";

// ─────────────────────────────────────────────
// MAPA LEAFLET + OPENSTREETMAP (gratuito)
// ─────────────────────────────────────────────
// origem/destino: só os 2 pinos fixos de visão geral (coleta/entrega), sem
// relação com navegação ao vivo. metaAoVivo: alvo de navegação da FASE ATUAL
// do frete (indo pra origem ainda não coletado, ou pro destino já coletado)
// — é o que dirige o traçado de rota ao vivo (recalculado conforme lat/lng
// mudam) e o ETA via onRotaInfo. Sem metaAoVivo, cai no comportamento antigo
// (traçado único e estático entre origem e destino).
// Ícone do motorista: bolinha simples (mapas sem orientação) ou seta
// direcional rotacionável (modo navegação, ex.: tela "Em Trânsito").
function criarIconeMotorista(comOrientacao, headingDeg) {
  const L = window.L;
  if (!comOrientacao) {
    return L.divIcon({
      html: '<div style="background:#C9A84C;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(201,168,76,0.8)"></div>',
      className: "", iconSize: [14, 14], iconAnchor: [7, 7],
    });
  }
  return L.divIcon({
    html: `<div class="driver-arrow" style="width:34px;height:34px;transform:rotate(${headingDeg || 0}deg);transform-origin:50% 50%;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5))">
      <svg viewBox="0 0 24 24" width="34" height="34"><path d="M12 2 L20 20 L12 16 L4 20 Z" fill="#C9A84C" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>
    </div>`,
    className: "", iconSize: [34, 34], iconAnchor: [17, 17],
  });
}

// Carrega o script/CSS do Leaflet uma única vez, mesmo com vários mapas
// montando ao mesmo tempo (ex.: telas com mapa em miniatura + navegação).
// A promise é cacheada no módulo (singleton), então todo mundo que chama
// isso — não importa quem montou primeiro — recebe o mesmo aviso de "pronto",
// em vez de cada componente pisar no `script.onload` do anterior e travar
// esperando um load que nunca vai chamar o initMap dele.
let leafletLoadPromise = null;
function carregarLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("#leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existente = document.querySelector("#leaflet-js");
    if (existente) {
      existente.addEventListener("load", () => resolve());
      existente.addEventListener("error", (e) => reject(e));
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js"; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}

// modoNavegacao: habilita zoom/seguimento ao vivo estilo GPS + botão de
// recentralizar. mostrarOrientacao: além disso, calcula o rumo do motorista
// e permite alternar entre "Norte sempre pra cima" (só a seta gira) e
// "direção do movimento pra cima" — nesse 2º modo o mapa inteiro roda via
// CSS transform (truque leve, sem plugin: o próprio Leaflet não sabe que
// está rotacionado, só giramos os pixels renderizados). Isso faz os rótulos
// dos tiles ficarem tortos durante a rotação — comportamento esperado em
// apps de navegação com tiles raster (mesmo efeito do Waze/Google Maps).
export function MapaLeaflet({ lat, lng, zoom = 14, height = 200, marcadores = [], origem = null, destino = null, rotas = [], metaAoVivo = null, onRotaInfo = null, modoNavegacao = false, zoomNavegacao = 16, seguirPorPadrao = false, mostrarOrientacao = false }) {
  const divRef = useRef(null);
  const rotatorRef = useRef(null);
  const mapRef = useRef(null);
  const marcadorRef = useRef(null);
  const rotaPrincipalLayerRef = useRef(null);
  const rotaPrincipalOrigemRef = useRef(null); // {lat,lng} usado no último desenho, pra só redesenhar se moveu o suficiente
  const propsRef = useRef({ lat, lng, zoom, origem, destino, rotas, metaAoVivo, onRotaInfo });
  propsRef.current = { lat, lng, zoom, origem, destino, rotas, metaAoVivo, onRotaInfo };
  const seguindoRef = useRef(seguirPorPadrao);
  const [seguindo, setSeguindo] = useState(seguirPorPadrao);
  const [orientModo, setOrientModo] = useState("norte"); // "norte" | "direcao"
  const headingRef = useRef(null);
  const ultimoHeadingCalcRef = useRef(null); // {lat,lng} do último ponto usado pra calcular rumo

  const aplicarRotacaoContainer = (modo, headingDeg) => {
    if (!mostrarOrientacao || !rotatorRef.current) return;
    const ang = modo === "direcao" && headingDeg != null ? -headingDeg : 0;
    rotatorRef.current.style.transform = `rotate(${ang}deg)`;
  };

  const recentralizar = () => {
    seguindoRef.current = true;
    setSeguindo(true);
    const p = propsRef.current;
    if (mapRef.current && p.lat && p.lng) mapRef.current.setView([p.lat, p.lng], zoomNavegacao, { animate: true });
  };

  const alternarOrientacao = () => setOrientModo(m => (m === "norte" ? "direcao" : "norte"));

  useEffect(() => { aplicarRotacaoContainer(orientModo, headingRef.current); }, [orientModo]);

  // Busca a rota real (OSRM, gratuito) entre 2 pontos e desenha no mapa,
  // substituindo o traçado anterior. Usada tanto no desenho inicial quanto
  // pra atualizar a linha conforme a posição ao vivo do motorista muda
  // (acompanhamento em trânsito). Também repassa distância/duração pra quem
  // quiser mostrar um ETA (onRotaInfo), já que o OSRM devolve isso de graça
  // junto com a geometria — sem precisar de uma chamada extra à Directions API.
  const desenharRotaPrincipal = (start, end) => {
    if (!start || !end || start === end || !mapRef.current) return;
    buscarRotaOSRM(start, end).then(rota => {
      if (!rota?.geometry || !mapRef.current) return;
      if (rotaPrincipalLayerRef.current) mapRef.current.removeLayer(rotaPrincipalLayerRef.current);
      rotaPrincipalLayerRef.current = window.L.geoJSON(rota.geometry, {
        style: { color: "#F97316", weight: 4, opacity: 0.75, dashArray: "10,6" }
      }).addTo(mapRef.current);
      if (propsRef.current.onRotaInfo) {
        propsRef.current.onRotaInfo({
          distanciaKm: parseFloat((rota.distance / 1000).toFixed(1)),
          duracaoMin: Math.ceil(rota.duration / 60),
        });
      }
    });
  };

  const initMap = () => {
    if (!divRef.current || mapRef.current) return;
    const L = window.L;
    const p = propsRef.current;
    const centerLat = p.lat || p.origem?.lat || -25.4284;
    const centerLng = p.lng || p.origem?.lng || -49.2733;
    const map = L.map(divRef.current, { zoomControl: false, attributionControl: false })
      .setView([centerLat, centerLng], modoNavegacao ? zoomNavegacao : p.zoom);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

    // Só quebra o "seguir automaticamente" quando o próprio usuário arrasta o
    // mapa (dragstart não dispara em movimentos programáticos como panTo/setView).
    if (modoNavegacao) {
      map.on("dragstart", () => { seguindoRef.current = false; setSeguindo(false); });
    }

    // Marcador do motorista (bolinha ou seta, ver criarIconeMotorista)
    if (p.lat && p.lng) {
      const icon = criarIconeMotorista(mostrarOrientacao, headingRef.current);
      marcadorRef.current = L.marker([p.lat, p.lng], { icon }).addTo(map);
    }

    // Marcador de coleta (verde)
    if (p.origem?.lat && p.origem?.lng) {
      const icon = L.divIcon({
        html: `<div style="background:#22C55E;color:#fff;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">📍 ${p.origem.label || "Coleta"}</div>`,
        className: "", iconAnchor: [0, 12],
      });
      L.marker([p.origem.lat, p.origem.lng], { icon }).addTo(map);
    }

    // Marcador de entrega (vermelho)
    if (p.destino?.lat && p.destino?.lng) {
      const icon = L.divIcon({
        html: `<div style="background:#EF4444;color:#fff;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">🏁 ${p.destino.label || "Entrega"}</div>`,
        className: "", iconAnchor: [0, 12],
      });
      L.marker([p.destino.lat, p.destino.lng], { icon }).addTo(map);
    }

    // Marcadores de fretes disponíveis (azul)
    marcadores.forEach(m => {
      if (!m.lat || !m.lng) return;
      const icon = L.divIcon({
        html: `<div style="background:#3B82F6;color:#fff;padding:2px 7px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">📦 ${m.label || ""}</div>`,
        className: "", iconAnchor: [0, 8],
      });
      L.marker([m.lat, m.lng], { icon }).addTo(map);
    });

    // Ajusta zoom para mostrar todos os pontos
    const pontos = [];
    if (p.lat && p.lng) pontos.push([p.lat, p.lng]);
    if (p.origem?.lat) pontos.push([p.origem.lat, p.origem.lng]);
    if (p.destino?.lat) pontos.push([p.destino.lat, p.destino.lng]);
    (p.rotas || []).forEach(r => {
      if (r.origem?.lat) pontos.push([r.origem.lat, r.origem.lng]);
      if (r.destino?.lat) pontos.push([r.destino.lat, r.destino.lng]);
    });
    if (pontos.length > 1) map.fitBounds(L.latLngBounds(pontos), { padding: [35, 35] });

    mapRef.current = map;

    // Rota principal via OSRM (gratuito, sem API key). metaAoVivo tem
    // prioridade (alvo da fase atual, quando existe acompanhamento ao vivo);
    // sem ela, cai no traçado estático origem->destino de sempre.
    const alvoInicial = p.metaAoVivo || p.destino || p.origem;
    const start = p.lat && p.lng ? `${p.lng},${p.lat}` : p.origem?.lng ? `${p.origem.lng},${p.origem.lat}` : null;
    const end = alvoInicial?.lat ? `${alvoInicial.lng},${alvoInicial.lat}` : null;
    if (start && end) {
      desenharRotaPrincipal(start, end);
      rotaPrincipalOrigemRef.current = p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null;
    }

    // Múltiplas rotas de fretes ativos (cada uma com cor e número)
    const coresRotas = ["#C9A84C", "#2D7A3A", "#2563EB", "#9333EA", "#EF4444"];
    (p.rotas || []).forEach((rota, idx) => {
      const cor = coresRotas[idx % coresRotas.length];
      const num = idx + 1;
      if (rota.origem?.lat && rota.origem?.lng) {
        const icon = L.divIcon({
          html: `<div style="background:${cor};color:#fff;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${num}📍 ${rota.origem.label||"Coleta"}</div>`,
          className: "", iconAnchor: [0, 12],
        });
        L.marker([rota.origem.lat, rota.origem.lng], { icon }).addTo(map);
      }
      if (rota.destino?.lat && rota.destino?.lng) {
        const icon = L.divIcon({
          html: `<div style="background:${cor};color:#fff;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${num}🏁 ${rota.destino.label||"Entrega"}</div>`,
          className: "", iconAnchor: [0, 12],
        });
        L.marker([rota.destino.lat, rota.destino.lng], { icon }).addTo(map);
      }
      if (rota.origem?.lat && rota.destino?.lat) {
        const s = `${rota.origem.lng},${rota.origem.lat}`;
        const e = `${rota.destino.lng},${rota.destino.lat}`;
        buscarRotaOSRM(s, e).then(rotaOSRM => {
          if (rotaOSRM?.geometry && mapRef.current) {
            window.L.geoJSON(rotaOSRM.geometry, {
              style: { color: cor, weight: 3, opacity: 0.85 }
            }).addTo(mapRef.current);
          }
        });
      }
    });
  };

  useEffect(() => {
    let cancelado = false;
    carregarLeaflet().then(() => { if (!cancelado) initMap(); }).catch(() => {});
    return () => {
      cancelado = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; marcadorRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.L || !lat || !lng) return;

    // Recalcula o rumo só se moveu o suficiente desde o último cálculo —
    // com o motorista parado, o GPS "tremula" alguns metros e giraria a
    // seta/mapa sem necessidade.
    if (mostrarOrientacao) {
      const anteriorHeading = ultimoHeadingCalcRef.current;
      if (anteriorHeading) {
        if (distanciaMetros(anteriorHeading.lat, anteriorHeading.lng, lat, lng) > 8) {
          headingRef.current = calcularRumo(anteriorHeading.lat, anteriorHeading.lng, lat, lng);
          ultimoHeadingCalcRef.current = { lat, lng };
        }
      } else {
        ultimoHeadingCalcRef.current = { lat, lng };
      }
    }

    if (marcadorRef.current) {
      marcadorRef.current.setLatLng([lat, lng]);
      if (mostrarOrientacao) {
        const el = marcadorRef.current.getElement()?.querySelector(".driver-arrow");
        if (el) el.style.transform = `rotate(${headingRef.current || 0}deg)`;
      }
    } else {
      const icon = criarIconeMotorista(mostrarOrientacao, headingRef.current);
      marcadorRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
    }

    if (modoNavegacao && seguindoRef.current) {
      mapRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
    aplicarRotacaoContainer(orientModo, headingRef.current);
  }, [lat, lng, orientModo]);

  // Redesenha a linha de rota (e recalcula o ETA) conforme a posição ao vivo
  // do motorista muda — acompanhamento em trânsito tipo Uber/iFood. Só
  // redesenha se moveu o suficiente (~100m) desde o último traçado, pra não
  // martelar o OSRM a cada atualização mínima de GPS.
  useEffect(() => {
    if (!mapRef.current || !window.L || !lat || !lng || !metaAoVivo?.lat || !metaAoVivo?.lng) return;
    const anterior = rotaPrincipalOrigemRef.current;
    const moveuOSuficiente = !anterior || Math.abs(anterior.lat - lat) > 0.001 || Math.abs(anterior.lng - lng) > 0.001;
    if (!moveuOSuficiente) return;
    desenharRotaPrincipal(`${lng},${lat}`, `${metaAoVivo.lng},${metaAoVivo.lat}`);
    rotaPrincipalOrigemRef.current = { lat, lng };
  }, [lat, lng, metaAoVivo?.lat, metaAoVivo?.lng]);

  const alturaCss = typeof height === "number" ? `${height}px` : height;

  return (
    <div style={{ width: "100%", height: alturaCss, borderRadius: 12, overflow: "hidden", position: "relative", zIndex: 1, background: "#EFE9DC" }}>
      <div
        ref={rotatorRef}
        style={mostrarOrientacao
          ? { position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", transition: "transform 0.4s ease-out", transformOrigin: "50% 50%" }
          : { width: "100%", height: "100%" }}
      >
        <div ref={divRef} style={{ width: "100%", height: "100%" }} />
      </div>
      {modoNavegacao && (
        <button
          type="button"
          onClick={recentralizar}
          title="Centralizar no motorista"
          style={{
            position: "absolute", right: 12, bottom: 12, width: 44, height: 44, borderRadius: "50%",
            background: seguindo ? "#C9A84C" : "#fff", color: seguindo ? "#fff" : "#333",
            border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.35)", fontSize: 20, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 500,
          }}
        >🎯</button>
      )}
      {mostrarOrientacao && (
        <button
          type="button"
          onClick={alternarOrientacao}
          title="Alternar orientação do mapa"
          style={{
            position: "absolute", right: 12, top: 12, padding: "7px 12px", borderRadius: 20,
            background: "rgba(255,255,255,0.92)", color: "#333", border: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)", fontSize: 12, fontWeight: 700, cursor: "pointer", zIndex: 500,
          }}
        >{orientModo === "norte" ? "🧭 Norte" : "🧭 Direção"}</button>
      )}
    </div>
  );
}
