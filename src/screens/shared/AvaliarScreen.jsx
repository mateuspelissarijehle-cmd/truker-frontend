import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";

// ─────────────────────────────────────────────
// AVALIAÇÃO — compartilhada entre contratante e motorista (o endpoint POST
// /api/fretes/:id/avaliar já é bidirecional: calcula avaliado_id sozinho a
// partir de quem está chamando). Quem está sendo avaliado é sempre "a outra
// parte" do frete em relação ao usuário logado.
// ─────────────────────────────────────────────
export function AvaliarScreen({ data, onNavigate }) {
  const { token, user } = useAuth();
  const frete = data?.frete;
  const souMotorista = user?.tipo === "motorista";
  const nomeAvaliado = souMotorista ? frete?.contratante_nome : frete?.motorista_nome;
  const telaMeusFretes = souMotorista ? "meus-fretes-motorista" : "meus-fretes";

  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async () => {
    setLoading(true); setErro("");
    try {
      await api("POST", `/api/fretes/${frete?.id}/avaliar`, { nota, comentario }, token);
      setSuccess(true);
      setTimeout(() => onNavigate(telaMeusFretes), 2000);
    } catch (e) {
      setErro(e.message || "Não foi possível enviar a avaliação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(telaMeusFretes)}>←</button><h1>Avaliar {souMotorista ? "Contratante" : "Motorista"}</h1></div>
      <div className="content">
        {success ? <div className="alert alert-success">✅ Avaliação enviada! Obrigado.</div> : (
          <>
            {erro && <div className="alert alert-error">{erro}</div>}
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>⭐</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Como foi a experiência{nomeAvaliado ? ` com ${nomeAvaliado}` : ""}?</div>
              <div className="star-rating" style={{ justifyContent: "center", marginTop: 14 }}>
                {[1, 2, 3, 4, 5].map(n => <span key={n} onClick={() => setNota(n)} style={{ fontSize: 36, cursor: "pointer" }}>{n <= nota ? "⭐" : "☆"}</span>)}
              </div>
              <div style={{ marginTop: 8, color: "var(--text2)", fontSize: 13 }}>{nota}/5</div>
            </div>
            <div className="field"><label>Comentário</label><textarea placeholder="Como foi o serviço?" rows={4} value={comentario} onChange={e => setComentario(e.target.value)} style={{ resize: "none" }} /></div>
            <button className="btn btn-primary" onClick={enviar} disabled={loading}>{loading ? "Enviando..." : "Enviar Avaliação"}</button>
          </>
        )}
      </div>
    </div>
  );
}
