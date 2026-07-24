import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { CampoCidadeAutocomplete } from "../../components/CampoCidadeAutocomplete";

// ─────────────────────────────────────────────
// BUSCAR MOTORISTAS (Contratante — proposta inversa)
// ─────────────────────────────────────────────
export function BuscarMotoristasScreen({ onNavigate }) {
  const { token } = useAuth();
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    if (!cidade.trim() || !uf.trim()) return setError("Informe cidade e UF");
    setError(""); setLoading(true);
    try {
      const data = await api("GET", `/api/motoristas/disponiveis-por-rota?cidade=${encodeURIComponent(cidade.trim())}&uf=${encodeURIComponent(uf.trim())}`, null, token);
      setResultados(data);
    } catch (e) { setError(e.message); setResultados([]); }
    finally { setLoading(false); }
  };

  const formatDisponibilidade = (disponivelEm) => {
    if (!disponivelEm) return "Disponível agora";
    const d = new Date(disponivelEm);
    if (d.getTime() <= Date.now()) return "Disponível agora";
    return `Disponível a partir de ${d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  };

  const convidar = (m) => {
    onNavigate("solicitar-frete", {
      motoristaConvidadoId: m.motorista_id,
      motoristaConvidadoNome: m.motorista_nome,
      origemCidadeSugerida: m.cidade_atual,
      origemUfSugerida: m.uf_atual,
    });
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("home-contratante")}>←</button><h1>Buscar Motoristas</h1></div>
      <div className="content">
        <div className="card">
          <div className="card-title">📍 Onde o motorista está?</div>
          <div className="grid-2">
            <CampoCidadeAutocomplete
              label="Cidade" value={cidade}
              onChange={setCidade}
              onSelecionar={({ cidade: c, uf: u }) => { setCidade(c); if (u) setUf(u); }}
              placeholder="Curitiba"
            />
            <div className="field"><label>UF</label><input value={uf} onChange={e => setUf(e.target.value.toUpperCase())} maxLength={2} placeholder="PR" /></div>
          </div>
          <button className="btn btn-primary" onClick={buscar} disabled={loading} style={{ marginTop: 4 }}>{loading ? "Buscando..." : "🔍 Buscar"}</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        {resultados !== null && (
          resultados.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚛</div>
              Nenhum motorista disponível nessa cidade no momento
            </div>
          ) : resultados.map(m => (
            <div key={m.motorista_id} className="uber-card">
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{m.motorista_nome}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>🚛 {m.tipo_veiculo}{m.placa_veiculo ? ` · ${m.placa_veiculo}` : ""}</div>
                  {Number(m.avaliacao_media) > 0 && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>⭐ {Number(m.avaliacao_media).toFixed(1)}</div>}
                </div>
              </div>
              <div style={{ padding: "0 16px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="tag-chip">🕐 {formatDisponibilidade(m.disponivel_em)}</span>
                {m.cidade_destino && <span className="tag-chip">🎯 Quer ir até {m.cidade_destino}/{m.uf_destino}</span>}
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "var(--text3)" }}>{m.cidade_atual}/{m.uf_atual}</span>
                <button className="btn btn-primary btn-sm" onClick={() => convidar(m)}>Convidar pra este frete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
