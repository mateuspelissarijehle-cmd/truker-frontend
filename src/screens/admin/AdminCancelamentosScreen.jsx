import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// ADMIN — CANCELAMENTOS PENDENTES DE ACERTO
// Contratante cancelou com a carga já carregada (coletando/em_rota). A
// compensação pro motorista já foi calculada automaticamente (distância
// percorrida + taxa de transtorno); aqui só mostramos os valores pra o
// Mateus decidir e executar o reembolso/repasse por fora, no painel Asaas.
// "Marcar como resolvido" NÃO move dinheiro nenhum -- só tira da lista.
// ─────────────────────────────────────────────
export function AdminCancelamentosScreen({ onNavigate }) {
  const { token } = useAuth();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvendoId, setResolvendoId] = useState(null);

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/admin/cancelamentos-pendentes", null, token)
      .then(r => setItens(r.itens))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const marcarResolvido = async (id) => {
    if (!confirm("Confirma que o acerto (reembolso/repasse) já foi feito manualmente por fora? Isso só atualiza o registro, não movimenta dinheiro.")) return;
    setResolvendoId(id); setError("");
    try {
      await api("POST", `/api/admin/cancelamentos/${id}/marcar-resolvido`, null, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setResolvendoId(null); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Cancelamentos Pendentes</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? <Loading /> : itens.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            Nenhum cancelamento pendente de acerto
          </div>
        ) : itens.map(f => (
          <div key={f.id} className="card" style={{ borderLeft: "4px solid var(--orange)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span className="badge badge-cancel">Cancelado com carga carregada</span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(f.atualizado_em).toLocaleString("pt-BR")}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{f.origem_cidade} → {f.dest_cidade}</div>

            <div className="info-row"><span className="info-label">Valor pago pelo contratante</span><span className="info-value">{formatMoney(f.valorPago)}</span></div>
            <div className="info-row"><span className="info-label">Compensação pro motorista</span><span className="info-value" style={{ color: "var(--orange)" }}>− {formatMoney(f.compensacaoMotorista)}</span></div>
            <div className="info-row"><span className="info-label">Comissão TRUKER já retida</span><span className="info-value" style={{ color: "var(--orange)" }}>− {formatMoney(f.comissaoRetida)}</span></div>
            <div className="divider" />
            <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Reembolso estimado ao contratante</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800, fontSize: 16 }}>{formatMoney(f.reembolsoEstimadoContratante)}</span></div>

            {f.compensacao_detalhes && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
                Distância considerada: {f.compensacao_detalhes.distanciaPercorridaKm} km ({f.compensacao_detalhes.metodoDistancia}) · Taxa de transtorno: {formatMoney(f.compensacao_detalhes.taxaTranstorno)}
              </p>
            )}

            <div className="divider" />
            <div className="info-row"><span className="info-label">Contratante</span><span className="info-value">{f.contratante_nome || "—"}</span></div>
            <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{f.contratante_telefone || "—"}</span></div>
            <div className="info-row"><span className="info-label">Motorista</span><span className="info-value">{f.motorista_nome || "—"}</span></div>
            <div className="info-row"><span className="info-label">Telefone motorista</span><span className="info-value">{f.motorista_telefone || "—"}</span></div>

            <button className="btn btn-success btn-sm" style={{ marginTop: 12, width: "100%" }} onClick={() => marcarResolvido(f.id)} disabled={resolvendoId === f.id}>
              {resolvendoId === f.id ? "Salvando..." : "✅ Marcar como resolvido (acerto já feito por fora)"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
