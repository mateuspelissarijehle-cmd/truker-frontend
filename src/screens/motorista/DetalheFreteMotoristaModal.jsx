import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { formatMoney, formatDateTime } from "../../utils/format";
import { Loading } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";

// ─────────────────────────────────────────────
// DETALHE DO FRETE (MOTORISTA) — modal aberto ao clicar num card
// de frete finalizado em "Meus Fretes". Mostra a linha do tempo
// (coleta/entrega), rota/carga, ganhos, despesas do frete (reaproveita
// GET /api/fretes/:id/extrato, mesmo endpoint da tela de Extrato) e a
// avaliação recebida da outra parte, se já existir.
// ─────────────────────────────────────────────
export function DetalheFreteMotoristaModal({ frete, token, onClose, onVerContrato, contratoLoadingId }) {
  const [extrato, setExtrato] = useState(null);
  const [avaliacao, setAvaliacao] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!frete?.id) return;
    queueMicrotask(() => setLoading(true));
    Promise.all([
      api("GET", `/api/fretes/${frete.id}/extrato`, null, token).catch(() => null),
      api("GET", `/api/fretes/${frete.id}/avaliacao-recebida`, null, token).catch(() => null),
    ]).then(([e, a]) => { setExtrato(e); setAvaliacao(a); }).finally(() => setLoading(false));
  }, [frete?.id, token]);

  if (!frete) return null;

  const comissaoReal = frete.comissao_retida_em != null;
  const valorBruto = frete.valor_final || frete.valor_antt || 0;
  const valorLiquidoRecebido = comissaoReal ? frete.valor_liquido_motorista_retido : frete.valor_motorista;

  return (
    <div className="detalhe-modal-backdrop" onClick={onClose}>
      <div className="detalhe-modal" onClick={e => e.stopPropagation()}>
        <div className="detalhe-modal-header">
          <div className="detalhe-modal-title">Detalhe do Frete</div>
          <button className="detalhe-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <StatusBadge status={frete.status} />
          <div className="price">{formatMoney(valorLiquidoRecebido)}</div>
        </div>

        <div className="card">
          <div className="card-title">Linha do tempo</div>
          <div className="info-row"><span className="info-label">Aceito em</span><span className="info-value">{formatDateTime(frete.aceito_em)}</span></div>
          <div className="info-row"><span className="info-label">Coleta</span><span className="info-value">{formatDateTime(frete.coletado_em)}</span></div>
          <div className="info-row"><span className="info-label">Entrega</span><span className="info-value">{formatDateTime(frete.entregue_em)}</span></div>
        </div>

        <div className="card">
          <div className="card-title">Rota e carga</div>
          <div className="info-row"><span className="info-label">Origem</span><span className="info-value">{frete.origem_cidade || frete.origem_endereco || "—"}</span></div>
          <div className="info-row"><span className="info-label">Destino</span><span className="info-value">{frete.dest_cidade || frete.dest_endereco || "—"}</span></div>
          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Tipo de carga</span><span className="info-value">{frete.tipo_carga}</span></div>
          {frete.peso_tons != null && <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>}
          <div className="info-row"><span className="info-label">Veículo</span><span className="info-value">{frete.tipo_veiculo}</span></div>
          {frete.carroceria && <div className="info-row"><span className="info-label">Carroceria</span><span className="info-value">{frete.carroceria}</span></div>}
          {frete.numero_eixos != null && <div className="info-row"><span className="info-label">Eixos</span><span className="info-value">{frete.numero_eixos}</span></div>}
        </div>

        <div className="card">
          <div className="card-title">Ganhos</div>
          <div className="info-row"><span className="info-label">Valor do frete</span><span className="info-value">{formatMoney(valorBruto)}</span></div>
          <div className="info-row">
            <span className="info-label">Comissão TRUKER{comissaoReal ? ` (${frete.comissao_percentual_aplicado}%)` : " (estimada)"}</span>
            <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(comissaoReal ? frete.valor_comissao_retida : frete.comissao_truker)}</span>
          </div>
          <div className="divider" />
          <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Valor recebido</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800, fontSize: 16 }}>{formatMoney(valorLiquidoRecebido)}</span></div>
        </div>

        {loading ? <Loading /> : extrato && (
          <div className="card">
            <div className="card-title">Despesas do frete</div>
            <div className="info-row"><span className="info-label">⛽ Combustível</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos?.combustivel)}</span></div>
            <div className="info-row"><span className="info-label">🔧 Desgaste do veículo</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos?.desgaste)}</span></div>
            {extrato.despesasManuais?.map(d => (
              <div key={d.id} className="info-row">
                <span className="info-label">{d.tipo}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(d.valor)}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="info-row"><span className="info-label">Total de despesas</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.totalCustos)}</span></div>
            <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Líquido após despesas</span><span className="info-value" style={{ color: extrato.valorLiquido >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorLiquido)}</span></div>
          </div>
        )}

        <div className="card">
          <div className="card-title">Avaliação recebida</div>
          {avaliacao ? (
            <>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{"⭐".repeat(avaliacao.nota)}{"☆".repeat(5 - avaliacao.nota)}</div>
              {avaliacao.comentario && <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>{avaliacao.comentario}</div>}
              {avaliacao.tags?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {avaliacao.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text3)" }}>Nenhuma avaliação recebida ainda.</div>
          )}
        </div>

        <button className="btn btn-secondary" onClick={() => onVerContrato(frete.id)} disabled={contratoLoadingId === frete.id}>
          {contratoLoadingId === frete.id ? "Baixando contrato..." : "📄 Baixar Contrato"}
        </button>
      </div>
    </div>
  );
}
