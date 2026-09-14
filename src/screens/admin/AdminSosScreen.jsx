import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";

const TIPO_LABELS = { motorista: "🚛 Motorista", contratante: "📦 Contratante" };

// ─────────────────────────────────────────────
// ADMIN — SOS RECENTES
// Visibilidade pro admin dos acionamentos de SOS (botão de emergência) das
// últimas 24h. Quem liga/manda SMS de verdade é o celular de quem disparou
// (ver SosButton.jsx) -- esta tela é só pra o admin também poder agir se
// precisar (ex: ninguém atendeu, ou o admin quer confirmar que está tudo bem).
// ─────────────────────────────────────────────
export function AdminSosScreen({ onNavigate }) {
  const { token } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const carregar = useCallback(() => {
    api("GET", "/api/admin/sos-recentes", null, token)
      .then(setAlertas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    carregar();
    // Emergência é sensível a tempo -- reconsulta sozinho a cada 20s em vez
    // de exigir o admin ficar recarregando a tela manualmente.
    const t = setInterval(carregar, 20000);
    return () => clearInterval(t);
  }, [carregar]);

  // GPS ausente na hora do disparo grava lat/lng como 0/0 (bug conhecido do
  // SosButton -- Number(null) passa como 0 na validação do backend) em vez de
  // null. Trata como "indisponível" aqui pra não mostrar uma posição falsa no
  // meio do oceano pro admin.
  const temLocalizacao = a => (a.latitude || a.latitude === 0) && (a.longitude || a.longitude === 0) && !(Number(a.latitude) === 0 && Number(a.longitude) === 0);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>SOS Recentes</h1></div>
      <div className="content">
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
          Acionamentos do botão de emergência nas últimas 24h. Ligar/mandar SMS de verdade é feito pelo celular de quem disparou — use os contatos abaixo se precisar agir.
        </p>
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? <Loading /> : alertas.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            Nenhum SOS nas últimas 24h
          </div>
        ) : alertas.map(a => (
          <div key={a.id} className="card" style={{ borderLeft: "4px solid var(--red)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span className="badge badge-cancel">🆘 {TIPO_LABELS[a.tipo] || a.tipo}</span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(a.criado_em).toLocaleString("pt-BR")}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{a.nome || "—"}</div>
            {a.frete_id && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Frete #{a.frete_id}</div>}

            <div className="divider" />
            <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Localização</div>
            {temLocalizacao(a) ? (
              <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                📍 Ver no mapa ({Number(a.latitude).toFixed(5)}, {Number(a.longitude).toFixed(5)})
              </a>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Localização indisponível no momento do disparo</div>
            )}

            <div className="divider" />
            <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contato de quem disparou</div>
            <div className="info-row">
              <span className="info-label">Telefone</span>
              <span className="info-value">{a.telefone ? <a href={`tel:${a.telefone}`}>{a.telefone}</a> : "—"}</span>
            </div>

            <div className="divider" />
            <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contato de emergência</div>
            {a.contato_emergencia_nome || a.contato_emergencia_telefone ? (
              <>
                <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{a.contato_emergencia_nome || "—"}</span></div>
                <div className="info-row">
                  <span className="info-label">Telefone</span>
                  <span className="info-value">{a.contato_emergencia_telefone ? <a href={`tel:${a.contato_emergencia_telefone}`}>{a.contato_emergencia_telefone}</a> : "—"}</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Sem contato de emergência cadastrado</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
