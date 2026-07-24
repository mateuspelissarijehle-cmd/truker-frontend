import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// AVALIAÇÕES — lista de avaliações recebidas/dadas
// ─────────────────────────────────────────────
export function AvaliacoesScreen({ onNavigate }) {
  const { user, token } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState(0);
  const isMot = user?.tipo === "motorista";

  useEffect(() => {
    const rota = isMot ? "/api/motoristas/avaliacoes" : "/api/contratantes/historico";
    api("GET", rota, null, token)
      .then(d => {
        if (isMot) {
          setAvaliacoes(Array.isArray(d) ? d : []);
          if (d?.length) setMedia((d.reduce((a, x) => a + Number(x.nota), 0) / d.length).toFixed(1));
        } else {
          // contratante: filtra fretes entregues que tem info de avaliação
          const entregues = (Array.isArray(d) ? d : []).filter(f => f.status === "entregue");
          setAvaliacoes(entregues);
        }
      })
      .catch(() => setAvaliacoes([]))
      .finally(() => setLoading(false));
  }, []);

  const Estrelas = ({ nota }) => (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: 16, color: n <= nota ? "#C9A84C" : "var(--border)" }}>★</span>
      ))}
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>Avaliações</h1>
      </div>
      <div className="content">
        {isMot && avaliacoes.length > 0 && (
          <div className="card" style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: "var(--gold)" }}>{media}</div>
            <Estrelas nota={Math.round(media)} />
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>{avaliacoes.length} avaliação{avaliacoes.length !== 1 ? "ões" : ""} recebida{avaliacoes.length !== 1 ? "s" : ""}</div>
          </div>
        )}
        {loading ? <Loading /> : avaliacoes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>
              {isMot ? "Nenhuma avaliação recebida" : "Nenhum frete concluído"}
            </p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              {isMot ? "As avaliações dos contratantes aparecerão aqui após cada entrega." : "Complete fretes para ver o histórico aqui."}
            </p>
          </div>
        ) : isMot ? (
          avaliacoes.map((a, i) => (
            <div key={a.id || i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.avaliador_nome || "Contratante"}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                    {a.criado_em ? new Date(a.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </div>
                </div>
                <Estrelas nota={Number(a.nota)} />
              </div>
              {a.comentario && (
                <div style={{ fontSize: 13, color: "var(--text2)", fontStyle: "italic", borderLeft: "3px solid var(--gold)", paddingLeft: 10, marginTop: 8 }}>
                  "{a.comentario}"
                </div>
              )}
            </div>
          ))
        ) : (
          avaliacoes.map((f, i) => (
            <div key={f.id || i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.motorista_nome || "Motorista"}</div>
                <span className="badge badge-done">Entregue</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                {f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
