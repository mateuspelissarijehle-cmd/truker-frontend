import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// PROPOSTAS RECEBIDAS (Contratante)
// ─────────────────────────────────────────────
export function PropostasRecebidasScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [contraproporId, setContraproporId] = useState(null);
  const [novoValor, setNovoValor] = useState("");
  const [acao, setAcao] = useState(null); // id da proposta com ação em andamento

  const carregar = () => {
    if (!frete?.id) return;
    setLoading(true);
    api("GET", `/api/fretes/${frete.id}/propostas`, null, token)
      .then(setPropostas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [frete?.id]);

  if (!frete) return <Loading />;

  const aceitar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/aceitar`, null, token);
      setMsg("✅ Proposta aceita! O frete foi atribuído a este motorista.");
      setTimeout(() => onNavigate("detalhe-frete", { ...frete, status: "aceito" }), 1500);
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const recusar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/recusar`, null, token);
      setMsg("Proposta recusada.");
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const enviarContraproposta = async (propostaId) => {
    const valor = parseFloat(String(novoValor).replace(",", "."));
    if (!valor || valor <= 0) return setError("Informe um valor válido");
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/contrapropor`, { novoValor: valor }, token);
      setMsg("✅ Contraproposta enviada! Aguardando resposta do motorista.");
      setContraproporId(null); setNovoValor("");
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("detalhe-frete", frete)}>←</button>
        <h1>Propostas Recebidas</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="info-row"><span className="info-label">Frete</span><span className="info-value" style={{ fontSize: 12 }}>{frete.origem_cidade} → {frete.dest_cidade}</span></div>
          <div className="info-row"><span className="info-label">Valor publicado</span><span className="info-value">{formatMoney(frete.valor_final || frete.valor_antt || 0)}</span></div>
        </div>

        {loading && <Loading />}

        {!loading && propostas.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <p style={{ fontWeight: 600 }}>Nenhuma proposta recebida ainda</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Motoristas podem aceitar pelo valor publicado ou enviar uma proposta diferente</p>
          </div>
        )}

        {!loading && propostas.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.motorista_nome}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{p.tipo_veiculo} · {p.placa_veiculo || "—"} · ⭐ {Number(p.avaliacao_media).toFixed(1)}</div>
              </div>
              <span className={`badge ${p.rodada === 2 ? "badge-pending" : "badge-active"}`}>
                {p.rodada === 2 ? "Aguardando motorista" : "Proposta do motorista"}
              </span>
            </div>

            <div className="divider" />

            <div className="info-row">
              <span className="info-label">Valor proposto pelo motorista</span>
              <span className="info-value price" style={{ fontSize: 18 }}>{formatMoney(p.valor_motorista)}</span>
            </div>
            {p.rodada === 2 && (
              <div className="info-row">
                <span className="info-label">Sua contraproposta</span>
                <span className="info-value" style={{ color: "var(--gold)" }}>{formatMoney(p.valor_contratante)}</span>
              </div>
            )}

            {p.rodada === 1 && contraproporId !== p.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => aceitar(p.id)} disabled={acao === p.id}>✅ Aceitar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setContraproporId(p.id)} disabled={acao === p.id}>💬 Contrapropor</button>
                <button className="btn btn-danger btn-sm" onClick={() => recusar(p.id)} disabled={acao === p.id}>✕ Recusar</button>
              </div>
            )}

            {p.rodada === 1 && contraproporId === p.id && (
              <div style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Sua contraproposta (R$)</label>
                  <input type="number" step="0.01" placeholder={String(p.valor_motorista)} value={novoValor} onChange={e => setNovoValor(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => enviarContraproposta(p.id)} disabled={acao === p.id}>Enviar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setContraproporId(null); setNovoValor(""); }}>Cancelar</button>
                </div>
              </div>
            )}

            {p.rodada === 2 && (
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 10 }}>Aguardando o motorista aceitar ou recusar sua contraproposta de {formatMoney(p.valor_contratante)}.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
