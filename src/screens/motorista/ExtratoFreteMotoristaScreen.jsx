import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// EXTRATO DE UM FRETE — MOTORISTA
// Reaproveita GET /api/fretes/:id/extrato — mesmo endpoint usado em "Em Trânsito"
// pra fretes em andamento, mas aqui pra fretes já entregues ou cancelados com
// compensação (o backend diferencia pelo campo "tipo" da resposta).
// ─────────────────────────────────────────────
export function ExtratoFreteMotoristaScreen({ dados, onNavigate }) {
  const { token } = useAuth();
  const [extrato, setExtrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dados?.id) return;
    setLoading(true);
    api("GET", `/api/fretes/${dados.id}/extrato`, null, token)
      .then(setExtrato)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dados?.id]);

  const ehCompensacao = extrato?.tipo === "compensacao_cancelamento";
  const cd = extrato?.compensacaoDetalhes;

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>{ehCompensacao ? "Compensação" : "Extrato do Frete"}</h1>
      </div>
      <div className="content">
        {loading && <Loading />}
        {error && <div className="alert alert-error">{error}</div>}
        {extrato && (
          <>
            {ehCompensacao && (
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                🔄 Este frete foi cancelado pelo contratante depois que você já tinha saído pra coleta. O valor abaixo é a compensação pelo trecho percorrido, não o valor do frete completo.
              </div>
            )}
            <div className="card" style={{ textAlign: "center", borderColor: ehCompensacao ? "rgba(201,168,76,0.4)" : "rgba(45,122,58,0.3)", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{ehCompensacao ? "Compensação recebida" : "Valor a receber"}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: ehCompensacao ? "var(--gold)" : "var(--green)" }}>{formatMoney(extrato.valorReceber)}</div>
            </div>

            {ehCompensacao ? (
              <div className="card">
                <div className="card-title">Como foi calculado</div>
                {cd?.distanciaPercorridaKm != null && (
                  <div className="info-row"><span className="info-label">Distância percorrida</span><span className="info-value">{cd.distanciaPercorridaKm} km</span></div>
                )}
                <div className="info-row"><span className="info-label">⛽ Combustível (trecho percorrido)</span><span className="info-value">{formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
                <div className="info-row"><span className="info-label">🔧 Desgaste (trecho percorrido)</span><span className="info-value">{formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>
                {cd?.taxaTranstorno != null && (
                  <div className="info-row"><span className="info-label">⚠️ Taxa de transtorno ({Math.round((cd.percentualTaxa || 0) * 100)}%)</span><span className="info-value">{formatMoney(cd.taxaTranstorno)}</span></div>
                )}
                <div className="divider" />
                <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Total da compensação</span><span className="info-value" style={{ color: "var(--gold)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorReceber)}</span></div>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
                  Combustível e desgaste cobrem só o trecho que você já tinha percorrido até o cancelamento. A taxa de transtorno é um adicional fixo pela viagem interrompida.
                </p>
              </div>
            ) : (
              <div className="card">
                <div className="card-title">Custos estimados (dados oficiais ANTT)</div>
                <div className="info-row"><span className="info-label">⛽ Combustível</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
                <div className="info-row"><span className="info-label">🔧 Desgaste do veículo</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>
              </div>
            )}

            {extrato.despesasManuais?.length > 0 && (
              <div className="card">
                <div className="card-title">Despesas lançadas por você</div>
                {extrato.despesasManuais.map(d => (
                  <div key={d.id} className="info-row">
                    <span className="info-label">{d.tipo}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                    <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(d.valor)}</span>
                  </div>
                ))}
              </div>
            )}

            {!ehCompensacao && (
              <div className="card">
                <div className="info-row"><span className="info-label">Total de custos</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.totalCustos)}</span></div>
                <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Valor líquido estimado</span><span className="info-value" style={{ color: extrato.valorLiquido >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorLiquido)}</span></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
