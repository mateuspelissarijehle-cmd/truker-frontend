import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";
import { API_BASE } from "../../config";

const MOTIVO_LABELS = { acidente: "🚗 Acidente", roubo: "🚨 Roubo/furto", outro: "❓ Outro" };

// ─────────────────────────────────────────────
// ADMIN — FRETES COM PROBLEMA NA ENTREGA
// (acidente/roubo/carga não entregue, reportado pelo motorista)
// Só informação pra decisão manual do Mateus -- nenhum reembolso/acionamento
// de seguro acontece por aqui, é tudo feito por fora (painel Asaas/seguradora).
// ─────────────────────────────────────────────
export function AdminFretesProblemaScreen({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api("GET", "/api/admin/fretes-problema", null, token)
      .then(setFretes)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Fretes com Problema</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? <Loading /> : fretes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            Nenhum problema reportado no momento
          </div>
        ) : fretes.map(f => {
          const temSeguro = !!(f.seguro_seguradora_id || (f.seguro_avulso_nome && f.seguro_avulso_apolice));
          const seguroVencido = f.seguro_validade && new Date(f.seguro_validade) < new Date();
          return (
            <div key={f.id} className="card" style={{ borderLeft: "4px solid var(--red)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span className="badge badge-cancel">{MOTIVO_LABELS[f.problema_motivo] || f.problema_motivo}</span>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(f.problema_reportado_em).toLocaleString("pt-BR")}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.origem_cidade} → {f.dest_cidade}</div>
              {f.problema_descricao && (
                <div style={{ fontSize: 13, color: "var(--text2)", background: "var(--surface2)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                  {f.problema_descricao}
                </div>
              )}
              {f.problema_foto_url && (
                <a href={`${API_BASE}${f.problema_foto_url}`} target="_blank" rel="noreferrer">
                  <img src={`${API_BASE}${f.problema_foto_url}`} alt="Foto do problema" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />
                </a>
              )}

              <div className="divider" />
              <div className="info-row"><span className="info-label">Valor pago pelo contratante</span><span className="info-value">{formatMoney(f.valor_final)}</span></div>
              <div className="info-row"><span className="info-label">Status pagamento</span><span className="info-value">{f.status_pagamento || "—"}</span></div>

              <div className="divider" />
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contratante</div>
              <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{f.contratante_nome || "—"}</span></div>
              <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{f.contratante_telefone || "—"}</span></div>
              <div className="info-row"><span className="info-label">E-mail</span><span className="info-value">{f.contratante_email || "—"}</span></div>

              <div className="divider" />
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Motorista</div>
              <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{f.motorista_nome || "—"}</span></div>
              <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{f.motorista_telefone || "—"}</span></div>
              <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{f.placa_veiculo || "—"}</span></div>

              <div className="divider" />
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Seguro do motorista</div>
              {!temSeguro && <div style={{ fontSize: 13, color: "var(--red)" }}>⚠️ Sem seguro cadastrado</div>}
              {temSeguro && (
                <>
                  <div className="info-row">
                    <span className="info-label">{f.seguro_seguradora_id ? "Seguradora parceira" : "Seguro avulso"}</span>
                    <span className="info-value">{f.seguro_seguradora_id ? (f.seguradora_nome || "—") : f.seguro_avulso_nome}</span>
                  </div>
                  {!f.seguro_seguradora_id && <div className="info-row"><span className="info-label">Apólice</span><span className="info-value">{f.seguro_avulso_apolice}</span></div>}
                  {f.seguradora_url_contato && <div className="info-row"><span className="info-label">Contato</span><span className="info-value">{f.seguradora_url_contato}</span></div>}
                  <div className="info-row">
                    <span className="info-label">Validade</span>
                    <span className="info-value" style={{ color: seguroVencido ? "var(--red)" : "var(--green)" }}>
                      {f.seguro_validade ? new Date(f.seguro_validade).toLocaleDateString("pt-BR") : "—"}{seguroVencido ? " (vencido)" : ""}
                    </span>
                  </div>
                </>
              )}

              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
                Reembolso e acionamento de seguro são feitos manualmente por fora (painel Asaas / seguradora).
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
