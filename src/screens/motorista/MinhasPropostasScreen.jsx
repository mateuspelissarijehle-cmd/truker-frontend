import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";
import { BottomNavMotorista } from "../../components/BottomNavMotorista";

// ─────────────────────────────────────────────
// MINHAS PROPOSTAS (Motorista)
// ─────────────────────────────────────────────
export function MinhasPropostasScreen({ onNavigate }) {
  const { token } = useAuth();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [acao, setAcao] = useState(null);

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/fretes/propostas/minhas", null, token)
      .then(setPropostas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const aceitar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/aceitar`, null, token);
      setMsg("✅ Contraproposta aceita! O frete foi atribuído a você.");
      setTimeout(() => onNavigate("home-motorista"), 1500);
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const recusar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/recusar`, null, token);
      setMsg("Contraproposta recusada.");
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const StatusProposta = ({ p }) => {
    const map = {
      pendente: p.rodada === 2 ? ["badge-pending", "Contraproposta recebida"] : ["badge-active", "Aguardando contratante"],
      aceita:   ["badge-done", "Aceita"],
      recusada: ["badge-cancel", "Recusada"],
      expirada: ["", "Encerrada"],
    };
    const [cls, label] = map[p.status] || ["", p.status];
    return <span className={`badge ${cls}`} style={!cls ? { background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)" } : {}}>{label}</span>;
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Minhas Propostas</h1>
      </div>
      <div className="content">
        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes("seguro de frete registrado") && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("seguro-motorista")}>🛡️ Registrar Seguro</button>
            )}
          </div>
        )}
        {msg && <div className="alert alert-success">{msg}</div>}

        {loading && <Loading />}

        {!loading && propostas.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📨</div>
            <p style={{ fontWeight: 600 }}>Nenhuma proposta enviada ainda</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Proponha valores nos fretes disponíveis para negociar com contratantes</p>
          </div>
        )}

        {!loading && propostas.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.origem_cidade} → {p.dest_cidade}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Contratante: {p.contratante_nome}</div>
              </div>
              <StatusProposta p={p} />
            </div>

            <div className="divider" />

            <div className="info-row">
              <span className="info-label">Sua proposta</span>
              <span className="info-value">{formatMoney(p.valor_motorista)}</span>
            </div>
            {p.valor_contratante && (
              <div className="info-row">
                <span className="info-label">Contraproposta do contratante</span>
                <span className="info-value price" style={{ fontSize: 18 }}>{formatMoney(p.valor_contratante)}</span>
              </div>
            )}

            {p.status === "pendente" && p.rodada === 2 && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => aceitar(p.id)} disabled={acao === p.id}>✅ Aceitar</button>
                <button className="btn btn-danger btn-sm" onClick={() => recusar(p.id)} disabled={acao === p.id}>✕ Recusar</button>
              </div>
            )}

            {p.status === "pendente" && p.rodada === 1 && (
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Aguardando resposta do contratante...</p>
            )}
          </div>
        ))}
      </div>
      <BottomNavMotorista active="inicio" onNavigate={onNavigate} />
    </div>
  );
}
