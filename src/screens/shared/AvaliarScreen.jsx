import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

// ─────────────────────────────────────────────
// AVALIAÇÃO
// ─────────────────────────────────────────────
export function AvaliarScreen({ data, onNavigate }) {
  const { token } = useAuth();
  const frete = data?.frete;
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const enviar = async () => {
    setLoading(true);
    try { await api("POST", `/api/fretes/${frete?.id}/avaliar`, { nota, comentario }, token); setSuccess(true); setTimeout(() => onNavigate("meus-fretes"), 2000); }
    catch { setSuccess(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Avaliar</h1></div>
      <div className="content">
        {success ? <div className="alert alert-success">✅ Avaliação enviada! Obrigado.</div> : (
          <>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>⭐</div>
              <div style={{ fontWeight: 700, marginBottom: 18 }}>Como foi a experiência?</div>
              <div className="star-rating" style={{ justifyContent: "center" }}>
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
