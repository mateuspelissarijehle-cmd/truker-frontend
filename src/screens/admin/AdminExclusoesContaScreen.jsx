import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";

const PRAZO_DIAS = 30;
const STATUS_LABELS = { pendente: "⏳ Pendente", concluida: "✅ Concluída", recusada: "✖️ Recusada" };

// ─────────────────────────────────────────────
// ADMIN — EXCLUSÕES DE CONTA
// Pedidos de exclusão feitos pelo app ou pela página getruker.com/excluir-conta.html
// (exigência do Google Play). Esta tela só mostra o pedido e marca como
// atendido -- a exclusão/desativação em si continua em "Gerenciar Usuários",
// de propósito, pra nunca apagar dado com um clique por engano aqui.
// ─────────────────────────────────────────────
export function AdminExclusoesContaScreen({ onNavigate }) {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salvando, setSalvando] = useState(null);
  // Momento da última carga -- base da contagem do prazo (Date.now() direto
  // no render é impuro pro React).
  const [agora, setAgora] = useState(0);

  const carregar = useCallback(() => {
    api("GET", "/api/admin/exclusoes-conta", null, token)
      .then(r => { setPedidos(r); setAgora(Date.now()); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  async function marcar(pedido, status) {
    const observacao = window.prompt(
      status === "concluida" ? "Observação (opcional) — ex: excluído / desativado e anonimizado:" : "Motivo da recusa (ex: e-mail não confirmou que é o dono):"
    );
    if (observacao === null) return;
    setSalvando(pedido.id);
    try {
      await api("PATCH", `/api/admin/exclusoes-conta/${pedido.id}`, { status, observacao }, token);
      carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(null);
    }
  }

  const diasRestantes = p => PRAZO_DIAS - Math.floor((agora - new Date(p.criado_em).getTime()) / 86400000);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Exclusões de Conta</h1></div>
      <div className="content">
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
          Prazo de {PRAZO_DIAS} dias a partir do pedido. Pra excluir ou desativar a conta, use "Gerenciar Usuários" e depois marque o pedido como concluído aqui.
          Pedido feito pelo site (sem login): confirme antes pelo e-mail cadastrado da conta.
        </p>
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? <Loading /> : pedidos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            Nenhum pedido de exclusão
          </div>
        ) : pedidos.map(p => {
          const restantes = diasRestantes(p);
          return (
            <div key={p.id} className="card" style={{ borderLeft: p.status === "pendente" ? `4px solid ${restantes <= 7 ? "var(--red)" : "var(--gold)"}` : undefined, opacity: p.status === "pendente" ? 1 : 0.7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span className="badge">{STATUS_LABELS[p.status] || p.status}</span>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(p.criado_em).toLocaleString("pt-BR")}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nome || "—"}</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>{p.email}</div>

              <div className="info-row"><span className="info-label">Origem</span><span className="info-value">{p.origem === "app" ? "App (logado)" : "Site (sem login)"}</span></div>
              <div className="info-row"><span className="info-label">Conta</span><span className="info-value">{p.usuario_id ? `${p.tipo || "—"}${p.ativo === false ? " (desativada)" : ""}` : "Nenhuma conta com esse e-mail"}</span></div>
              {p.usuario_id && <>
                <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{p.telefone || "—"}</span></div>
                <div className="info-row"><span className="info-label">Fretes (total / em aberto)</span><span className="info-value">{p.fretes_total} / <strong style={{ color: p.fretes_em_aberto ? "var(--red)" : undefined }}>{p.fretes_em_aberto}</strong></span></div>
                <div className="info-row"><span className="info-label">Repasses pendentes</span><span className="info-value"><strong style={{ color: p.repasses_pendentes ? "var(--red)" : undefined }}>{p.repasses_pendentes}</strong></span></div>
              </>}
              {p.motivo && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Motivo: {p.motivo}</div>}
              {p.observacao_admin && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Obs. admin: {p.observacao_admin}</div>}

              {p.status === "pendente" ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: restantes <= 7 ? "var(--red)" : "var(--text3)", marginTop: 10 }}>
                    {restantes >= 0 ? `Faltam ${restantes} dia(s) do prazo` : `Prazo vencido há ${-restantes} dia(s)`}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="btn btn-primary btn-sm" disabled={salvando === p.id} onClick={() => marcar(p, "concluida")}>Marcar concluída</button>
                    <button className="btn btn-secondary btn-sm" disabled={salvando === p.id} onClick={() => marcar(p, "recusada")}>Recusar</button>
                  </div>
                </>
              ) : p.processado_em && (
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>Processado em {new Date(p.processado_em).toLocaleString("pt-BR")}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
