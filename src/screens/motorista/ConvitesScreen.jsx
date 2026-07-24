import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { TIPOS_CARGA } from "../../data/catalogos";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// CONVITES (Motorista — proposta inversa)
// ─────────────────────────────────────────────
export function ConvitesScreen({ onNavigate }) {
  const { token } = useAuth();
  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes/convidados", null, token)
      .then(setConvites).catch(() => setConvites([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Convites</h1></div>
      <div className="content">
        {loading ? <Loading /> : convites.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
            <p style={{ fontWeight: 600 }}>Nenhum convite no momento</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Publique sua disponibilidade pra contratantes te encontrarem</p>
          </div>
        ) : convites.map(f => {
          const cargaObj = TIPOS_CARGA.find(c => c.id === f.tipo_carga);
          const expiraTexto = f.negociando_expira_em
            ? `expira ${new Date(f.negociando_expira_em).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : "";
          return (
            <div key={f.id} className="uber-card" onClick={() => onNavigate("aceitar-frete", f)} style={{ borderColor: "var(--gold)" }}>
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag-chip">🎯 Convite de {f.contratante_nome}</span>
                    <span className="tag-chip">{cargaObj?.icon || "📦"} {cargaObj?.label || f.tipo_carga}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>📏 {f.distancia_km} km · ⚖️ {f.peso_tons}t</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>motorista</div>
                </div>
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "var(--text2)" }}>⏳ {expiraTexto}</span>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onNavigate("aceitar-frete", f); }}>Ver e decidir</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
