import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// EXCLUIR CONTA
// Exigência do Google Play pra app com cadastro: o usuário precisa conseguir
// pedir a exclusão da conta de dentro do app. Aqui só se REGISTRA o pedido --
// quem processa é o admin, manualmente, em até 30 dias (ver POST
// /api/usuarios/exclusao-conta). Nada é apagado na hora, por isso a tela não
// desloga o usuário: ele pode ter frete em andamento ou repasse a receber.
// ─────────────────────────────────────────────
export function ExcluirContaScreen({ onNavigate }) {
  const { user, token } = useAuth();
  const [pedido, setPedido] = useState(null);
  const [prazoDias, setPrazoDias] = useState(30);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("GET", "/api/usuarios/exclusao-conta", null, token)
      .then(r => { setPedido(r.pedido); setPrazoDias(r.prazoDias); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function enviar() {
    setEnviando(true);
    setError("");
    try {
      const r = await api("POST", "/api/usuarios/exclusao-conta", { motivo }, token);
      setPedido(r.pedido);
      setPrazoDias(r.prazoDias);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Excluir conta</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? <Loading /> : pedido ? (
          <div className="card" style={{ textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📨</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Pedido de exclusão recebido</div>
            <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
              Enviado em {new Date(pedido.criado_em).toLocaleDateString("pt-BR")}. A equipe TRUKER vai concluir a exclusão em até {prazoDias} dias
              e avisar pelo e-mail {user?.email}. Se tiver frete em andamento ou valor a receber, a gente resolve isso antes com você.
            </p>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="card-title">O que acontece</div>
              <ul style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
                <li>Seus dados pessoais, documentos, veículos e fotos são apagados.</li>
                <li>Você não vai mais conseguir entrar com este e-mail.</li>
                <li>Contratos, fretes concluídos e registros de pagamento ficam guardados pelo prazo que a lei exige (fiscal e contábil), sem uso pra outra finalidade.</li>
                <li>Se houver frete em andamento ou valor a receber, a equipe resolve isso com você antes de excluir.</li>
                <li>A exclusão é feita em até {prazoDias} dias, e você recebe a confirmação por e-mail.</li>
              </ul>
            </div>

            <div className="card">
              <div className="field">
                <label htmlFor="motivo-exclusao">Quer contar o motivo? (opcional)</label>
                <textarea id="motivo-exclusao" rows={3} maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ajuda a gente a melhorar o TRUKER" style={{ resize: "none" }} />
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text2)", marginTop: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} style={{ marginTop: 3 }} />
                Entendi que a exclusão não pode ser desfeita.
              </label>
            </div>

            <button className="btn btn-danger" disabled={!confirmado || enviando} onClick={enviar}>
              {enviando ? "Enviando..." : "Pedir exclusão da minha conta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
