import { useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { api } from "../services/api";
import { getCurrentPosition } from "../services/geolocation";

// ─────────────────────────────────────────────
// SOS GLOBAL — botão flutuante com confirmação por "segurar",
// visível em qualquer tela pro motorista logado (contratante não usa este botão).
// ─────────────────────────────────────────────
const HOLD_MS = 2200;
const RING_R = 26;
const RING_CIRC = 2 * Math.PI * RING_R;

const onlyDigits = (v) => (v || "").replace(/\D/g, "");

// sms: no Android aceita "?body=", iOS historicamente precisa de "&body="
// quando já não há outro parâmetro na URI — por isso o separador varia.
function buildSmsHref(telefone, mensagem) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const digitos = onlyDigits(telefone);
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos; // sem DDI, assume Brasil
  const separator = isIOS ? "&" : "?";
  return `sms:${numero}${separator}body=${encodeURIComponent(mensagem)}`;
}

export function SosButton() {
  const { user, token } = useAuth();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [locStatus, setLocStatus] = useState("idle"); // idle | loading | ok | error
  const [coords, setCoords] = useState(null);
  const [alertStatus, setAlertStatus] = useState("idle"); // idle | loading | ok | error
  const [contato, setContato] = useState(null);
  const [contatoStatus, setContatoStatus] = useState("idle"); // idle | loading | ok | vazio | error
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const cancelHold = () => {
    setHolding(false);
    setProgress(0);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const capturarGPS = async () => {
    setLocStatus("loading");
    try {
      const c = await getCurrentPosition({ timeoutMs: 8000 });
      setCoords(c);
      setLocStatus("ok");
      return c;
    } catch {
      setLocStatus("error");
      return null;
    }
  };

  const carregarContato = async () => {
    if (!user || !token) { setContatoStatus("error"); return; }
    setContatoStatus("loading");
    try {
      const path = user.tipo === "motorista" ? "/api/motoristas/perfil" : "/api/contratantes/perfil";
      const d = await api("GET", path, null, token);
      const nome = d.contato_emergencia_nome;
      const telefone = d.contato_emergencia_telefone;
      if (nome && telefone) { setContato({ nome, telefone }); setContatoStatus("ok"); }
      else { setContato(null); setContatoStatus("vazio"); }
    } catch {
      setContato(null);
      setContatoStatus("error");
    }
  };

  // Falha aqui não bloqueia ligar pra polícia nem avisar o contato.
  const registrarAlerta = async (c) => {
    setAlertStatus("loading");
    try {
      await api("POST", "/api/usuarios/sos", { latitude: c?.lat ?? null, longitude: c?.lng ?? null }, token);
      setAlertStatus("ok");
    } catch {
      setAlertStatus("error");
    }
  };

  const dispararSos = () => {
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    setPanelOpen(true);
    setLocStatus("idle"); setAlertStatus("idle"); setContatoStatus("idle");
    Promise.all([capturarGPS(), carregarContato()]).then(([c]) => registrarAlerta(c));
  };

  const startHold = (e) => {
    e.preventDefault();
    setHolding(true);
    startRef.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        setHolding(false);
        setProgress(0);
        rafRef.current = null;
        dispararSos();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const ligarPolicia = () => { window.location.href = "tel:190"; };

  const avisarContato = () => {
    if (!contato) return;
    const linkMapa = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : null;
    const msg = `🚨 EMERGÊNCIA — ${user?.nome || "Um usuário do TRUKER"} pediu ajuda pelo app.` +
      (linkMapa ? `\nLocalização: ${linkMapa}` : "\n(Não foi possível obter a localização exata)");
    window.location.href = buildSmsHref(contato.telefone, msg);
  };

  const fechar = () => setPanelOpen(false);

  if (!user || user.tipo !== "motorista") return null;

  return (
    <>
      <div className="sos-overlay">
        <div className="sos-fab-wrap">
          <svg className="sos-ring" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RING_R} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
            {holding && (
              <circle
                cx="32" cy="32" r={RING_R} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - progress / 100)}
                transform="rotate(-90 32 32)"
              />
            )}
          </svg>
          <button
            className={`sos-fab ${holding ? "holding" : ""}`}
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onContextMenu={e => e.preventDefault()}
            aria-label="Segure por 2 segundos para acionar SOS de emergência"
          >
            {holding ? "SEGURE" : "SOS"}
          </button>
        </div>
      </div>

      {panelOpen && (
        <div className="sos-modal-backdrop">
          <div className="sos-modal">
            <div className="sos-modal-title">🚨 Alerta de emergência ativado</div>

            <div className="sos-modal-status">
              {locStatus === "loading" && "📡 Obtendo sua localização..."}
              {locStatus === "ok" && "📍 Localização capturada"}
              {locStatus === "error" && "⚠️ Não foi possível obter sua localização"}
            </div>
            <div className="sos-modal-status">
              {alertStatus === "loading" && "Registrando alerta..."}
              {alertStatus === "ok" && "✅ Alerta registrado no TRUKER"}
              {alertStatus === "error" && "⚠️ Não deu pra registrar o alerta agora — as ações abaixo continuam funcionando"}
            </div>

            {contatoStatus === "ok" && contato && (
              <button className="btn btn-success" style={{ marginBottom: 10 }} onClick={avisarContato}>
                💬 Avisar {contato.nome} agora
              </button>
            )}
            {contatoStatus === "vazio" && (
              <div className="alert alert-info" style={{ fontSize: 12 }}>
                Você ainda não tem um contato de emergência cadastrado. Cadastre em Conta → Dados Pessoais.
              </div>
            )}

            <button className="btn btn-danger" style={{ marginBottom: 10 }} onClick={ligarPolicia}>📞 Ligar pra Polícia (190)</button>
            <button className="btn btn-secondary" onClick={fechar}>Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}
